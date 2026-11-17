import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SHOPIFY_STORE_DOMAIN = 'buzzycakes.myshopify.com';
const SHOPIFY_API_VERSION = '2025-01';

// Types for skipped orders tracking
interface SkippedOrder {
  orderNumber: string;
  reason: 'missing_date_tag' | 'already_collected' | 'sync_error' | 'partial_fulfillment';
  tags: string;
  customerName: string;
  fulfillmentStatus?: string;
}

// Parse location from Zapiet tags
function getLocationFromTags(tags: string[]): string {
  const upperTags = tags.map(t => t.toUpperCase().trim());
  if (upperTags.includes('WILM')) return 'Wilmslow';
  if (upperTags.includes('NQ')) return 'Manchester';
  return 'Unknown';
}

// Extract pickup time from tags (HH:MM format)
function getPickupTimeFromTags(tags: string[]): string | null {
  const timeTag = tags.find(tag => /^\d{1,2}:\d{2}$/.test(tag.trim()));
  return timeTag?.trim() || null;
}

// Extract collection date from tags (DD/MM/YYYY format) and convert to ISO
function getCollectionDateFromTags(tags: string[]): string | null {
  // Look for DD/MM/YYYY pattern
  const dateTag = tags.find(tag => /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(tag.trim()));
  if (!dateTag) return null;
  
  const parts = dateTag.trim().split('/');
  const day = parts[0].padStart(2, '0');
  const month = parts[1].padStart(2, '0');
  const year = parts[2];
  
  // Return ISO format YYYY-MM-DD for database storage
  return `${year}-${month}-${day}`;
}

// Convert ISO date to UK format for tag matching
function isoToUkFormat(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${parseInt(day)}/${parseInt(month)}/${year}`;
}

// Get customer name from order
function getCustomerName(order: any): string {
  if (order.customer?.first_name) {
    return `${order.customer.first_name} ${order.customer.last_name || ''}`.trim();
  }
  return order.shipping_address?.name || 'Unknown Customer';
}

// Fetch product image from Shopify
async function fetchProductImage(productId: number, shopifyAccessToken: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/products/${productId}.json?fields=image`,
      {
        headers: {
          'X-Shopify-Access-Token': shopifyAccessToken,
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      console.log(`Failed to fetch image for product ${productId}: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    return data.product?.image?.src || null;
  } catch (error) {
    console.log(`Error fetching image for product ${productId}:`, error);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting Shopify sync with Zapiet tag format...');
    
    // Get Shopify Admin API token (custom app token with read_orders scope)
    const shopifyAccessToken = Deno.env.get('SHOPIFY_ADMIN_TOKEN');
    if (!shopifyAccessToken) {
      throw new Error('SHOPIFY_ADMIN_TOKEN not configured');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get today's date in both formats
    const todayISO = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const todayUK = isoToUkFormat(todayISO); // D/M/YYYY
    console.log(`Looking for orders tagged with date: ${todayUK} (UK format)`);

    // Track skipped orders for warnings
    const skippedOrders: SkippedOrder[] = [];

    // Fetch ALL non-fulfilled orders from Shopify using cursor-based pagination
    // Using fulfillment_status=any to catch both unfulfilled AND partial orders
    const allOrders: any[] = [];
    let nextPageUrl: string | null = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/orders.json?status=open&fulfillment_status=any&limit=250`;
    let pageCount = 0;
    let fulfilledCount = 0;
    
    while (nextPageUrl) {
      pageCount++;
      console.log(`Fetching orders page ${pageCount}...`);
      const currentUrl = nextPageUrl;
      nextPageUrl = null;
      
      const shopifyResponse: Response = await fetch(currentUrl, {
        headers: {
          'X-Shopify-Access-Token': shopifyAccessToken,
          'Content-Type': 'application/json',
        },
      });

      if (!shopifyResponse.ok) {
        const errorText = await shopifyResponse.text();
        console.error('Shopify API error:', errorText);
        throw new Error(`Shopify API error: ${shopifyResponse.status}`);
      }

      const shopifyData = await shopifyResponse.json();
      const pageOrders = shopifyData.orders || [];
      
      // Filter out already fulfilled orders but count them
      for (const order of pageOrders) {
        if (order.fulfillment_status === 'fulfilled') {
          fulfilledCount++;
          console.log(`Skipping fulfilled order ${order.name}`);
        } else {
          allOrders.push(order);
        }
      }
      console.log(`Page ${pageCount}: fetched ${pageOrders.length} orders, ${allOrders.length} unfulfilled/partial so far`);

      // Check for next page in Link header (Shopify uses rel="next" for cursor pagination)
      const linkHeader: string | null = shopifyResponse.headers.get('Link');
      console.log(`Link header: ${linkHeader || 'none'}`);
      
      if (linkHeader) {
        // Match rel="next" - can appear as <url>; rel="next" or <url>; rel=next
        const nextMatch: RegExpMatchArray | null = linkHeader.match(/<([^>]+)>;\s*rel=["']?next["']?/);
        if (nextMatch && nextMatch[1]) {
          nextPageUrl = nextMatch[1];
          console.log(`Next page URL found`);
        }
      }
    }
    
    console.log(`Pagination complete: ${pageCount} pages, ${allOrders.length} unfulfilled/partial orders (${fulfilledCount} already fulfilled excluded)`);

    // Log fulfillment status breakdown
    const unfulfilled = allOrders.filter(o => o.fulfillment_status === null || o.fulfillment_status === 'unfulfilled');
    const partial = allOrders.filter(o => o.fulfillment_status === 'partial');
    console.log(`Fulfillment breakdown: ${unfulfilled.length} unfulfilled, ${partial.length} partial`);

    // Process all orders - track which ones are skipped due to missing date tags
    const relevantOrders: any[] = [];
    
    for (const order of allOrders) {
      const tags = (order.tags || '').split(',').map((t: string) => t.trim());
      const collectionDate = getCollectionDateFromTags(tags);
      
      if (!collectionDate) {
        // Track this order as skipped due to missing date tag
        skippedOrders.push({
          orderNumber: order.name || String(order.order_number),
          reason: 'missing_date_tag',
          tags: order.tags || '(no tags)',
          customerName: getCustomerName(order),
          fulfillmentStatus: order.fulfillment_status || 'unfulfilled',
        });
        console.log('Skipped order ' + order.name + ': no date tag. Tags: "' + (order.tags || '(none)') + '", fulfillment: ' + (order.fulfillment_status || 'unfulfilled'));
      } else if (/-12-2[34]$/.test(collectionDate)) {
        // Christmas-only: keep 23rd / 24th December collections
        relevantOrders.push(order);
      } else {
        console.log('Skipped order ' + order.name + ': not a Christmas date (' + collectionDate + ')');
      }
    }

    console.log(`Found ${relevantOrders.length} orders with valid date tags, ${skippedOrders.length} orders without date tags`);
    console.log(`=== SYNC SUMMARY ===`);
    console.log(`Total open orders from Shopify API: ${allOrders.length + fulfilledCount}`);
    console.log(`Already fulfilled (excluded): ${fulfilledCount}`);
    console.log(`Unfulfilled/partial orders: ${allOrders.length}`);
    console.log(`With valid date tags: ${relevantOrders.length}`);
    console.log(`Missing date tags: ${skippedOrders.filter(o => o.reason === 'missing_date_tag').length}`);

    // Build a cache of product images to avoid repeated API calls
    const productImageCache = new Map<number, string | null>();
    
    // Collect all unique product IDs from all relevant orders
    const allProductIds = new Set<number>();
    for (const order of relevantOrders) {
      for (const item of order.line_items) {
        if (item.product_id) {
          allProductIds.add(item.product_id);
        }
      }
    }
    
    console.log(`Fetching images for ${allProductIds.size} unique products...`);
    
    // Fetch all product images (with rate limiting - Shopify allows 2 requests/second)
    for (const productId of allProductIds) {
      const imageUrl = await fetchProductImage(productId, shopifyAccessToken);
      productImageCache.set(productId, imageUrl);
      // Small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`Product images cached: ${productImageCache.size} products`);

    // Upsert orders into database
    let syncedCount = 0;
    let updatedCount = 0;

    for (const shopifyOrder of relevantOrders) {
      try {
        const tags = (shopifyOrder.tags || '').split(',').map((t: string) => t.trim());
        
        // Extract data from Zapiet tags
        const collectionDate = getCollectionDateFromTags(tags);
        if (!collectionDate) {
          continue; // Already filtered above, but double-check
        }
        
        const collectionLocation = getLocationFromTags(tags);
        const pickupTime = getPickupTimeFromTags(tags);
        const customerName = getCustomerName(shopifyOrder);

        console.log(`Processing order ${shopifyOrder.name}: date=${collectionDate}, location=${collectionLocation}, time=${pickupTime}`);

        // Map line items to products with Infinite Options properties and images
        const products = shopifyOrder.line_items.map((item: any) => ({
          name: item.title || item.name,
          quantity: item.quantity,
          properties: (item.properties || []).filter((p: any) => 
            p.name && p.value && !p.name.startsWith('_') // Filter out internal properties starting with _
          ).map((p: any) => ({
            name: String(p.name),
            value: String(p.value),
          })),
          sku: item.sku || null,
          variant_title: item.variant_title || null,
          image_url: item.product_id ? productImageCache.get(item.product_id) || null : null,
        }));

        // Check if order already exists
        const { data: existingOrder } = await supabase
          .from('orders')
          .select('id, status')
          .eq('order_number', shopifyOrder.name || shopifyOrder.order_number)
          .maybeSingle();

        if (existingOrder) {
          // Skip if already collected
          if (existingOrder.status === 'collected') {
            skippedOrders.push({
              orderNumber: shopifyOrder.name || String(shopifyOrder.order_number),
              reason: 'already_collected',
              tags: shopifyOrder.tags || '',
              customerName: customerName,
            });
            console.log(`Skipping order ${shopifyOrder.name}: already collected`);
            continue;
          }
          // Update existing order with latest tag data
          await supabase
            .from('orders')
            .update({
              customer_name: customerName,
              collection_date: collectionDate,
              collection_location: collectionLocation,
              pickup_time: pickupTime,
              products: products,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingOrder.id);
          
          updatedCount++;
          console.log(`Updated order ${shopifyOrder.name}`);
        } else {
          // Insert new order
          const status = shopifyOrder.fulfillment_status === 'fulfilled' ? 'collected' : 'pending';
          
          const { error: insertError } = await supabase
            .from('orders')
            .insert({
              order_number: shopifyOrder.name || String(shopifyOrder.order_number),
              customer_name: customerName,
              collection_date: collectionDate,
              collection_location: collectionLocation,
              pickup_time: pickupTime,
              products: products,
              status: status,
            });
          
          if (insertError) {
            console.error(`Error inserting order ${shopifyOrder.name}:`, insertError);
            skippedOrders.push({
              orderNumber: shopifyOrder.name || String(shopifyOrder.order_number),
              reason: 'sync_error',
              tags: shopifyOrder.tags || '',
              customerName: customerName,
            });
            continue;
          }
          
          console.log(`Inserted new order ${shopifyOrder.name}`);
        }
        
        syncedCount++;
      } catch (orderError) {
        console.error(`Error syncing order ${shopifyOrder.name}:`, orderError);
        skippedOrders.push({
          orderNumber: shopifyOrder.name || String(shopifyOrder.order_number),
          reason: 'sync_error',
          tags: shopifyOrder.tags || '',
          customerName: getCustomerName(shopifyOrder),
        });
      }
    }

    // Group skipped orders by reason for summary
    const missingDateCount = skippedOrders.filter(o => o.reason === 'missing_date_tag').length;
    const alreadyCollectedCount = skippedOrders.filter(o => o.reason === 'already_collected').length;
    const errorCount = skippedOrders.filter(o => o.reason === 'sync_error').length;

    console.log(`Sync complete: ${syncedCount} synced (${updatedCount} updated), skipped: ${missingDateCount} missing date, ${alreadyCollectedCount} already collected, ${errorCount} errors`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Synced ${syncedCount} orders from Shopify`,
        synced: syncedCount,
        updated: updatedCount,
        totalFromShopify: allOrders.length,
        totalWithDateTags: relevantOrders.length,
        skippedCount: skippedOrders.length,
        productImagesFetched: productImageCache.size,
        fulfillmentBreakdown: {
          unfulfilled: unfulfilled.length,
          partial: partial.length,
          fulfilledExcluded: fulfilledCount,
        },
        warnings: skippedOrders.length > 0 ? {
          missingDateTag: skippedOrders.filter(o => o.reason === 'missing_date_tag'),
          alreadyCollected: skippedOrders.filter(o => o.reason === 'already_collected'),
          syncError: skippedOrders.filter(o => o.reason === 'sync_error'),
        } : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Shopify sync error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during sync';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
