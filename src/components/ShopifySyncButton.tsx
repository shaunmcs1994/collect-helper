import { Button } from '@/components/ui/button';
import { useOrders } from '@/context/OrderContext';
import { RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

export function ShopifySyncButton() {
  const { syncWithShopify, isSyncing, lastSyncTime } = useOrders();

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
      {lastSyncTime && (
        <span className="text-sm text-muted-foreground">
          Last sync: {format(new Date(lastSyncTime), 'HH:mm')}
        </span>
      )}
    </div>
  );
}
