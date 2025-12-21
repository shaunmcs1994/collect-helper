import { useOrders } from '@/context/OrderContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Printer, ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { CollectionDate, LocationFilter } from '@/types/order';

export function PrintView() {
  const { getOrdersByStatus, getLocations } = useOrders();
  const [dateFilter, setDateFilter] = useState<CollectionDate>('all');
  const [locationFilter, setLocationFilter] = useState<LocationFilter>('all');
  const [showPreview, setShowPreview] = useState(false);
  
  const locations = getLocations();
  const pendingOrders = getOrdersByStatus('pending')
    .filter(order => dateFilter === 'all' || order.collectionDate === dateFilter)
    .filter(order => locationFilter === 'all' || order.collectionLocation === locationFilter)
    .sort((a, b) => a.collectionName.toLowerCase().localeCompare(b.collectionName.toLowerCase()));

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
          <Button onClick={handlePrint} className="btn-collect">
            <Printer className="w-5 h-5 mr-2" />
            Print This List
          </Button>
        </div>

        {/* Printable content */}
        <div className="print-content">
          <header className="text-center mb-8">
            <h1 className="text-3xl font-bold">Buzzy Bee Christmas Orders</h1>
            <p className="text-xl mt-2">
              Uncollected Orders
              {dateFilter !== 'all' && ` - December ${dateFilter}`}
              {locationFilter !== 'all' && ` - ${locationFilter}`}
            </p>
            <p className="text-muted-foreground mt-1">
              Generated: {new Date().toLocaleString()} | Total: {pendingOrders.length} orders
            </p>
          </header>

          <div className="space-y-4">
            {pendingOrders.map((order) => (
              <div key={order.id} className="card-order">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h2 className="text-xl font-bold">
                      {order.collectionName}
                    </h2>
                    {order.alternativeName && (
                      <p className="text-muted-foreground">Alt: {order.alternativeName}</p>
                    )}
                    <p className="text-muted-foreground">Order #{order.orderNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">Dec {order.collectionDate}</p>
                    <p className="text-muted-foreground">{order.collectionLocation}</p>
                  </div>
                </div>
                
                <div className="border-t pt-3">
                  <h3 className="font-semibold mb-2">Products:</h3>
                  <ul className="space-y-1">
                    {order.products.map((product, i) => (
                      <li key={i} className="flex justify-between">
                        <span>{product.name}</span>
                        <span className="font-bold">×{product.quantity}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Checkbox for manual tracking */}
                <div className="mt-4 pt-3 border-t flex items-center gap-3">
                  <div className="w-6 h-6 border-2 border-foreground rounded"></div>
                  <span className="text-muted-foreground">Collected</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-6">Emergency Print Mode</h2>
      <p className="text-muted-foreground mb-6">
        Generate a printable list of uncollected orders. Use this as a backup if devices fail.
      </p>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-2">Collection Date</label>
          <div className="flex gap-2">
            <Button
              variant={dateFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setDateFilter('all')}
              size="lg"
            >
              All Dates
            </Button>
            <Button
              variant={dateFilter === '23' ? 'default' : 'outline'}
              onClick={() => setDateFilter('23')}
              size="lg"
            >
              December 23
            </Button>
            <Button
              variant={dateFilter === '24' ? 'default' : 'outline'}
              onClick={() => setDateFilter('24')}
              size="lg"
            >
              December 24
            </Button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Location</label>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={locationFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setLocationFilter('all')}
              size="lg"
            >
              All Locations
            </Button>
            {locations.map(loc => (
              <Button
                key={loc}
                variant={locationFilter === loc ? 'default' : 'outline'}
                onClick={() => setLocationFilter(loc)}
                size="lg"
              >
                {loc}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 bg-secondary rounded-lg mb-6">
        <p className="text-lg">
          <strong>{pendingOrders.length}</strong> uncollected orders match your filters
        </p>
      </div>

      <Button
        onClick={() => setShowPreview(true)}
        className="btn-collect w-full"
        size="lg"
        disabled={pendingOrders.length === 0}
      >
        <Printer className="w-5 h-5 mr-2" />
        Generate Printable List
      </Button>
    </Card>
  );
}
