import { useState, useMemo } from 'react';
import { useOrders } from '@/context/OrderContext';
import { Order, Product } from '@/types/order';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, ChevronLeft, ChevronRight, Eye, List, MapPin, Package, Printer, Clock, User as UserIcon } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths } from 'date-fns';

type ViewMode = 'summary' | 'detailed';
type LocationFilter = 'all' | 'Wilmslow' | 'Manchester';

interface DayOrdersProps {
  date: Date;
  orders: Order[];
  viewMode: ViewMode;
  isCurrentMonth: boolean;
  onDayClick: (date: Date, orders: Order[]) => void;
}

function DayCell({ date, orders, viewMode, isCurrentMonth, onDayClick }: DayOrdersProps) {
  const isCurrentDay = isToday(date);
  const hasOrders = orders.length > 0;
  
  return (
    <div
      onClick={() => hasOrders && onDayClick(date, orders)}
      className={`
        min-h-[100px] p-2 border border-border/50 rounded-lg transition-all
        ${isCurrentMonth ? 'bg-card' : 'bg-muted/30 opacity-60'}
        ${isCurrentDay ? 'ring-2 ring-primary' : ''}
        ${hasOrders ? 'cursor-pointer hover:bg-secondary/50' : ''}
      `}
    >
      <div className="flex items-center justify-between mb-1">
        <span className={`text-sm font-medium ${isCurrentDay ? 'text-primary' : 'text-muted-foreground'}`}>
          {format(date, 'd')}
        </span>
        {hasOrders && (
          <Badge variant="secondary" className="text-xs">
            {orders.length}
          </Badge>
        )}
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
            <UserIcon className="w-5 h-5" />
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
            <div key={i} className="p-3 bg-muted/20 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium">{product.name}</span>
                <span className={`text-xl font-bold px-3 py-1 rounded-full ${
                  product.quantity > 1 ? 'bg-destructive/20 text-destructive' : 'bg-primary/20'
                }`}>
                  ×{product.quantity}
                </span>
              </div>
              {/* Display Infinite Options properties if available */}
              {product.properties && product.properties.length > 0 && (
                <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {product.properties.map((prop, j) => (
                    <div key={j} className="flex">
                      <span className="font-medium mr-2">{prop.name}:</span>
                      <span>{prop.value}</span>
                    </div>
                  ))}
                </div>
              )}
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

interface SelectedDayModalProps {
  date: Date;
  orders: Order[];
  onClose: () => void;
}

function SelectedDayModal({ date, orders, onClose }: SelectedDayModalProps) {
  const [printLocation, setPrintLocation] = useState<LocationFilter>('all');
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  
  const pendingOrders = orders.filter(o => o.status === 'pending');
  const collectedOrders = orders.filter(o => o.status === 'collected');
  
  // Filter orders for printing
  const printableOrders = useMemo(() => {
    return pendingOrders.filter(o => 
      printLocation === 'all' || o.collectionLocation === printLocation
    ).sort((a, b) => a.collectionName.toLowerCase().localeCompare(b.collectionName.toLowerCase()));
  }, [pendingOrders, printLocation]);
  
  const handlePrint = () => {
    window.print();
  };
  
  if (showPrintPreview) {
    return (
      <div className="fixed inset-0 bg-background z-50 overflow-auto">
        {/* Print controls - hidden when printing */}
        <div className="no-print sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <Button variant="outline" onClick={() => setShowPrintPreview(false)}>
            ← Back
          </Button>
          <div className="text-center">
            <p className="text-lg font-medium">{printableOrders.length} cakes to print</p>
            <p className="text-sm text-muted-foreground">
              {Math.ceil(printableOrders.length / 2)} pages (2 per page)
            </p>
          </div>
          <Button onClick={handlePrint} className="btn-collect">
            <Printer className="w-5 h-5 mr-2" />
            Print All Cakes
          </Button>
        </div>
        
        {/* Printable content */}
        <div className="print-content p-4">
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
          
          {/* Header */}
          <header className="text-center mb-6 print:mb-4">
            <h1 className="text-2xl font-bold">Daily Cake Collection Sheet</h1>
            <p className="text-lg">
              {format(date, 'EEEE, dd/MM/yyyy')}
              {printLocation !== 'all' && ` • ${printLocation}`}
            </p>
            <p className="text-muted-foreground">
              Generated: {format(new Date(), 'dd/MM/yyyy HH:mm')} • {printableOrders.length} orders
            </p>
          </header>
          
          {/* Cake cards - 2 per page */}
          <div className="space-y-4 print:space-y-6">
            {Array.from({ length: Math.ceil(printableOrders.length / 2) }).map((_, pageIndex) => {
              const pageOrders = printableOrders.slice(pageIndex * 2, pageIndex * 2 + 2);
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
                Wilmslow ({pendingOrders.filter(o => o.collectionLocation === 'Wilmslow').length})
              </Button>
              <Button
                variant={printLocation === 'Manchester' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPrintLocation('Manchester')}
              >
                Manchester ({pendingOrders.filter(o => o.collectionLocation === 'Manchester').length})
              </Button>
            </div>
            <Button 
              onClick={() => setShowPrintPreview(true)} 
              className="w-full"
              disabled={printableOrders.length === 0}
            >
              <Printer className="w-4 h-4 mr-2" />
              Print {printableOrders.length} Cake Sheets
            </Button>
          </div>
        )}
        
        <div className="space-y-3">
          {orders.map((order) => (
            <div 
              key={order.id} 
              className={`p-4 rounded-lg border ${order.status === 'collected' ? 'bg-muted/50 border-muted' : 'bg-card border-border'}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-bold text-lg">{order.collectionName}</h3>
                  <p className="text-sm text-muted-foreground">Order #{order.orderNumber}</p>
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
                {/* Show product properties if available */}
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
          ))}
        </div>
      </Card>
    </div>
  );
}

export function OrderCalendar() {
  const { orders } = useOrders();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('summary');
  const [locationFilter, setLocationFilter] = useState<LocationFilter>('all');
  const [selectedDay, setSelectedDay] = useState<{ date: Date; orders: Order[] } | null>(null);
  
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
  
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Pad to start on Sunday
  const startDay = monthStart.getDay();
  const paddingDays = Array(startDay).fill(null);
  
  const getOrdersForDate = (date: Date): Order[] => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return ordersByDate[dateKey] || [];
  };
  
  const handleDayClick = (date: Date, dayOrders: Order[]) => {
    setSelectedDay({ date, orders: dayOrders });
  };
  
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
  };
  
  const goToToday = () => {
    setCurrentDate(new Date());
  };
  
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
          {/* Padding for start of month */}
          {paddingDays.map((_, i) => (
            <div key={`pad-${i}`} className="min-h-[100px]" />
          ))}
          
          {/* Actual days */}
          {daysInMonth.map(date => (
            <DayCell
              key={date.toISOString()}
              date={date}
              orders={getOrdersForDate(date)}
              viewMode={viewMode}
              isCurrentMonth={isSameMonth(date, currentDate)}
              onDayClick={handleDayClick}
            />
          ))}
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
      </div>
      
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
