import { useState, useMemo } from 'react';
import { useOrders } from '@/context/OrderContext';
import { OrderCard } from '@/components/OrderCard';
import { OrderFilters } from '@/components/OrderFilters';
import { SearchBar } from '@/components/SearchBar';
import { CollectionDate, LocationFilter } from '@/types/order';
import { CheckCircle } from 'lucide-react';

export default function CollectedOrders() {
  const [dateFilter, setDateFilter] = useState<CollectionDate>('all');
  const [locationFilter, setLocationFilter] = useState<LocationFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { getOrdersByStatus } = useOrders();
  
  const collectedOrders = useMemo(() => {
    let orders = getOrdersByStatus('collected');
    
    // Apply filters
    if (dateFilter !== 'all') {
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
    
    // Sort by collection time (most recent first)
    return orders.sort((a, b) => {
      if (!a.collectedAt || !b.collectedAt) return 0;
      return new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime();
    });
  }, [getOrdersByStatus, dateFilter, locationFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <CheckCircle className="w-8 h-8 text-success" />
          Collected Orders
        </h1>
        <p className="text-lg text-muted-foreground">
          {collectedOrders.length} orders have been collected
        </p>
      </header>

      {/* Info Banner */}
      <div className="p-4 bg-success/10 border border-success/20 rounded-xl">
        <p className="text-success font-medium">
          ✓ These orders are read-only and cannot be modified
        </p>
      </div>

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
      {collectedOrders.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <CheckCircle className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-xl">No collected orders match your filters</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {collectedOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
