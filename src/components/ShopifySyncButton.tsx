import { Button } from '@/components/ui/button';
import { useOrders } from '@/context/OrderContext';
import { RefreshCw, AlertTriangle, X } from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

export function ShopifySyncButton() {
  const { syncWithShopify, isSyncing, lastSyncTime, syncWarnings, clearSyncWarnings } = useOrders();
  const [showWarnings, setShowWarnings] = useState(false);

  const missingDateOrders = syncWarnings?.missingDateTag || [];
  const errorOrders = syncWarnings?.syncError || [];
  const hasWarnings = missingDateOrders.length > 0 || errorOrders.length > 0;

  return (
    <div className="flex items-center gap-3">
      <Button
        onClick={syncWithShopify}
        disabled={isSyncing}
        variant="outline"
        size="lg"
        className="gap-2"
      >
        <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
        {isSyncing ? 'Syncing...' : 'Sync with Shopify'}
      </Button>
      
      {hasWarnings && (
        <Button
          onClick={() => setShowWarnings(true)}
          variant="destructive"
          size="sm"
          className="gap-2"
        >
          <AlertTriangle className="w-4 h-4" />
          {missingDateOrders.length + errorOrders.length} orders need attention
        </Button>
      )}
      
      {lastSyncTime && !hasWarnings && (
        <span className="text-sm text-muted-foreground">
          Last sync: {format(new Date(lastSyncTime), 'HH:mm')}
        </span>
      )}

      <Dialog open={showWarnings} onOpenChange={setShowWarnings}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Orders Requiring Attention
            </DialogTitle>
            <DialogDescription>
              These orders were skipped during sync and need to be fixed in Shopify.
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh]">
            {missingDateOrders.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold mb-2 text-foreground">
                  Missing Date Tag ({missingDateOrders.length} orders)
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  These orders don't have a DD/MM/YYYY date tag. Add a collection date tag in Shopify.
                </p>
                <div className="space-y-2">
                  {missingDateOrders.map((order, idx) => (
                    <div key={idx} className="bg-muted p-3 rounded-md">
                      <div className="font-mono font-semibold">{order.orderNumber}</div>
                      <div className="text-sm text-muted-foreground">{order.customerName}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Tags: {order.tags || '(none)'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {errorOrders.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 text-foreground">
                  Sync Errors ({errorOrders.length} orders)
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  These orders encountered an error during sync. Try syncing again.
                </p>
                <div className="space-y-2">
                  {errorOrders.map((order, idx) => (
                    <div key={idx} className="bg-muted p-3 rounded-md">
                      <div className="font-mono font-semibold">{order.orderNumber}</div>
                      <div className="text-sm text-muted-foreground">{order.customerName}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ScrollArea>
          
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                clearSyncWarnings();
                setShowWarnings(false);
              }}
            >
              <X className="w-4 h-4 mr-2" />
              Dismiss
            </Button>
            <Button onClick={() => setShowWarnings(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
