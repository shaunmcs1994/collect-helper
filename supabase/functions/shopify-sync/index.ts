import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SHOPIFY_STORE_DOMAIN = 'buzzycakes.myshopify.com';
const SHOPIFY_API_VERSION = '2025-01';

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

    // Fetch ALL orders from Shopify using pagination
    const allOrders: any[] = [];
    let nextPageUrl: string | null = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/orders.json?status=any&limit=250`;
    
    while (nextPageUrl) {
      console.log(`Fetching orders page...`);
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
      allOrders.push(...pageOrders);
      console.log(`Fetched ${pageOrders.length} orders (total: ${allOrders.length})`);

      // Check for next page in Link header
      const linkHeader: string | null = shopifyResponse.headers.get('Link');
      
      if (linkHeader) {
        const nextMatch: RegExpMatchArray | null = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
        if (nextMatch && nextMatch[1]) {
          nextPageUrl = nextMatch[1];
        }
      }
    }
    
    console.log(`Total orders fetched from Shopify: ${allOrders.length}`);

    // Filter orders that have a valid date tag (DD/MM/YYYY format)
    const relevantOrders = allOrders.filter((order: any) => {
      const tags = (order.tags || '').split(',').map((t: string) => t.trim());
      const collectionDate = getCollectionDateFromTags(tags);
      return collectionDate !== null;
    });

    console.log(`Found ${relevantOrders.length} orders with valid date tags`);

    // Upsert orders into database
    let syncedCount = 0;
    let skippedCount = 0;

    for (const shopifyOrder of relevantOrders) {
      try {
        const tags = (shopifyOrder.tags || '').split(',').map((t: string) => t.trim());
        
        // Extract data from Zapiet tags
        const collectionDate = getCollectionDateFromTags(tags);
        if (!collectionDate) {
          console.log(`Skipping order ${shopifyOrder.name}: no valid date tag`);
          skippedCount++;
          continue;
        }
        
        const collectionLocation = getLocationFromTags(tags);
        const pickupTime = getPickupTimeFromTags(tags);

        console.log(`Processing order ${shopifyOrder.name}: date=${collectionDate}, location=${collectionLocation}, time=${pickupTime}`);

        // Map line items to products
        const products = shopifyOrder.line_items.map((item: any) => ({
          name: item.title || item.name,
          quantity: item.quantity,
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
            console.log(`Skipping order ${shopifyOrder.name}: already collected`);
            skippedCount++;
            continue;
          }
          // Update existing order with latest tag data
          await supabase
            .from('orders')
            .update({
              customer_name: shopifyOrder.customer?.first_name 
                ? `${shopifyOrder.customer.first_name} ${shopifyOrder.customer.last_name || ''}`.trim()
                : shopifyOrder.shipping_address?.name || 'Customer',
              collection_date: collectionDate,
              collection_location: collectionLocation,
              pickup_time: pickupTime,
              products: products,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingOrder.id);
          
          console.log(`Updated order ${shopifyOrder.name}`);
        } else {
          // Insert new order
          const status = shopifyOrder.fulfillment_status === 'fulfilled' ? 'collected' : 'pending';
          
          await supabase
            .from('orders')
            .insert({
              order_number: shopifyOrder.name || String(shopifyOrder.order_number),
              customer_name: shopifyOrder.customer?.first_name 
                ? `${shopifyOrder.customer.first_name} ${shopifyOrder.customer.last_name || ''}`.trim()
                : shopifyOrder.shipping_address?.name || 'Customer',
              collection_date: collectionDate,
              collection_location: collectionLocation,
              pickup_time: pickupTime,
              products: products,
              status: status,
            });
          
          console.log(`Inserted new order ${shopifyOrder.name}`);
        }
        
        syncedCount++;
      } catch (orderError) {
        console.error(`Error syncing order ${shopifyOrder.name}:`, orderError);
      }
    }

    console.log(`Sync complete: ${syncedCount} synced, ${skippedCount} skipped`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Synced ${syncedCount} orders from Shopify`,
        synced: syncedCount,
        skipped: skippedCount,
        total: relevantOrders.length,
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
