import { useState, useMemo } from 'react';
import { useOrders } from '@/context/OrderContext';
import { OrderCard } from '@/components/OrderCard';
import { OrderFilters } from '@/components/OrderFilters';
import { SearchBar } from '@/components/SearchBar';
import { CollectionDate, LocationFilter } from '@/types/order';
import { Clock } from 'lucide-react';

export default function PendingOrders() {
  const [dateFilter, setDateFilter] = useState<CollectionDate>('all');
  const [locationFilter, setLocationFilter] = useState<LocationFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { getOrdersByStatus } = useOrders();
  
  const pendingOrders = useMemo(() => {
    let orders = getOrdersByStatus('pending');
    
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
        o.customerFirstName.toLowerCase().includes(query) ||
        o.customerLastName.toLowerCase().includes(query)
      );
    }
    
    // Sort alphabetically by last name
    return orders.sort((a, b) => 
      `${a.customerLastName} ${a.customerFirstName}`.localeCompare(
        `${b.customerLastName} ${b.customerFirstName}`
      )
    );
  }, [getOrdersByStatus, dateFilter, locationFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <Clock className="w-8 h-8 text-warning" />
          Pending Orders
        </h1>
        <p className="text-lg text-muted-foreground">
          {pendingOrders.length} orders waiting to be collected
        </p>
      </header>

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
