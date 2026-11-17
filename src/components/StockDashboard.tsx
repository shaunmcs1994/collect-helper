import { useState } from 'react';
import { useOrders } from '@/context/OrderContext';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, TrendingDown, CheckCircle, Search, Download } from 'lucide-react';
import { getProductStyle } from '@/utils/productColors';
import { EmojiPicker } from '@/components/EmojiPicker';
import { toast } from 'sonner';
import { StockItem } from '@/types/order';
import { christmasDay } from '@/utils/christmas';

export function StockDashboard() {
  const { orders, productEmojis, productColors, setProductEmoji, setProductColor } = useOrders();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeLocation, setActiveLocation] = useState<string>('all');

  // Filter orders by location
  const getFilteredOrders = (location: string) => {
    if (location === 'all') return orders;
    return orders.filter(o => o.collectionLocation.toLowerCase() === location.toLowerCase());
  };

  // Calculate stock summary for filtered orders
  const getStockSummaryForLocation = (location: string): StockItem[] => {
    const filteredOrders = getFilteredOrders(location);
    const stockMap = new Map<string, StockItem>();

    filteredOrders.forEach(order => {
      order.products.forEach(product => {
        const existing = stockMap.get(product.name) || {
          productName: product.name,
          totalOrdered: 0,
          totalCollected: 0,
          remaining: 0,
          remaining23: 0,
          remaining24: 0,
          remainingWilmslow: 0,
          remainingManchester: 0,
        };

        existing.totalOrdered += product.quantity;
        if (order.status === 'collected') {
          existing.totalCollected += product.quantity;
        } else {
          if (christmasDay(order.collectionDate) === '23') {
            existing.remaining23 += product.quantity;
          } else if (christmasDay(order.collectionDate) === '24') {
            existing.remaining24 += product.quantity;
          }
          // Track remaining by location
          if (order.collectionLocation.toLowerCase() === 'wilmslow') {
            existing.remainingWilmslow += product.quantity;
          } else if (order.collectionLocation.toLowerCase() === 'manchester') {
            existing.remainingManchester += product.quantity;
          }
        }
        existing.remaining = existing.totalOrdered - existing.totalCollected;

        stockMap.set(product.name, existing);
      });
    });

    return Array.from(stockMap.values()).sort((a, b) => 
      a.productName.localeCompare(b.productName)
    );
  };

  // Calculate remaining count for filtered orders
  const getRemainingForLocation = (location: string, date?: '23' | '24') => {
    const filteredOrders = getFilteredOrders(location);
    return filteredOrders.filter(order => {
      const matchesDate = !date || christmasDay(order.collectionDate) === date;
      return order.status === 'pending' && matchesDate;
    }).length;
  };

  const filteredOrders = getFilteredOrders(activeLocation);
  const stockItems = getStockSummaryForLocation(activeLocation);
  const remaining23 = getRemainingForLocation(activeLocation, '23');
  const remaining24 = getRemainingForLocation(activeLocation, '24');
  const totalRemaining = getRemainingForLocation(activeLocation);
  const totalCollected = filteredOrders.filter(o => o.status === 'collected').length;

  const filteredStockItems = stockItems.filter(item =>
    item.productName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportStockList = () => {
    const headers = ['Product', 'Ordered', 'Collected', 'Remaining', 'Wilmslow', 'Manchester', '23rd', '24th'];
    const rows = stockItems.map(item => [
      item.productName,
      item.totalOrdered,
      item.totalCollected,
      item.remaining,
      item.remainingWilmslow,
      item.remainingManchester,
      item.remaining23,
      item.remaining24
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-levels-${activeLocation}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Stock list exported successfully');
  };

  if (orders.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-xl font-bold mb-2">No Orders Yet</h3>
        <p className="text-muted-foreground">Upload a CSV to see stock levels.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Location Tabs */}
      <Tabs value={activeLocation} onValueChange={setActiveLocation} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-14">
          <TabsTrigger value="all" className="text-lg font-medium">
            All Locations
          </TabsTrigger>
          <TabsTrigger value="wilmslow" className="text-lg font-medium">
            Wilmslow
          </TabsTrigger>
          <TabsTrigger value="manchester" className="text-lg font-medium">
            Manchester
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeLocation} className="mt-6 space-y-6">
          {/* Countdown Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="countdown-indicator">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-1">
                {activeLocation === 'all' ? 'Total Remaining' : `${activeLocation.charAt(0).toUpperCase() + activeLocation.slice(1)} Remaining`}
              </p>
              <p className="text-5xl font-bold text-primary">{totalRemaining}</p>
              <p className="text-base text-muted-foreground mt-1">orders to collect</p>
            </div>
            
            <div className="stat-card">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-1">
                December 23rd
              </p>
              <p className="text-4xl font-bold text-foreground">{remaining23}</p>
              <p className="text-base text-muted-foreground mt-1">remaining</p>
            </div>
            
            <div className="stat-card">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-1">
                December 24th
              </p>
              <p className="text-4xl font-bold text-foreground">{remaining24}</p>
              <p className="text-base text-muted-foreground mt-1">remaining</p>
            </div>
          </div>

          {/* Collection Progress */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Collection Progress</h3>
              <span className="text-2xl font-bold text-success">
                {totalCollected} / {filteredOrders.length}
              </span>
            </div>
            <div className="h-4 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-success transition-all duration-500 ease-out"
                style={{ width: `${filteredOrders.length > 0 ? (totalCollected / filteredOrders.length) * 100 : 0}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {filteredOrders.length > 0 ? Math.round((totalCollected / filteredOrders.length) * 100) : 0}% complete
            </p>
          </Card>

          {/* Product Stock Levels */}
          <Card className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Package className="w-5 h-5" />
                Product Stock Levels
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  (click emoji to customize)
                </span>
              </h3>
              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={exportStockList}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
            
            <div className="space-y-3">
              {filteredStockItems.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {searchTerm ? `No products found matching "${searchTerm}"` : 'No products for this location'}
                </p>
              ) : (
                filteredStockItems.map((item) => {
                  const style = getProductStyle(item.productName, productEmojis, productColors);
                  
                  return (
                    <div
                      key={item.productName}
                      className={`p-4 rounded-lg border-2 ${style.customColor ? '' : style.colorClass}`}
                      style={style.customColor ? { 
                        backgroundColor: style.customColor.bg, 
                        borderColor: style.customColor.border 
                      } : undefined}
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex items-center gap-2">
                          <EmojiPicker
                            currentEmoji={style.emoji}
                            currentColor={style.customColor}
                            productName={item.productName}
                            onSelectEmoji={(emoji) => setProductEmoji(item.productName, emoji)}
                            onSelectColor={(color) => setProductColor(item.productName, color)}
                          />
                          <h4 className="text-lg font-semibold">{item.productName}</h4>
                        </div>
                        {item.remaining === 0 ? (
                          <span className="flex items-center gap-1 text-success font-medium">
                            <CheckCircle className="w-5 h-5" />
                            Complete
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-warning-foreground font-medium">
                            <TrendingDown className="w-5 h-5" />
                            {item.remaining} left
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-7 gap-2 text-center">
                        <div className="p-2 bg-card rounded">
                          <p className="text-xl font-bold">{item.totalOrdered}</p>
                          <p className="text-xs text-muted-foreground uppercase">Ordered</p>
                        </div>
                        <div className="p-2 bg-success/10 rounded">
                          <p className="text-xl font-bold text-success">{item.totalCollected}</p>
                          <p className="text-xs text-muted-foreground uppercase">Collected</p>
                        </div>
                        <div className={`p-2 rounded ${item.remaining > 0 ? 'bg-warning/10' : 'bg-success/10'}`}>
                          <p className={`text-xl font-bold ${item.remaining > 0 ? 'text-warning-foreground' : 'text-success'}`}>
                            {item.remaining}
                          </p>
                          <p className="text-xs text-muted-foreground uppercase">Remaining</p>
                        </div>
                        <div className="p-2 bg-blue-500/10 rounded">
                          <p className="text-xl font-bold text-blue-600">{item.remainingWilmslow}</p>
                          <p className="text-xs text-muted-foreground uppercase">Wilmslow</p>
                        </div>
                        <div className="p-2 bg-purple-500/10 rounded">
                          <p className="text-xl font-bold text-purple-600">{item.remainingManchester}</p>
                          <p className="text-xs text-muted-foreground uppercase">Manchester</p>
                        </div>
                        <div className="p-2 bg-primary/10 rounded">
                          <p className="text-xl font-bold text-primary">{item.remaining23}</p>
                          <p className="text-xs text-muted-foreground uppercase">23rd</p>
                        </div>
                        <div className="p-2 bg-primary/10 rounded">
                          <p className="text-xl font-bold text-primary">{item.remaining24}</p>
                          <p className="text-xs text-muted-foreground uppercase">24th</p>
                        </div>
                      </div>
                      
                      {/* Progress bar */}
                      <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-success transition-all duration-300"
                          style={{ width: `${item.totalOrdered > 0 ? (item.totalCollected / item.totalOrdered) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
