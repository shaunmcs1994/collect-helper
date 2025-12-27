import { useState, useMemo } from 'react';
import { useOrders } from '@/context/OrderContext';
import { Order } from '@/types/order';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Calendar, Printer, ArrowLeft, MapPin, Package, Clock, User, Hash } from 'lucide-react';
import { format, parseISO } from 'date-fns';

// Format ISO date to UK format DD/MM/YYYY
function formatDateUK(isoDate: string): string {
  try {
    return format(parseISO(isoDate), 'dd/MM/yyyy');
  } catch {
    return isoDate;
  }
}

interface CakeCardProps {
  order: Order;
}

function CakeCard({ order }: CakeCardProps) {
  const totalItems = order.products.reduce((sum, p) => sum + p.quantity, 0);
  
  return (
    <div className="cake-card border-2 border-foreground rounded-lg p-6 break-inside-avoid bg-white">
      {/* Header */}
      <div className="flex justify-between items-start mb-4 pb-4 border-b-2 border-foreground">
        <div>
          <h2 className="text-2xl font-bold">{order.collectionName}</h2>
          {order.alternativeName && (
            <p className="text-lg text-muted-foreground">Alt: {order.alternativeName}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-lg font-bold">#{order.orderNumber}</p>
          <p className="text-lg">{formatDateUK(order.collectionDate)}</p>
        </div>
      </div>
      
      {/* Order Details */}
      <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-muted">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          <span className="font-medium">{order.collectionLocation}</span>
        </div>
        {order.pickupTime && (
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            <span className="font-medium">{order.pickupTime}</span>
          </div>
        )}
        {order.phoneNumber && (
          <div className="flex items-center gap-2 col-span-2">
            <User className="w-5 h-5" />
            <span className="font-medium">{order.phoneNumber}</span>
          </div>
        )}
      </div>
      
      {/* Products */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Package className="w-5 h-5" />
          <h3 className="text-lg font-bold">Products ({totalItems} items)</h3>
        </div>
        <div className="space-y-2">
          {order.products.map((product, i) => (
            <div key={i} className="flex justify-between items-center p-3 bg-muted/20 rounded-lg">
              <span className="text-lg font-medium">{product.name}</span>
              <span className={`text-xl font-bold px-3 py-1 rounded-full ${
                product.quantity > 1 ? 'bg-destructive/20 text-destructive' : 'bg-primary/20'
              }`}>
                ×{product.quantity}
              </span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Collection Checkbox */}
      <div className="pt-4 border-t-2 border-foreground flex items-center gap-4">
        <div className="w-8 h-8 border-2 border-foreground rounded flex-shrink-0"></div>
        <span className="text-lg font-medium">Collected</span>
        <div className="flex-1 border-b border-dashed border-foreground ml-4"></div>
      </div>
    </div>
  );
}

export function CakePrintView() {
  const { orders, getLocations } = useOrders();
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [showPreview, setShowPreview] = useState(false);
  
  const locations = getLocations();
  
  // Get unique dates from orders
  const availableDates = useMemo(() => {
    const dates = [...new Set(orders.map(o => o.collectionDate))];
    return dates.sort();
  }, [orders]);
  
  // Filter orders
  const filteredOrders = useMemo(() => {
    return orders
      .filter(o => o.status === 'pending')
      .filter(o => selectedDate === 'all' || o.collectionDate === selectedDate)
      .filter(o => selectedLocation === 'all' || o.collectionLocation === selectedLocation)
      .sort((a, b) => a.collectionName.toLowerCase().localeCompare(b.collectionName.toLowerCase()));
  }, [orders, selectedDate, selectedLocation]);
  
  const handlePrint = () => {
    window.print();
  };
  
  if (showPreview) {
    return (
      <div className="space-y-4">
        {/* Print controls - hidden when printing */}
        <div className="no-print flex items-center justify-between mb-6">
          <Button variant="outline" onClick={() => setShowPreview(false)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="text-center">
            <p className="text-lg font-medium">{filteredOrders.length} cakes to print</p>
            <p className="text-sm text-muted-foreground">
              {Math.ceil(filteredOrders.length / 2)} pages (2 per page)
            </p>
          </div>
          <Button onClick={handlePrint} className="btn-collect">
            <Printer className="w-5 h-5 mr-2" />
            Print All Cakes
          </Button>
        </div>
        
        {/* Printable content - 2 cakes per page */}
        <div className="print-content">
          <style>
            {`
              @media print {
                .cake-card-container {
                  page-break-after: always;
                }
                .cake-card-container:last-child {
                  page-break-after: avoid;
                }
                .cake-card {
                  height: 45vh;
                  max-height: 45vh;
                  overflow: hidden;
                }
              }
            `}
          </style>
          
          {/* Header - printed on first page only */}
          <header className="text-center mb-6 print:mb-4">
            <h1 className="text-2xl font-bold">Daily Cake Collection Sheet</h1>
            <p className="text-lg">
              {selectedDate !== 'all' ? formatDateUK(selectedDate) : 'All Dates'}
              {selectedLocation !== 'all' && ` • ${selectedLocation}`}
            </p>
            <p className="text-muted-foreground">
              Generated: {format(new Date(), 'dd/MM/yyyy HH:mm')} • {filteredOrders.length} orders
            </p>
          </header>
          
          {/* Cake cards - 2 per page */}
          <div className="space-y-4 print:space-y-6">
            {Array.from({ length: Math.ceil(filteredOrders.length / 2) }).map((_, pageIndex) => {
              const pageOrders = filteredOrders.slice(pageIndex * 2, pageIndex * 2 + 2);
              return (
                <div key={pageIndex} className="cake-card-container grid gap-6 print:gap-4">
                  {pageOrders.map(order => (
                    <CakeCard key={order.id} order={order} />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-2">Daily Cake Breakdown</h2>
      <p className="text-muted-foreground mb-6">
        Print detailed cake cards for the day - 2 cakes per A4 page with all order information.
      </p>
      
      <div className="space-y-4 mb-6">
        {/* Date Filter */}
        <div>
          <label className="block text-sm font-medium mb-2">Collection Date</label>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedDate === 'all' ? 'default' : 'outline'}
              onClick={() => setSelectedDate('all')}
              size="lg"
            >
              All Dates
            </Button>
            {availableDates.map(date => (
              <Button
                key={date}
                variant={selectedDate === date ? 'default' : 'outline'}
                onClick={() => setSelectedDate(date)}
                size="lg"
              >
                {formatDateUK(date)}
              </Button>
            ))}
          </div>
        </div>
        
        {/* Location Filter */}
        <div>
          <label className="block text-sm font-medium mb-2">Location</label>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedLocation === 'all' ? 'default' : 'outline'}
              onClick={() => setSelectedLocation('all')}
              size="lg"
            >
              All Locations
            </Button>
            {locations.map(loc => (
              <Button
                key={loc}
                variant={selectedLocation === loc ? 'default' : 'outline'}
                onClick={() => setSelectedLocation(loc)}
                size="lg"
              >
                {loc}
              </Button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Summary */}
      <div className="p-4 bg-secondary rounded-lg mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Pending Orders</p>
            <p className="text-3xl font-bold">{filteredOrders.length}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Pages to Print</p>
            <p className="text-3xl font-bold">{Math.ceil(filteredOrders.length / 2)}</p>
          </div>
        </div>
      </div>
      
      {/* Generate Button */}
      <Button
        onClick={() => setShowPreview(true)}
        className="btn-collect w-full"
        size="lg"
        disabled={filteredOrders.length === 0}
      >
        <Printer className="w-5 h-5 mr-2" />
        Generate Cake Print Sheets
      </Button>
      
      {filteredOrders.length === 0 && (
        <p className="text-center text-muted-foreground mt-4">
          No pending orders match your filters
        </p>
      )}
    </Card>
  );
}
