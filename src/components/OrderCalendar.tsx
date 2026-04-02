import { useState, useMemo } from 'react';
import { useOrders } from '@/context/OrderContext';
import { Order, Product } from '@/types/order';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, ChevronLeft, ChevronRight, Eye, List, MapPin, Package, Printer, Clock, User as UserIcon, Cake, AlertTriangle, CheckSquare, X, CircleCheck, CircleX, RotateCcw } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths } from 'date-fns';
import { OrderDetailModal } from './OrderDetailModal';

type ViewMode = 'summary' | 'detailed';
type LocationFilter = 'all' | 'Wilmslow' | 'Manchester';

interface DayOrdersProps {
  date: Date;
  orders: Order[];
  viewMode: ViewMode;
  isCurrentMonth: boolean;
  onDayClick: (date: Date, orders: Order[]) => void;
  selectionMode: boolean;
  isSelected: boolean;
  onToggleSelect: (dateStr: string) => void;
  isPrinted: boolean;
  hasWarning: boolean;
}

function DayCell({ date, orders, viewMode, isCurrentMonth, onDayClick, selectionMode, isSelected, onToggleSelect, isPrinted, hasWarning }: DayOrdersProps) {
  const isCurrentDay = isToday(date);
  const hasOrders = orders.length > 0;
  const dateStr = format(date, 'yyyy-MM-dd');
  const pendingCount = orders.filter(o => o.status === 'pending').length;
  
  const handleClick = () => {
    if (selectionMode && pendingCount > 0) {
      onToggleSelect(dateStr);
    } else if (hasOrders) {
      onDayClick(date, orders);
    }
  };
  
  return (
    <div
      onClick={handleClick}
      className={`
        min-h-[100px] p-2 border border-border/50 rounded-lg transition-all relative
        ${isCurrentMonth ? 'bg-card' : 'bg-muted/30 opacity-60'}
        ${isCurrentDay ? 'ring-2 ring-primary' : ''}
        ${hasOrders || (selectionMode && pendingCount > 0) ? 'cursor-pointer hover:bg-secondary/50' : ''}
        ${selectionMode && isSelected ? 'ring-2 ring-primary bg-primary/10' : ''}
      `}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1">
          {selectionMode && pendingCount > 0 && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelect(dateStr)}
              onClick={(e) => e.stopPropagation()}
              className="h-4 w-4"
            />
          )}
          <span className={`text-sm font-medium ${isCurrentDay ? 'text-primary' : 'text-muted-foreground'}`}>
            {format(date, 'd')}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {isPrinted && !hasWarning && (
            <Printer className="w-3 h-3 text-muted-foreground" />
          )}
          {hasWarning && (
            <AlertTriangle className="w-3 h-3 text-destructive" />
          )}
          {hasOrders && (
            <Badge variant="secondary" className="text-xs">
              {orders.length}
            </Badge>
          )}
        </div>
      </div>
      
      {viewMode === 'detailed' && orders.slice(0, 3).map((order) => (
        <div
          key={order.id}
          className="text-xs p-1 mb-1 bg-primary/10 rounded truncate"
          title={`${order.collectionName} - ${order.products.map(p => p.name).join(', ')}`}
        >
          <span className="font-medium">{order.collectionName}</span>
        </div>
      ))}
      {viewMode === 'detailed' && orders.length > 3 && (
        <p className="text-xs text-muted-foreground">+{orders.length - 3} more</p>
      )}
    </div>
  );
}

// Format ISO date to UK format DD/MM/YYYY
function formatDateUK(isoDate: string): string {
  try {
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}/${year}`;
  } catch {
    return isoDate;
  }
}

// Cake card for printing
interface CakeCardProps {
  order: Order;
}

function CakeCard({ order }: CakeCardProps) {
  const totalItems = order.products.reduce((sum, p) => sum + p.quantity, 0);
  const isManchester = order.collectionLocation === 'Manchester';
  const locationColor = isManchester ? '#3b82f6' : '#eab308';
  const isCustom = order.isCustomCake;
  
  return (
    <div className={`cake-card border-2 border-foreground rounded-lg p-4 break-inside-avoid bg-white ${isCustom ? 'custom-cake-card' : ''}`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-3 pb-3 border-b-2 border-foreground">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">{order.collectionName}</h2>
            {isCustom && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold print:bg-amber-200">
                <Cake className="h-3 w-3" />
                CUSTOM
              </span>
            )}
          </div>
          {order.alternativeName && (
            <p className="text-sm text-muted-foreground">Alt: {order.alternativeName}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-lg font-bold">#{order.orderNumber}</p>
          <p className="text-sm">{formatDateUK(order.collectionDate)}</p>
        </div>
      </div>
      
      {/* Location & Time */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b-2 border-foreground bg-muted/30 -mx-4 px-4 py-2">
        <div className="flex items-center gap-2">
          <div 
            className="w-4 h-4 rounded-sm border border-foreground flex-shrink-0"
            style={{ backgroundColor: locationColor }}
          />
          <MapPin className="w-5 h-5" />
          <span className="text-lg font-bold">{order.collectionLocation}</span>
        </div>
        {order.pickupTime && (
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            <span className="text-lg font-bold">{order.pickupTime}</span>
          </div>
        )}
      </div>
      
      {/* Phone Number */}
      {order.phoneNumber && (
        <div className="flex items-center gap-2 mb-3 text-sm">
          <UserIcon className="w-4 h-4" />
          <span className="font-medium">{order.phoneNumber}</span>
        </div>
      )}
      
      {/* Products */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-2">
          <Package className="w-4 h-4" />
          <h3 className="text-base font-bold">Products ({totalItems} items)</h3>
        </div>
        <div className="space-y-2">
          {order.products.map((product, i) => (
            <div key={i} className="p-2 bg-muted/20 rounded-lg border border-muted">
              <div className="flex gap-3">
                {product.image_url && (
                  <img 
                    src={product.image_url} 
                    alt={product.name}
                    className="w-16 h-16 object-cover rounded flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1">
                      <span className="text-base font-bold block">{product.name}</span>
                      {product.variant_title && (
                        <p className="text-lg font-bold text-foreground">
                          {product.variant_title}
                        </p>
                      )}
                      {product.sku && (
                        <p className="text-xs text-muted-foreground">
                          SKU: {product.sku}
                        </p>
                      )}
                    </div>
                    <span className={`text-lg font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                      product.quantity > 1 ? 'bg-destructive/20 text-destructive' : 'bg-primary/20'
                    }`}>
                      ×{product.quantity}
                    </span>
                  </div>
                  {product.properties && product.properties.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-muted space-y-0.5">
                      {product.properties.map((prop, j) => (
                        <div key={j} className="text-sm">
                          <span className="font-semibold">{prop.name}:</span>
                          <span className="ml-1">{prop.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Custom Cake Notes */}
      {isCustom && order.customNotes && (
        <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <h4 className="text-sm font-bold text-amber-800 mb-1">Custom Instructions:</h4>
          <p className="text-sm whitespace-pre-wrap">{order.customNotes}</p>
        </div>
      )}
      
      {/* Custom Cake Images */}
      {isCustom && order.customImages && order.customImages.length > 0 && (
        <div className="mb-3">
          <h4 className="text-sm font-bold mb-2">📷 Reference Images:</h4>
          <div className="flex flex-wrap gap-3">
            {order.customImages.map((url, i) => (
              <img 
                key={i}
                src={url} 
                alt={`Reference ${i + 1}`}
                className="custom-cake-ref-img w-36 h-36 object-contain rounded border-2 border-foreground bg-white"
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Status Checkboxes */}
      <div className="pt-3 border-t-2 border-foreground">
        <div className="grid grid-cols-4 gap-2">
          <div className="flex flex-col items-center gap-1">
            <div className="w-6 h-6 border-2 border-foreground rounded flex-shrink-0"></div>
            <span className="text-xs font-medium text-center">Stacked</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-6 h-6 border-2 border-foreground rounded flex-shrink-0"></div>
            <span className="text-xs font-medium text-center">Crumb coated</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-6 h-6 border-2 border-foreground rounded flex-shrink-0"></div>
            <span className="text-xs font-medium text-center">Decorated</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-6 h-6 border-2 border-foreground rounded flex-shrink-0"></div>
            <span className="text-xs font-medium text-center">Boxed</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Post-print confirmation dialog
interface PrintConfirmationProps {
  orders: Order[];
  onConfirm: () => void;
  onReprintSelected: (orderIds: string[]) => void;
  onReprintAll: () => void;
}

function PrintConfirmationDialog({ orders, onConfirm, onReprintSelected, onReprintAll }: PrintConfirmationProps) {
  const [allPrintedOk, setAllPrintedOk] = useState<boolean | null>(null);
  const [failedOrderIds, setFailedOrderIds] = useState<Set<string>>(new Set());

  const toggleFailed = (orderId: string) => {
    setFailedOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  if (allPrintedOk === true) {
    onConfirm();
    return null;
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <Card className="w-full max-w-lg max-h-[80vh] overflow-auto p-6">
        {allPrintedOk === null ? (
          <>
            <div className="text-center mb-6">
              <Printer className="w-12 h-12 mx-auto mb-3 text-primary" />
              <h2 className="text-xl font-bold mb-2">Print Confirmation</h2>
              <p className="text-muted-foreground">
                Did all <span className="font-bold text-foreground">{orders.length}</span> orders print correctly?
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <Button
                onClick={() => setAllPrintedOk(true)}
                className="flex-1 h-14 text-lg gap-2"
              >
                <CircleCheck className="w-6 h-6" />
                Yes, all printed
              </Button>
              <Button
                variant="destructive"
                onClick={() => setAllPrintedOk(false)}
                className="flex-1 h-14 text-lg gap-2"
              >
                <CircleX className="w-6 h-6" />
                No, some failed
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-4">
              <h2 className="text-xl font-bold mb-1">Which orders failed to print?</h2>
              <p className="text-sm text-muted-foreground">
                Tick the orders that didn't print correctly, then reprint just those — or reprint everything.
              </p>
            </div>
            <div className="space-y-2 mb-4 max-h-[40vh] overflow-auto">
              {orders.map(order => (
                <div
                  key={order.id}
                  onClick={() => toggleFailed(order.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    failedOrderIds.has(order.id)
                      ? 'border-destructive bg-destructive/10'
                      : 'border-border hover:bg-secondary/50'
                  }`}
                >
                  <Checkbox
                    checked={failedOrderIds.has(order.id)}
                    onCheckedChange={() => toggleFailed(order.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{order.collectionName}</p>
                    <p className="text-xs text-muted-foreground">
                      #{order.orderNumber} • {order.products.map(p => p.name).join(', ')}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs flex-shrink-0">
                    {order.collectionLocation}
                  </Badge>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              {failedOrderIds.size > 0 && (
                <Button
                  onClick={() => onReprintSelected(Array.from(failedOrderIds))}
                  className="w-full gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Reprint {failedOrderIds.size} failed order{failedOrderIds.size !== 1 ? 's' : ''}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={onReprintAll}
                className="w-full gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reprint all {orders.length} orders
              </Button>
              <Button
                variant="ghost"
                onClick={onConfirm}
                className="w-full"
              >
                Skip — I'll handle it manually
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

interface SelectedDayModalProps {
  date: Date;
  orders: Order[];
  onClose: () => void;
}

function SelectedDayModal({ date, orders, onClose }: SelectedDayModalProps) {
  const { logPrint, getLatestPrintLog } = useOrders();
  const [printLocation, setPrintLocation] = useState<LocationFilter>('all');
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [printNewOnly, setPrintNewOnly] = useState(false);
  const [printSelectedOnly, setPrintSelectedOnly] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showPrintConfirmation, setShowPrintConfirmation] = useState(false);
  const [reprintOrderIds, setReprintOrderIds] = useState<Set<string> | null>(null);
  
  const dateStr = format(date, 'yyyy-MM-dd');
  const latestPrint = getLatestPrintLog(dateStr);
  
  // Identify orders that arrived after the last print
  const newOrderIds = useMemo(() => {
    if (!latestPrint) return new Set<string>();
    const printedAt = new Date(latestPrint.printed_at);
    return new Set(
      orders.filter(o => 
        o.status === 'pending' && 
        new Date(o.createdAt || '') > printedAt
      ).map(o => o.id)
    );
  }, [orders, latestPrint]);
  
  const pendingOrders = orders.filter(o => o.status === 'pending');
  const collectedOrders = orders.filter(o => o.status === 'collected');
  
  const regularOrders = pendingOrders.filter(o => !o.isCustomCake);
  const customOrders = pendingOrders.filter(o => o.isCustomCake);

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const selectAllPending = () => {
    setSelectedOrderIds(new Set(pendingOrders.map(o => o.id)));
  };

  const clearSelection = () => {
    setSelectedOrderIds(new Set());
  };
  
  const printableOrders = useMemo(() => {
    let filtered = pendingOrders.filter(o => 
      printLocation === 'all' || o.collectionLocation === printLocation
    );
    if (printSelectedOnly && selectedOrderIds.size > 0) {
      filtered = filtered.filter(o => selectedOrderIds.has(o.id));
    } else if (printNewOnly && newOrderIds.size > 0) {
      filtered = filtered.filter(o => newOrderIds.has(o.id));
    }
    return filtered.sort((a, b) => a.collectionName.toLowerCase().localeCompare(b.collectionName.toLowerCase()));
  }, [pendingOrders, printLocation, printNewOnly, printSelectedOnly, selectedOrderIds, newOrderIds]);
  
  const filteredRegular = printableOrders.filter(o => !o.isCustomCake);
  const filteredCustom = printableOrders.filter(o => o.isCustomCake);
  const regularPages = Math.ceil(filteredRegular.length / 2);
  const customPages = filteredCustom.length;
  const totalPages = regularPages + customPages;
  
  const handlePrint = async () => {
    const dateStr = format(date, 'yyyy-MM-dd');
    await logPrint([dateStr], printLocation, printableOrders.length, printableOrders.map(o => o.id));
    window.print();
    setShowPrintConfirmation(true);
  };

  const handleReprintSelected = (failedIds: string[]) => {
    setReprintOrderIds(new Set(failedIds));
    setShowPrintConfirmation(false);
  };

  const handleReprintAll = () => {
    setReprintOrderIds(null);
    setShowPrintConfirmation(false);
    // Just close confirmation, they can print again from preview
  };

  const handleConfirmPrintOk = () => {
    setShowPrintConfirmation(false);
    setShowPrintPreview(false);
  };

  // If reprinting selected orders, filter printableOrders
  const displayOrders = reprintOrderIds 
    ? printableOrders.filter(o => reprintOrderIds.has(o.id))
    : printableOrders;
  const displayRegular = displayOrders.filter(o => !o.isCustomCake);
  const displayCustom = displayOrders.filter(o => o.isCustomCake);
  const displayRegularPages = Math.ceil(displayRegular.length / 2);
  const displayTotalPages = displayRegularPages + displayCustom.length;
  if (showPrintPreview) {
    return (
      <>
        <style>
          {`
            @media print {
              @page {
                size: A4 landscape;
                margin: 8mm;
              }
            
              body > *:not(#root) {
                display: none !important;
              }
            
              .print-preview-wrapper {
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: auto !important;
                overflow: visible !important;
                background: white !important;
              }
            
              .no-print {
                display: none !important;
              }
            
              #cake-print-area {
                display: block !important;
                padding: 0 !important;
              }
            
              #cake-print-area > header {
                display: none !important;
              }
            
              .cake-page {
                display: flex !important;
                flex-direction: row !important;
                justify-content: space-between !important;
                gap: 6mm !important;
                width: 100% !important;
                min-height: 180mm !important;
                page-break-after: always !important;
                break-after: page !important;
              }
            
              .cake-page:last-child {
                page-break-after: auto !important;
                break-after: auto !important;
              }
            
              .cake-card:not(.custom-cake-card) {
                flex: 1 1 50% !important;
                max-width: calc(50% - 3mm) !important;
                height: 180mm !important;
                overflow: hidden !important;
                border: 1px solid #ccc !important;
                padding: 4mm !important;
                box-sizing: border-box !important;
              }
              
              .custom-cake-page {
                display: block !important;
                width: 100% !important;
                min-height: 180mm !important;
                page-break-after: always !important;
                break-after: page !important;
              }
              
              .custom-cake-page:last-child {
                page-break-after: auto !important;
                break-after: auto !important;
              }
              
              .custom-cake-card {
                width: 100% !important;
                max-width: 100% !important;
                height: auto !important;
                min-height: 180mm !important;
                border: 2px solid #000 !important;
                padding: 6mm !important;
                box-sizing: border-box !important;
              }
              
               .custom-cake-card .custom-cake-ref-img {
                 width: 45mm !important;
                 height: 45mm !important;
                 object-fit: contain !important;
                 display: inline-block !important;
                 visibility: visible !important;
               }
               
               .custom-cake-card img {
                 max-height: 60mm !important;
                 object-fit: contain !important;
                 display: inline-block !important;
                 visibility: visible !important;
               }
            
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
          `}
        </style>
        <div className="print-preview-wrapper fixed inset-0 bg-background z-50 overflow-auto">
          <div className="no-print sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <Button variant="outline" onClick={() => { setShowPrintPreview(false); setReprintOrderIds(null); }}>
              ← Back
            </Button>
            <div className="text-center">
              <p className="text-lg font-medium">
                {reprintOrderIds ? `Reprinting ${displayOrders.length} failed order${displayOrders.length !== 1 ? 's' : ''}` : `${displayOrders.length} cakes to print`}
              </p>
              <p className="text-sm text-muted-foreground">
                {displayTotalPages} pages ({displayRegular.length} regular @ 2/page, {displayCustom.length} custom @ 1/page)
              </p>
            </div>
            <Button onClick={handlePrint} className="btn-collect">
              <Printer className="w-5 h-5 mr-2" />
              {reprintOrderIds ? 'Reprint' : 'Print All Cakes'}
            </Button>
          </div>
          
          <div id="cake-print-area" className="p-4">
            <header className="text-center mb-6 print:hidden">
              <h1 className="text-2xl font-bold">Daily Cake Collection Sheet</h1>
              <p className="text-lg">
                {format(date, 'EEEE, dd/MM/yyyy')}
                {printLocation !== 'all' && ` • ${printLocation}`}
              </p>
              <p className="text-muted-foreground">
                Generated: {format(new Date(), 'dd/MM/yyyy HH:mm')} • {displayOrders.length} orders
              </p>
            </header>
            
            {Array.from({ length: Math.ceil(displayRegular.length / 2) }).map((_, pageIndex) => {
              const pageOrders = displayRegular.slice(pageIndex * 2, pageIndex * 2 + 2);
              return (
                <div key={`regular-${pageIndex}`} className="cake-page flex gap-4 mb-4">
                  {pageOrders.map((order) => (
                    <CakeCard key={order.id} order={order} />
                  ))}
                </div>
              );
            })}
            
            {displayCustom.map((order) => (
              <div key={`custom-${order.id}`} className="custom-cake-page mb-4">
                <CakeCard order={order} />
              </div>
            ))}
          </div>
        </div>
        {showPrintConfirmation && (
          <PrintConfirmationDialog
            orders={displayOrders}
            onConfirm={handleConfirmPrintOk}
            onReprintSelected={handleReprintSelected}
            onReprintAll={handleReprintAll}
          />
        )}
      </>
    );
  }
  
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">{format(date, 'EEEE, dd/MM/yyyy')}</h2>
            <p className="text-muted-foreground">{orders.length} orders • {pendingOrders.length} pending</p>
          </div>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
        
        {/* Print Cakes Section */}
        {pendingOrders.length > 0 && (
          <div className="mb-6 p-4 bg-secondary rounded-lg">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Printer className="w-4 h-4" />
              Print Cake Sheets
            </h3>
            <div className="flex flex-wrap gap-2 mb-3">
              <Button
                variant={printLocation === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPrintLocation('all')}
              >
                All ({pendingOrders.length})
              </Button>
              <Button
                variant={printLocation === 'Wilmslow' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPrintLocation('Wilmslow')}
              >
                <div className="w-3 h-3 rounded-sm mr-1" style={{ backgroundColor: '#eab308' }} />
                Wilmslow ({pendingOrders.filter(o => o.collectionLocation === 'Wilmslow').length})
              </Button>
              <Button
                variant={printLocation === 'Manchester' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPrintLocation('Manchester')}
              >
                <div className="w-3 h-3 rounded-sm mr-1" style={{ backgroundColor: '#3b82f6' }} />
                Manchester ({pendingOrders.filter(o => o.collectionLocation === 'Manchester').length})
              </Button>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => { setPrintNewOnly(false); setPrintSelectedOnly(false); setShowPrintPreview(true); }} 
                className="flex-1"
                disabled={pendingOrders.filter(o => printLocation === 'all' || o.collectionLocation === printLocation).length === 0}
              >
                <Printer className="w-4 h-4 mr-2" />
                Print All ({pendingOrders.filter(o => printLocation === 'all' || o.collectionLocation === printLocation).length})
              </Button>
              {selectedOrderIds.size > 0 && (
                <Button 
                  onClick={() => { setPrintSelectedOnly(true); setPrintNewOnly(false); setShowPrintPreview(true); }} 
                  className="flex-1"
                  variant="secondary"
                >
                  <CheckSquare className="w-4 h-4 mr-2" />
                  Print Selected ({selectedOrderIds.size})
                </Button>
              )}
            </div>
            {newOrderIds.size > 0 && (
              <Button 
                onClick={() => { setPrintNewOnly(true); setPrintSelectedOnly(false); setShowPrintPreview(true); }} 
                className="w-full mt-2"
                variant="destructive"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Print {newOrderIds.size} New Order{newOrderIds.size > 1 ? 's' : ''} Only
              </Button>
            )}
          </div>
        )}
        
        {/* New orders warning banner inside modal */}
        {newOrderIds.size > 0 && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
              <p className="text-sm font-medium text-destructive">
                {newOrderIds.size} new order{newOrderIds.size > 1 ? 's' : ''} arrived since last print — highlighted below in red.
              </p>
            </div>
          </div>
        )}
        
        {/* Select controls */}
        {pendingOrders.length > 0 && (
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">
              {selectedOrderIds.size > 0 ? `${selectedOrderIds.size} selected` : 'Tick orders to print a selection'}
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={selectAllPending}>Select All</Button>
              {selectedOrderIds.size > 0 && (
                <Button variant="ghost" size="sm" onClick={clearSelection}>Clear</Button>
              )}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {orders.map((order) => {
            const isNewOrder = newOrderIds.has(order.id);
            const isChecked = selectedOrderIds.has(order.id);
            return (
            <div 
              key={order.id} 
              className={`p-4 rounded-lg border cursor-pointer hover:bg-secondary/50 transition-colors ${
                isNewOrder 
                  ? 'bg-destructive/10 border-destructive ring-2 ring-destructive/30' 
                  : isChecked
                    ? 'bg-primary/5 border-primary ring-1 ring-primary/30'
                    : order.status === 'collected' 
                      ? 'bg-muted/50 border-muted' 
                      : 'bg-card border-border'
              }`}
              onClick={() => setSelectedOrder(order)}
            >
              {isNewOrder && (
                <div className="flex items-center gap-1 mb-2">
                  <AlertTriangle className="w-3 h-3 text-destructive" />
                  <span className="text-xs font-bold text-destructive uppercase">New since last print</span>
                </div>
              )}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {order.status === 'pending' && (
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => toggleOrderSelection(order.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-5 w-5 mt-1"
                    />
                  )}
                  <div>
                    <h3 className="font-bold text-lg">{order.collectionName}</h3>
                    <p className="text-sm text-muted-foreground">Order #{order.orderNumber}</p>
                  </div>
                  {order.isCustomCake && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">
                      <Cake className="h-3 w-3" />
                      Custom
                    </span>
                  )}
                </div>
                <Badge variant={order.status === 'collected' ? 'secondary' : 'default'}>
                  {order.status}
                </Badge>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {order.collectionLocation}
                </div>
                {order.pickupTime && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {order.pickupTime}
                  </div>
                )}
              </div>
              
              <div className="text-sm">
                <div className="flex items-center gap-1 mb-1">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  <span>
                    {order.products.map(p => `${p.name} ×${p.quantity}`).join(', ')}
                  </span>
                </div>
                {order.products.some(p => p.properties && p.properties.length > 0) && (
                  <div className="ml-5 text-xs text-muted-foreground">
                    {order.products.map((p, idx) => 
                      p.properties && p.properties.length > 0 && (
                        <div key={idx} className="mt-1">
                          <span className="font-medium">{p.name}:</span>
                          {p.properties.map((prop, j) => (
                            <span key={j} className="ml-2">{prop.name}: {prop.value}</span>
                          ))}
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
            );
          })}
        </div>
        
        <OrderDetailModal
          order={selectedOrder}
          open={selectedOrder !== null}
          onOpenChange={(open) => !open && setSelectedOrder(null)}
        />
      </Card>
    </div>
  );
}

// Multi-day print preview
interface MultiDayPrintPreviewProps {
  dates: string[];
  orders: Order[];
  locationFilter: LocationFilter;
  onClose: () => void;
}

function MultiDayPrintPreview({ dates, orders, locationFilter, onClose }: MultiDayPrintPreviewProps) {
  const { logPrint } = useOrders();
  const [showPrintConfirmation, setShowPrintConfirmation] = useState(false);
  const [reprintOrderIds, setReprintOrderIds] = useState<Set<string> | null>(null);
  
  const printableOrders = useMemo(() => {
    return orders
      .filter(o => o.status === 'pending')
      .filter(o => dates.includes(o.collectionDate))
      .filter(o => locationFilter === 'all' || o.collectionLocation === locationFilter)
      .sort((a, b) => {
        const dateCompare = a.collectionDate.localeCompare(b.collectionDate);
        if (dateCompare !== 0) return dateCompare;
        return a.collectionName.toLowerCase().localeCompare(b.collectionName.toLowerCase());
      });
  }, [orders, dates, locationFilter]);

  const sortedDates = [...dates].sort();
  const dateRangeLabel = sortedDates.length === 1
    ? formatDateUK(sortedDates[0])
    : `${formatDateUK(sortedDates[0])} - ${formatDateUK(sortedDates[sortedDates.length - 1])}`;

  const handlePrint = async () => {
    const ordersToPrint = reprintOrderIds 
      ? printableOrders.filter(o => reprintOrderIds.has(o.id))
      : printableOrders;
    await logPrint(dates, locationFilter, ordersToPrint.length, ordersToPrint.map(o => o.id));
    window.print();
    setShowPrintConfirmation(true);
  };

  const handleReprintSelected = (failedIds: string[]) => {
    setReprintOrderIds(new Set(failedIds));
    setShowPrintConfirmation(false);
  };

  const handleReprintAll = () => {
    setReprintOrderIds(null);
    setShowPrintConfirmation(false);
  };

  const handleConfirmPrintOk = () => {
    setShowPrintConfirmation(false);
    onClose();
  };

  const displayOrders = reprintOrderIds 
    ? printableOrders.filter(o => reprintOrderIds.has(o.id))
    : printableOrders;
  const displayRegular = displayOrders.filter(o => !o.isCustomCake);
  const displayCustom = displayOrders.filter(o => o.isCustomCake);
  const displayRegularPages = Math.ceil(displayRegular.length / 2);
  const displayTotalPages = displayRegularPages + displayCustom.length;

  return (
    <>
      <style>
        {`
          @media print {
            @page {
              size: A4 landscape;
              margin: 8mm;
            }
          
            body > *:not(#root) {
              display: none !important;
            }
          
            .print-preview-wrapper {
              position: absolute !important;
              top: 0 !important;
              left: 0 !important;
              width: 100% !important;
              height: auto !important;
              overflow: visible !important;
              background: white !important;
            }
          
            .no-print {
              display: none !important;
            }
          
            #cake-print-area {
              display: block !important;
              padding: 0 !important;
            }
          
            #cake-print-area > header {
              display: none !important;
            }
          
            .cake-page {
              display: flex !important;
              flex-direction: row !important;
              justify-content: space-between !important;
              gap: 6mm !important;
              width: 100% !important;
              min-height: 180mm !important;
              page-break-after: always !important;
              break-after: page !important;
            }
          
            .cake-page:last-child {
              page-break-after: auto !important;
              break-after: auto !important;
            }
          
            .cake-card:not(.custom-cake-card) {
              flex: 1 1 50% !important;
              max-width: calc(50% - 3mm) !important;
              height: 180mm !important;
              overflow: hidden !important;
              border: 1px solid #ccc !important;
              padding: 4mm !important;
              box-sizing: border-box !important;
            }
            
            .custom-cake-page {
              display: block !important;
              width: 100% !important;
              min-height: 180mm !important;
              page-break-after: always !important;
              break-after: page !important;
            }
            
            .custom-cake-page:last-child {
              page-break-after: auto !important;
              break-after: auto !important;
            }
            
            .custom-cake-card {
              width: 100% !important;
              max-width: 100% !important;
              height: auto !important;
              min-height: 180mm !important;
              border: 2px solid #000 !important;
              padding: 6mm !important;
              box-sizing: border-box !important;
            }
            
            .custom-cake-card img {
              max-height: 60mm !important;
              object-fit: contain !important;
            }
          
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        `}
      </style>
      <div className="print-preview-wrapper fixed inset-0 bg-background z-50 overflow-auto">
        <div className="no-print sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <Button variant="outline" onClick={onClose}>
            ← Back
          </Button>
          <div className="text-center">
            <p className="text-lg font-medium">
              {reprintOrderIds ? `Reprinting ${displayOrders.length} failed order${displayOrders.length !== 1 ? 's' : ''}` : `${displayOrders.length} cakes to print`}
            </p>
            <p className="text-sm text-muted-foreground">
              {displayTotalPages} pages • {dates.length} days ({dateRangeLabel})
            </p>
          </div>
          <Button onClick={handlePrint} className="btn-collect">
            <Printer className="w-5 h-5 mr-2" />
            {reprintOrderIds ? 'Reprint' : 'Print All Cakes'}
          </Button>
        </div>
        
        <div id="cake-print-area" className="p-4">
          <header className="text-center mb-6 print:hidden">
            <h1 className="text-2xl font-bold">Cake Collection Sheets</h1>
            <p className="text-lg">
              {dateRangeLabel} ({dates.length} days)
              {locationFilter !== 'all' && ` • ${locationFilter}`}
            </p>
            <p className="text-muted-foreground">
              Generated: {format(new Date(), 'dd/MM/yyyy HH:mm')} • {displayOrders.length} orders
            </p>
          </header>
          
          {Array.from({ length: Math.ceil(displayRegular.length / 2) }).map((_, pageIndex) => {
            const pageOrders = displayRegular.slice(pageIndex * 2, pageIndex * 2 + 2);
            return (
              <div key={`regular-${pageIndex}`} className="cake-page flex gap-4 mb-4">
                {pageOrders.map((order) => (
                  <CakeCard key={order.id} order={order} />
                ))}
              </div>
            );
          })}
          
          {displayCustom.map((order) => (
            <div key={`custom-${order.id}`} className="custom-cake-page mb-4">
              <CakeCard order={order} />
            </div>
          ))}
        </div>
      </div>
      {showPrintConfirmation && (
        <PrintConfirmationDialog
          orders={displayOrders}
          onConfirm={handleConfirmPrintOk}
          onReprintSelected={handleReprintSelected}
          onReprintAll={handleReprintAll}
        />
      )}
    </>
  );
}

export function OrderCalendar() {
  const { orders, printLogs, printWarnings, getLatestPrintLog } = useOrders();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('summary');
  const [locationFilter, setLocationFilter] = useState<LocationFilter>('all');
  const [selectedDay, setSelectedDay] = useState<{ date: Date; orders: Order[] } | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [showMultiPrint, setShowMultiPrint] = useState(false);
  const [multiPrintLocation, setMultiPrintLocation] = useState<LocationFilter>('all');
  
  // Filter orders by location
  const filteredOrders = useMemo(() => {
    if (locationFilter === 'all') return orders;
    return orders.filter(o => o.collectionLocation === locationFilter);
  }, [orders, locationFilter]);
  
  // Group orders by date
  const ordersByDate = useMemo(() => {
    const grouped: Record<string, Order[]> = {};
    
    filteredOrders.forEach(order => {
      const dateKey = order.collectionDate;
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(order);
    });
    
    return grouped;
  }, [filteredOrders]);

  // Dates that have been printed
  const printedDates = useMemo(() => {
    const dates = new Set<string>();
    printLogs.forEach(log => dates.add(log.collection_date));
    return dates;
  }, [printLogs]);

  // Dates with warnings
  const warningDates = useMemo(() => {
    const dates = new Set<string>();
    printWarnings.forEach(w => dates.add(w.collectionDate));
    return dates;
  }, [printWarnings]);
  
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  const startDay = monthStart.getDay();
  const paddingDays = Array(startDay).fill(null);
  
  const getOrdersForDate = (date: Date): Order[] => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return ordersByDate[dateKey] || [];
  };
  
  const handleDayClick = (date: Date, dayOrders: Order[]) => {
    setSelectedDay({ date, orders: dayOrders });
  };

  const handleToggleSelect = (dateStr: string) => {
    setSelectedDates(prev => {
      const next = new Set(prev);
      if (next.has(dateStr)) {
        next.delete(dateStr);
      } else {
        next.add(dateStr);
      }
      return next;
    });
  };

  const toggleSelectionMode = () => {
    if (selectionMode) {
      setSelectedDates(new Set());
    }
    setSelectionMode(!selectionMode);
  };

  const selectedOrderCount = useMemo(() => {
    return orders.filter(o => 
      o.status === 'pending' && 
      selectedDates.has(o.collectionDate) &&
      (multiPrintLocation === 'all' || o.collectionLocation === multiPrintLocation)
    ).length;
  }, [orders, selectedDates, multiPrintLocation]);
  
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
  };
  
  const goToToday = () => {
    setCurrentDate(new Date());
  };

  if (showMultiPrint) {
    return (
      <MultiDayPrintPreview
        dates={Array.from(selectedDates)}
        orders={orders}
        locationFilter={multiPrintLocation}
        onClose={() => setShowMultiPrint(false)}
      />
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateMonth('prev')}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-xl font-bold min-w-[200px] text-center">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <Button variant="outline" size="icon" onClick={() => navigateMonth('next')}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="ghost" onClick={goToToday} size="sm">
            Today
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={selectionMode ? 'default' : 'outline'}
            size="sm"
            onClick={toggleSelectionMode}
          >
            <CheckSquare className="w-4 h-4 mr-1" />
            {selectionMode ? 'Cancel Selection' : 'Select Days to Print'}
          </Button>
          <Button
            variant={viewMode === 'summary' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('summary')}
          >
            <List className="w-4 h-4 mr-1" />
            Summary
          </Button>
          <Button
            variant={viewMode === 'detailed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('detailed')}
          >
            <Eye className="w-4 h-4 mr-1" />
            Detailed
          </Button>
        </div>
      </div>

      {/* Print warnings banner */}
      {printWarnings.length > 0 && (
        <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <h3 className="font-semibold text-destructive">New orders after printing!</h3>
          </div>
          <div className="space-y-2">
            {printWarnings.map(w => (
              <div key={w.collectionDate} className="flex items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  <strong>{formatDateUK(w.collectionDate)}</strong>: {w.newOrderCount} new order{w.newOrderCount > 1 ? 's' : ''} since last print
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    const d = new Date(w.collectionDate + 'T12:00:00');
                    setSelectedDay({ date: d, orders: orders.filter(o => o.collectionDate === w.collectionDate) });
                  }}
                >
                  <Eye className="w-3 h-3 mr-1" />
                  View & Print New
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Location Filter */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={locationFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setLocationFilter('all')}
        >
          All Locations
        </Button>
        <Button
          variant={locationFilter === 'Wilmslow' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setLocationFilter('Wilmslow')}
        >
          <MapPin className="w-4 h-4 mr-1" />
          Wilmslow
        </Button>
        <Button
          variant={locationFilter === 'Manchester' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setLocationFilter('Manchester')}
        >
          <MapPin className="w-4 h-4 mr-1" />
          Manchester
        </Button>
      </div>
      
      {/* Calendar Grid */}
      <Card className="p-4">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>
        
        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1">
          {paddingDays.map((_, i) => (
            <div key={`pad-${i}`} className="min-h-[100px]" />
          ))}
          
          {daysInMonth.map(date => {
            const dateStr = format(date, 'yyyy-MM-dd');
            return (
              <DayCell
                key={date.toISOString()}
                date={date}
                orders={getOrdersForDate(date)}
                viewMode={viewMode}
                isCurrentMonth={isSameMonth(date, currentDate)}
                onDayClick={handleDayClick}
                selectionMode={selectionMode}
                isSelected={selectedDates.has(dateStr)}
                onToggleSelect={handleToggleSelect}
                isPrinted={printedDates.has(dateStr)}
                hasWarning={warningDates.has(dateStr)}
              />
            );
          })}
        </div>
      </Card>
      
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded ring-2 ring-primary" />
          <span>Today</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">N</Badge>
          <span>Order count</span>
        </div>
        <div className="flex items-center gap-2">
          <Printer className="w-3 h-3" />
          <span>Printed</span>
        </div>
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-3 h-3 text-destructive" />
          <span>New orders since print</span>
        </div>
      </div>

      {/* Multi-day selection floating bar */}
      {selectionMode && selectedDates.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-card border border-border shadow-lg rounded-xl p-4 flex flex-wrap items-center gap-3">
          <span className="font-semibold text-sm">
            {selectedDates.size} day{selectedDates.size > 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant={multiPrintLocation === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMultiPrintLocation('all')}
            >
              All
            </Button>
            <Button
              variant={multiPrintLocation === 'Wilmslow' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMultiPrintLocation('Wilmslow')}
            >
              Wilmslow
            </Button>
            <Button
              variant={multiPrintLocation === 'Manchester' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMultiPrintLocation('Manchester')}
            >
              Manchester
            </Button>
          </div>
          <Button 
            onClick={() => setShowMultiPrint(true)}
            className="btn-collect"
            disabled={selectedOrderCount === 0}
          >
            <Printer className="w-4 h-4 mr-2" />
            Print {selectedOrderCount} Cakes
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => { setSelectedDates(new Set()); setSelectionMode(false); }}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
      
      {/* Selected day modal */}
      {selectedDay && (
        <SelectedDayModal
          date={selectedDay.date}
          orders={selectedDay.orders}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </div>
  );
}
