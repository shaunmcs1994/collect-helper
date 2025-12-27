import { useState, useMemo } from 'react';
import { useOrders } from '@/context/OrderContext';
import { Order } from '@/types/order';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, ChevronLeft, ChevronRight, Eye, List, MapPin, Package } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, isSameDay, parseISO } from 'date-fns';

type ViewMode = 'summary' | 'detailed';

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

interface SelectedDayModalProps {
  date: Date;
  orders: Order[];
  onClose: () => void;
}

function SelectedDayModal({ date, orders, onClose }: SelectedDayModalProps) {
  const pendingOrders = orders.filter(o => o.status === 'pending');
  const collectedOrders = orders.filter(o => o.status === 'collected');
  
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">{format(date, 'EEEE, MMMM d, yyyy')}</h2>
            <p className="text-muted-foreground">{orders.length} orders • {pendingOrders.length} pending</p>
          </div>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
        
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
              
              <div className="flex items-center gap-1 text-sm">
                <Package className="w-4 h-4 text-muted-foreground" />
                <span>
                  {order.products.map(p => `${p.name} ×${p.quantity}`).join(', ')}
                </span>
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
  const [selectedDay, setSelectedDay] = useState<{ date: Date; orders: Order[] } | null>(null);
  
  // Group orders by date - now using full ISO dates
  const ordersByDate = useMemo(() => {
    const grouped: Record<string, Order[]> = {};
    
    orders.forEach(order => {
      const dateKey = order.collectionDate; // Already in YYYY-MM-DD format
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(order);
    });
    
    return grouped;
  }, [orders]);
  
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
  
  const handleDayClick = (date: Date, orders: Order[]) => {
    setSelectedDay({ date, orders });
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
