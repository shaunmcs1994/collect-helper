import { useState, useMemo } from 'react';
import { useOrders } from '@/context/OrderContext';
import { OrderCard } from '@/components/OrderCard';
import { OrderFilters } from '@/components/OrderFilters';
import { SearchBar } from '@/components/SearchBar';
import { ShopifySyncButton } from '@/components/ShopifySyncButton';
import { CollectionDate, LocationFilter, Order, Product } from '@/types/order';
import { Clock, Printer, MapPin, Package, User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';

// Format ISO date to UK format DD/MM/YYYY
function formatDateUK(isoDate: string): string {
  try {
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}/${year}`;
  } catch {
    return isoDate;
  }
}

// Cake card for printing (same as in OrderCalendar)
interface CakeCardProps {
  order: Order;
}

function CakeCard({ order }: CakeCardProps) {
  const totalItems = order.products.reduce((sum, p) => sum + p.quantity, 0);
  const isManchester = order.collectionLocation === 'Manchester';
  const locationColor = isManchester ? '#3b82f6' : '#eab308';
  
  return (
    <div className="cake-card border-2 border-foreground rounded-lg p-4 break-inside-avoid bg-white relative">
      {/* Location Color Indicator */}
      <div 
        className="absolute top-0 right-0 w-8 h-8 rounded-bl-lg border-l-2 border-b-2 border-foreground"
        style={{ backgroundColor: locationColor }}
        title={order.collectionLocation}
      />
      
      {/* Header */}
      <div className="flex justify-between items-start mb-3 pb-3 border-b-2 border-foreground pr-10">
        <div>
          <h2 className="text-xl font-bold">{order.collectionName}</h2>
          {order.alternativeName && (
            <p className="text-sm text-muted-foreground">Alt: {order.alternativeName}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-lg font-bold">#{order.orderNumber}</p>
          <p className="text-sm">{formatDateUK(order.collectionDate)}</p>
        </div>
      </div>
      
      {/* Location & Time - BIGGER */}
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
                        <p className="text-sm text-muted-foreground">
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
      
      {/* Collected checkbox area */}
      <div className="mt-auto pt-3 border-t-2 border-foreground">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-foreground rounded" />
          <span className="font-medium">Collected</span>
        </div>
      </div>
    </div>
  );
}

type PrintLocationFilter = 'all' | 'Wilmslow' | 'Manchester';

export default function PendingOrders() {
  const [dateFilter, setDateFilter] = useState<CollectionDate>('today');
  const [locationFilter, setLocationFilter] = useState<LocationFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [printLocation, setPrintLocation] = useState<PrintLocationFilter>('all');
  const { getOrdersByStatus } = useOrders();
  
  const today = format(new Date(), 'yyyy-MM-dd');
  
  const pendingOrders = useMemo(() => {
    let orders = getOrdersByStatus('pending');
    
    // Apply filters
    if (dateFilter === 'today') {
      orders = orders.filter(o => o.collectionDate === today);
    } else if (dateFilter !== 'all') {
      orders = orders.filter(o => o.collectionDate === dateFilter);
    }
    if (locationFilter !== 'all') {
      orders = orders.filter(o => o.collectionLocation === locationFilter);
    }
    
    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      orders = orders.filter(o => 
        o.orderNumber.toLowerCase().includes(query) ||
        o.collectionName.toLowerCase().includes(query) ||
        (o.alternativeName && o.alternativeName.toLowerCase().includes(query))
      );
    }
    
    // Sort alphabetically by collection name
    return orders.sort((a, b) => 
      a.collectionName.localeCompare(b.collectionName)
    );
  }, [getOrdersByStatus, dateFilter, locationFilter, searchQuery, today]);

  // Orders filtered by print location
  const printableOrders = useMemo(() => {
    if (printLocation === 'all') return pendingOrders;
    return pendingOrders.filter(o => o.collectionLocation === printLocation);
  }, [pendingOrders, printLocation]);

  // Print preview
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
            
            /* Hide everything except the print preview */
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
            
            .cake-card {
              flex: 1 1 50% !important;
              max-width: calc(50% - 3mm) !important;
              height: 180mm !important;
              overflow: hidden !important;
              border: 1px solid #ccc !important;
              padding: 4mm !important;
              box-sizing: border-box !important;
            }
            
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
          `}
        </style>
        <div className="print-preview-wrapper fixed inset-0 bg-background z-50 overflow-auto">
          {/* Controls - not printed */}
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
            <div className="flex gap-2">
              <div className="flex items-center gap-2 text-sm mr-4">
                <div className="w-4 h-4 rounded-sm border" style={{ backgroundColor: '#eab308' }} />
                <span>Wilmslow</span>
                <div className="w-4 h-4 rounded-sm border ml-2" style={{ backgroundColor: '#3b82f6' }} />
                <span>Manchester</span>
              </div>
              <Button onClick={() => window.print()}>
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            </div>
          </div>
          
          <div id="cake-print-area" className="p-4">
            <header className="text-center mb-6 print:hidden">
              <h1 className="text-2xl font-bold">Cake Collection Sheet</h1>
              <p className="text-lg">
                {dateFilter === 'today' ? format(new Date(), 'EEEE, dd/MM/yyyy') : 'All Dates'}
                {printLocation !== 'all' && ` • ${printLocation}`}
              </p>
              <p className="text-muted-foreground">
                Generated: {format(new Date(), 'dd/MM/yyyy HH:mm')} • {printableOrders.length} orders
              </p>
            </header>
            
            {/* Cake pages - 2 cakes per page */}
            {Array.from({ length: Math.ceil(printableOrders.length / 2) }).map((_, pageIndex) => {
              const pageOrders = printableOrders.slice(pageIndex * 2, pageIndex * 2 + 2);
              return (
                <div key={pageIndex} className="cake-page flex gap-4 mb-4">
                  {pageOrders.map((order) => (
                    <CakeCard key={order.id} order={order} />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <Clock className="w-8 h-8 text-warning" />
            Pending Orders
          </h1>
          <p className="text-lg text-muted-foreground">
            {pendingOrders.length} orders waiting to be collected
          </p>
        </div>
        <div className="flex gap-2">
          <ShopifySyncButton />
        </div>
      </header>

      {/* Print Section */}
      {pendingOrders.length > 0 && (
        <div className="p-4 bg-secondary rounded-lg">
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
          <Button 
            onClick={() => setShowPrintPreview(true)} 
            className="w-full sm:w-auto"
            disabled={printableOrders.length === 0}
          >
            <Printer className="w-4 h-4 mr-2" />
            Print {printableOrders.length} Cake Sheets
          </Button>
        </div>
      )}

      {/* Search */}
      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Filter by name or order number..."
      />

      {/* Filters */}
      <OrderFilters
        dateFilter={dateFilter}
        locationFilter={locationFilter}
        onDateChange={setDateFilter}
        onLocationChange={setLocationFilter}
      />

      {/* Orders List */}
      {pendingOrders.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Clock className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-xl">No pending orders match your filters</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {pendingOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
