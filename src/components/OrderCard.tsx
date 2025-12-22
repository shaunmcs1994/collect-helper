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
import { Check, MapPin, Calendar, Package, Hash, Phone, Undo2, AlertTriangle } from 'lucide-react';
import { getProductStyle, getConfusableWarning } from '@/utils/productColors';

interface OrderCardProps {
  order: Order;
}

export function OrderCard({ order }: OrderCardProps) {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showRevertConfirmation, setShowRevertConfirmation] = useState(false);
  const { markAsCollected, markAsPending, productEmojis } = useOrders();

  const handleMarkCollected = () => {
    markAsCollected(order.id);
    setShowConfirmation(false);
  };

  const handleRevertToPending = () => {
    markAsPending(order.id);
    setShowRevertConfirmation(false);
  };

  const totalItems = order.products.reduce((sum, p) => sum + p.quantity, 0);
  
  // Check if this order has any confusable products
  const hasConfusableProducts = order.products.some(p => getConfusableWarning(p.name));

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

        {/* Confusable Products Warning */}
        {hasConfusableProducts && (
          <div className="mb-4 p-3 bg-warning/20 border border-warning/40 rounded-lg flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-warning-foreground flex-shrink-0" />
            <p className="text-base font-medium text-warning-foreground">
              This order contains similar-looking products. Please verify carefully!
            </p>
          </div>
        )}

        {/* Products */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-5 h-5 text-muted-foreground" />
            <h4 className="text-base font-semibold text-muted-foreground uppercase tracking-wide">
              Products ({totalItems} items)
            </h4>
          </div>
          <ul className="space-y-2">
            {order.products.map((product, index) => {
              const style = getProductStyle(product.name, productEmojis);
              const warning = getConfusableWarning(product.name);
              const isMultiple = product.quantity > 1;
              // Clean product name - remove trailing quantity patterns like "- 2" or "-2"
              const cleanProductName = product.name.replace(/\s*[-–]\s*\d+\s*$/, '').trim();
              
              return (
                <li
                  key={`${order.id}-${index}`}
                  className={`flex items-center justify-between p-3 rounded-lg border-2 ${style.colorClass}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{style.emoji}</span>
                    <span className={`text-2xl font-bold px-4 py-1 rounded-full ${
                      isMultiple 
                        ? 'text-red-600 bg-red-100 border-2 border-red-300' 
                        : 'text-primary bg-primary/10'
                    }`}>
                      ×{product.quantity}
                    </span>
                    <div>
                      <span className="text-lg font-bold">{cleanProductName}</span>
                      {warning && (
                        <p className="text-sm text-warning-foreground font-medium">{warning}</p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
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

        {/* Action buttons */}
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

        {order.status === 'collected' && (
          <Button
            onClick={() => setShowRevertConfirmation(true)}
            variant="outline"
            className="w-full border-warning text-warning hover:bg-warning/10"
            size="lg"
          >
            <Undo2 className="w-5 h-5 mr-2" />
            UNDO - RETURN TO PENDING
          </Button>
        )}
      </article>

      {/* Confirmation Dialog - Enhanced with product list */}
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl">
              Confirm Collection
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p className="text-lg">
                  Are you sure <strong>{order.collectionName}</strong> has collected their order?
                </p>
                
                {/* Enhanced Product List */}
                <div className="bg-secondary/50 rounded-lg p-4 space-y-3">
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Verify these products:
                  </p>
                  {order.products.map((product, index) => {
                    const style = getProductStyle(product.name, productEmojis);
                    const warning = getConfusableWarning(product.name);
                    const isMultiple = product.quantity > 1;
                    const cleanProductName = product.name.replace(/\s*[-–]\s*\d+\s*$/, '').trim();
                    
                    return (
                      <div 
                        key={`confirm-${order.id}-${index}`}
                        className={`p-3 rounded-lg border-2 ${style.colorClass}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{style.emoji}</span>
                          <span className={`text-2xl font-bold px-4 py-1 rounded-full ${
                            isMultiple 
                              ? 'text-red-600 bg-red-100 border-2 border-red-300' 
                              : 'text-primary'
                          }`}>×{product.quantity}</span>
                          <span className="text-xl font-bold text-foreground">{cleanProductName}</span>
                        </div>
                        {warning && (
                          <div className="mt-2 flex items-center gap-2 text-warning-foreground">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="text-sm font-medium">{warning}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                <p className="text-base text-muted-foreground">
                  <strong>Order #{order.orderNumber}</strong> • {totalItems} item(s) total
                </p>
              </div>
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

      {/* Revert Confirmation Dialog */}
      <AlertDialog open={showRevertConfirmation} onOpenChange={setShowRevertConfirmation}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl">
              Return to Pending?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-lg">
              Are you sure you want to mark <strong>{order.collectionName}</strong>'s order as NOT collected?
              <br /><br />
              This will move the order back to pending and update stock counts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-3">
            <AlertDialogCancel className="text-lg py-6">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevertToPending}
              className="bg-warning text-warning-foreground hover:bg-warning/90 text-lg py-6"
            >
              <Undo2 className="w-5 h-5 mr-2" />
              Yes, Return to Pending
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
