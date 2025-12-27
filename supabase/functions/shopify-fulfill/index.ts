import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { orderNumber, shopifyOrderId } = await req.json();
    
    if (!orderNumber && !shopifyOrderId) {
      throw new Error('Either orderNumber or shopifyOrderId is required');
    }

    console.log(`Fulfilling order: ${orderNumber || shopifyOrderId}`);

    // Get Shopify Admin API token
    const shopifyAccessToken = Deno.env.get('SHOPIFY_ACCESS_TOKEN');
    if (!shopifyAccessToken) {
      throw new Error('SHOPIFY_ACCESS_TOKEN not configured');
    }

    // First, find the order in Shopify if we only have order number
    let orderId = shopifyOrderId;
    
    if (!orderId && orderNumber) {
      // Search for order by name
      const searchUrl = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/orders.json?name=${encodeURIComponent(orderNumber)}&status=any`;
      
      const searchResponse = await fetch(searchUrl, {
        headers: {
          'X-Shopify-Access-Token': shopifyAccessToken,
          'Content-Type': 'application/json',
        },
      });

      if (!searchResponse.ok) {
        const errorText = await searchResponse.text();
        console.error('Shopify search error:', errorText);
        throw new Error(`Could not find order in Shopify: ${searchResponse.status}`);
      }

      const searchData = await searchResponse.json();
      const orders = searchData.orders || [];
      
      if (orders.length === 0) {
        console.log(`Order ${orderNumber} not found in Shopify - may be a manual order`);
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Order not found in Shopify - may be a manual order',
            skipped: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      orderId = orders[0].id;
    }

    // Get order details to find fulfillment locations
    const orderUrl = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/orders/${orderId}.json`;
    
    const orderResponse = await fetch(orderUrl, {
      headers: {
        'X-Shopify-Access-Token': shopifyAccessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!orderResponse.ok) {
      throw new Error(`Could not fetch order details: ${orderResponse.status}`);
    }

    const orderData = await orderResponse.json();
    const order = orderData.order;

    // Check if already fulfilled
    if (order.fulfillment_status === 'fulfilled') {
      console.log(`Order ${orderNumber} is already fulfilled`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Order is already fulfilled',
          alreadyFulfilled: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get fulfillment orders
    const fulfillmentOrdersUrl = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/orders/${orderId}/fulfillment_orders.json`;
    
    const fulfillmentOrdersResponse = await fetch(fulfillmentOrdersUrl, {
      headers: {
        'X-Shopify-Access-Token': shopifyAccessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!fulfillmentOrdersResponse.ok) {
      throw new Error(`Could not fetch fulfillment orders: ${fulfillmentOrdersResponse.status}`);
    }

    const fulfillmentOrdersData = await fulfillmentOrdersResponse.json();
    const fulfillmentOrders = fulfillmentOrdersData.fulfillment_orders || [];

    // Create fulfillment for each fulfillment order
    for (const fo of fulfillmentOrders) {
      if (fo.status === 'closed' || fo.status === 'cancelled') continue;

      const lineItems = fo.line_items.map((item: any) => ({
        id: item.id,
        quantity: item.fulfillable_quantity,
      }));

      if (lineItems.every((item: any) => item.quantity === 0)) continue;

      const fulfillmentUrl = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/fulfillments.json`;
      
      const fulfillmentPayload = {
        fulfillment: {
          line_items_by_fulfillment_order: [
            {
              fulfillment_order_id: fo.id,
              fulfillment_order_line_items: lineItems.filter((item: any) => item.quantity > 0),
            }
          ],
          notify_customer: false, // Don't send email, they're picking up in person
        }
      };

      const fulfillmentResponse = await fetch(fulfillmentUrl, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': shopifyAccessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fulfillmentPayload),
      });

      if (!fulfillmentResponse.ok) {
        const errorText = await fulfillmentResponse.text();
        console.error('Fulfillment error:', errorText);
        // Continue with other fulfillment orders even if one fails
      } else {
        console.log(`Fulfilled order ${orderId} fulfillment order ${fo.id}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Order ${orderNumber || orderId} fulfilled in Shopify`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Shopify fulfill error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during fulfillment';
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
