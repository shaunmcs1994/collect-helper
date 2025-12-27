import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SHOPIFY_STORE_DOMAIN = 'buzzycakes.myshopify.com';
const SHOPIFY_API_VERSION = '2025-01';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting Shopify sync...');
    
    // Get Shopify Admin API token from secrets
    const shopifyAccessToken = Deno.env.get('SHOPIFY_ACCESS_TOKEN');
    if (!shopifyAccessToken) {
      throw new Error('SHOPIFY_ACCESS_TOKEN not configured');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get today's date for filtering
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    console.log(`Looking for orders tagged with collection date: ${today}`);

    // Fetch orders from Shopify
    // Looking for orders with tag format: "collection-YYYY-MM-DD"
    const shopifyUrl = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/orders.json?status=any&limit=250`;
    
    const shopifyResponse = await fetch(shopifyUrl, {
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
    const allOrders = shopifyData.orders || [];
    console.log(`Fetched ${allOrders.length} orders from Shopify`);

    // Filter orders by collection date tag
    // Tags can be: "collection-2025-01-15" or just check note_attributes
    const relevantOrders = allOrders.filter((order: any) => {
      // Check tags for collection date
      const tags = (order.tags || '').toLowerCase().split(',').map((t: string) => t.trim());
      const hasCollectionTag = tags.some((tag: string) => 
        tag.startsWith('collection-') || tag.includes('collection')
      );
      
      // Also check if already fulfilled
      const isUnfulfilled = order.fulfillment_status === null || order.fulfillment_status === 'unfulfilled';
      
      return hasCollectionTag;
    });

    console.log(`Found ${relevantOrders.length} orders with collection tags`);

    // Upsert orders into database
    let syncedCount = 0;
    let skippedCount = 0;

    for (const shopifyOrder of relevantOrders) {
      try {
        // Extract collection date from tags
        const tags = (shopifyOrder.tags || '').split(',').map((t: string) => t.trim());
        const collectionTag = tags.find((tag: string) => tag.toLowerCase().startsWith('collection-'));
        
        let collectionDate = today; // Default to today
        if (collectionTag) {
          // Extract date from tag like "collection-2025-01-15"
          const datePart = collectionTag.replace(/collection-/i, '');
          if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
            collectionDate = datePart;
          }
        }

        // Extract location from tags or default
        const locationTag = tags.find((tag: string) => 
          tag.toLowerCase() === 'wilmslow' || 
          tag.toLowerCase() === 'manchester'
        );
        const collectionLocation = locationTag || 'Wilmslow';

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
            skippedCount++;
            continue;
          }
          // Update existing order
          await supabase
            .from('orders')
            .update({
              customer_name: shopifyOrder.customer?.first_name 
                ? `${shopifyOrder.customer.first_name} ${shopifyOrder.customer.last_name || ''}`.trim()
                : shopifyOrder.shipping_address?.name || 'Customer',
              collection_date: collectionDate,
              collection_location: collectionLocation,
              products: products,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingOrder.id);
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
              products: products,
              status: status,
              pickup_time: null,
            });
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
