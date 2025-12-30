import { useState, useMemo } from 'react';
import { useOrders } from '@/context/OrderContext';
import { SearchBar } from '@/components/SearchBar';
import { OrderCard } from '@/components/OrderCard';
import { ShopifySyncButton } from '@/components/ShopifySyncButton';
import { Link } from 'react-router-dom';
import { Upload, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OrderLookup() {
  const [searchQuery, setSearchQuery] = useState('');
  const { searchOrders, orders, getRemainingCount } = useOrders();
  
  const results = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchOrders(searchQuery);
  }, [searchQuery, searchOrders]);

  const remaining = getRemainingCount();

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <div className="text-8xl mb-6">🐝</div>
        <h1 className="text-3xl font-bold mb-4">Welcome to Buzzy Bee</h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-md">
          Upload your Christmas orders CSV to get started with collections.
        </p>
        <Link to="/upload">
          <Button size="lg" className="text-xl py-8 px-12">
            <Upload className="w-6 h-6 mr-3" />
            Upload Orders CSV
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <h1 className="text-3xl font-bold mb-2">Order Lookup</h1>
        <p className="text-lg text-muted-foreground">
          Search by customer name or order number
        </p>
      </header>

      {/* Countdown Banner */}
      <div className="countdown-indicator flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Orders Remaining</p>
          <p className="text-4xl font-bold text-primary">{remaining}</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <ShopifySyncButton />
          <Link to="/pending">
            <Button variant="outline" size="lg">
              View All Pending
            </Button>
          </Link>
        </div>
      </div>

      {/* Search Bar */}
      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Type customer name or order number..."
      />

      {/* Results */}
      {searchQuery.trim() ? (
        <div className="space-y-4">
          <p className="text-lg text-muted-foreground">
            {results.length === 0 
              ? 'No orders found' 
              : `Found ${results.length} order${results.length !== 1 ? 's' : ''}`
            }
          </p>
          
          <div className="grid gap-4">
            {results.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <Search className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-xl">Start typing to search for orders</p>
        </div>
      )}
    </div>
  );
}
