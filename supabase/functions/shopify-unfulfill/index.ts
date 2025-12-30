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
    // Get request body
    const { orderNumber, shopifyOrderId } = await req.json();
    
    if (!orderNumber) {
      throw new Error('Order number is required');
    }

    console.log(`Attempting to unfulfill order: ${orderNumber}`);

    // Get Shopify Admin API token
    const shopifyAccessToken = Deno.env.get('SHOPIFY_ADMIN_TOKEN');
    if (!shopifyAccessToken) {
      throw new Error('SHOPIFY_ADMIN_TOKEN not configured');
    }

    // First, we need to find the order in Shopify to get its fulfillments
    // If we have shopifyOrderId, use it directly, otherwise search by order number
    let orderId = shopifyOrderId;
    
    if (!orderId) {
      // Search for the order by name (order number)
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
        throw new Error(`Failed to search for order: ${searchResponse.status}`);
      }

      const searchData = await searchResponse.json();
      const orders = searchData.orders || [];
      
      if (orders.length === 0) {
        console.log(`Order ${orderNumber} not found in Shopify`);
        return new Response(
          JSON.stringify({ success: true, message: 'Order not found in Shopify, nothing to unfulfill' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      orderId = orders[0].id;
    }

    console.log(`Found Shopify order ID: ${orderId}`);

    // Get the order's fulfillments
    const fulfillmentsUrl = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/orders/${orderId}/fulfillments.json`;
    
    const fulfillmentsResponse = await fetch(fulfillmentsUrl, {
      headers: {
        'X-Shopify-Access-Token': shopifyAccessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!fulfillmentsResponse.ok) {
      const errorText = await fulfillmentsResponse.text();
      console.error('Fulfillments fetch error:', errorText);
      throw new Error(`Failed to get fulfillments: ${fulfillmentsResponse.status}`);
    }

    const fulfillmentsData = await fulfillmentsResponse.json();
    const fulfillments = fulfillmentsData.fulfillments || [];

    if (fulfillments.length === 0) {
      console.log('No fulfillments to cancel');
      return new Response(
        JSON.stringify({ success: true, message: 'No fulfillments to cancel' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cancel each fulfillment
    let cancelledCount = 0;
    for (const fulfillment of fulfillments) {
      // Only cancel fulfillments that haven't shipped (status: pending, open)
      // Cannot cancel delivered or in_transit fulfillments
      if (['success', 'pending', 'open'].includes(fulfillment.status)) {
        const cancelUrl = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/fulfillments/${fulfillment.id}/cancel.json`;
        
        const cancelResponse = await fetch(cancelUrl, {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': shopifyAccessToken,
            'Content-Type': 'application/json',
          },
        });

        if (cancelResponse.ok) {
          cancelledCount++;
          console.log(`Cancelled fulfillment ${fulfillment.id}`);
        } else {
          const errorText = await cancelResponse.text();
          console.warn(`Failed to cancel fulfillment ${fulfillment.id}: ${errorText}`);
          // Continue with other fulfillments even if one fails
        }
      } else {
        console.log(`Skipping fulfillment ${fulfillment.id} with status ${fulfillment.status}`);
      }
    }

    console.log(`Unfulfill complete: cancelled ${cancelledCount} of ${fulfillments.length} fulfillments`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Cancelled ${cancelledCount} fulfillment(s)`,
        cancelledCount,
        totalFulfillments: fulfillments.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Shopify unfulfill error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during unfulfill';
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
