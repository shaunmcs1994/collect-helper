import { Button } from '@/components/ui/button';
import { useOrders } from '@/context/OrderContext';
import { CollectionDate, LocationFilter } from '@/types/order';

interface OrderFiltersProps {
  dateFilter: CollectionDate;
  locationFilter: LocationFilter;
  onDateChange: (date: CollectionDate) => void;
  onLocationChange: (location: LocationFilter) => void;
}

export function OrderFilters({ 
  dateFilter, 
  locationFilter, 
  onDateChange, 
  onLocationChange 
}: OrderFiltersProps) {
  const { getLocations } = useOrders();
  const locations = getLocations();

  return (
    <div className="space-y-4 p-4 bg-secondary/50 rounded-xl">
      <div>
        <label className="block text-sm font-semibold mb-2 uppercase tracking-wide text-muted-foreground">
          Collection Date
        </label>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={dateFilter === 'all' ? 'default' : 'outline'}
            onClick={() => onDateChange('all')}
            size="lg"
            className="text-base"
          >
            All Dates
          </Button>
          <Button
            variant={dateFilter === '23' ? 'default' : 'outline'}
            onClick={() => onDateChange('23')}
            size="lg"
            className="text-base"
          >
            Dec 23
          </Button>
          <Button
            variant={dateFilter === '24' ? 'default' : 'outline'}
            onClick={() => onDateChange('24')}
            size="lg"
            className="text-base"
          >
            Dec 24
          </Button>
        </div>
      </div>

      {locations.length > 0 && (
        <div>
          <label className="block text-sm font-semibold mb-2 uppercase tracking-wide text-muted-foreground">
            Location
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={locationFilter === 'all' ? 'default' : 'outline'}
              onClick={() => onLocationChange('all')}
              size="lg"
              className="text-base"
            >
              All Locations
            </Button>
            {locations.map((loc) => (
              <Button
                key={loc}
                variant={locationFilter === loc ? 'default' : 'outline'}
                onClick={() => onLocationChange(loc)}
                size="lg"
                className="text-base"
              >
                {loc}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
