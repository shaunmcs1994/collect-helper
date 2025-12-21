import { useState } from 'react';
import { Order } from '@/types/order';
import { StatusBadge } from './StatusBadge';
import { Button } from '@/components/ui/button';
import { useOrders } from '@/context/OrderContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Check, MapPin, Calendar, Package, Hash, Phone } from 'lucide-react';

interface OrderCardProps {
  order: Order;
}

export function OrderCard({ order }: OrderCardProps) {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const { markAsCollected } = useOrders();

  const handleMarkCollected = () => {
    markAsCollected(order.id);
    setShowConfirmation(false);
  };

  const totalItems = order.products.reduce((sum, p) => sum + p.quantity, 0);

  return (
    <>
      <article className="card-order animate-slide-in">
        {/* Header */}
        <header className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-2xl md:text-3xl font-bold text-foreground truncate">
              {order.collectionName}
            </h3>
            {order.alternativeName && (
              <p className="text-lg text-muted-foreground mt-1">
                Alt: {order.alternativeName}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1 text-muted-foreground">
              <Hash className="w-4 h-4" />
              <span className="text-lg font-medium">{order.orderNumber}</span>
            </div>
          </div>
          <StatusBadge status={order.status} />
        </header>

        {/* Meta info */}
        <div className="flex flex-wrap gap-4 mb-5 text-base">
          <div className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg">
            <Calendar className="w-5 h-5 text-primary" />
            <span className="font-medium">December {order.collectionDate}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg">
            <MapPin className="w-5 h-5 text-primary" />
            <span className="font-medium">{order.collectionLocation}</span>
          </div>
          {order.phoneNumber && (
            <a 
              href={`tel:${order.phoneNumber}`}
              className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg hover:bg-primary/10 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Phone className="w-5 h-5 text-primary" />
              <span className="font-medium">{order.phoneNumber}</span>
            </a>
          )}
        </div>

        {/* Products */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-5 h-5 text-muted-foreground" />
            <h4 className="text-base font-semibold text-muted-foreground uppercase tracking-wide">
              Products ({totalItems} items)
            </h4>
          </div>
          <ul className="space-y-2">
            {order.products.map((product, index) => (
              <li
                key={`${order.id}-${index}`}
                className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg"
              >
                <span className="text-lg font-medium">{product.name}</span>
                <span className="text-2xl font-bold text-primary bg-primary/10 px-4 py-1 rounded-full">
                  ×{product.quantity}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Collection info (if collected) */}
        {order.status === 'collected' && order.collectedAt && (
          <div className="p-3 bg-success/10 rounded-lg mb-4 border border-success/20">
            <p className="text-base text-success font-medium">
              ✓ Collected at {new Date(order.collectedAt).toLocaleString()}
              {order.collectedBy && ` by ${order.collectedBy}`}
            </p>
          </div>
        )}

        {/* Action button */}
        {order.status === 'pending' && (
          <Button
            onClick={() => setShowConfirmation(true)}
            className="btn-collect w-full"
            size="lg"
          >
            <Check className="w-6 h-6 mr-2" />
            MARK AS COLLECTED
          </Button>
        )}
      </article>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl">
              Confirm Collection
            </AlertDialogTitle>
          <AlertDialogDescription className="text-lg">
              Are you sure <strong>{order.collectionName}</strong> has collected their order?
              <br /><br />
              <strong>Order #{order.orderNumber}</strong> contains {totalItems} item(s).
              <br /><br />
              <span className="text-destructive font-medium">
                This action cannot be undone.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-3">
            <AlertDialogCancel className="text-lg py-6">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMarkCollected}
              className="btn-collect text-lg py-6"
            >
              <Check className="w-5 h-5 mr-2" />
              Yes, Mark as Collected
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
