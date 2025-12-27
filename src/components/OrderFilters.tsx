import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useOrders } from '@/context/OrderContext';
import { CollectionDate, LocationFilter } from '@/types/order';
import { CalendarIcon, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

// Format ISO date to UK format DD/MM/YYYY
function formatDateUK(isoDate: string): string {
  try {
    return format(parseISO(isoDate), 'dd/MM/yyyy');
  } catch {
    return isoDate;
  }
}

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
  const { getLocations, getAvailableDates } = useOrders();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const locations = getLocations();
  const availableDates = getAvailableDates();

  const today = format(new Date(), 'yyyy-MM-dd');

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      onDateChange(format(date, 'yyyy-MM-dd'));
      setCalendarOpen(false);
    }
  };

  const getDateLabel = () => {
    if (dateFilter === 'all') return 'All Dates';
    if (dateFilter === 'today') return 'Today';
    try {
      return formatDateUK(dateFilter);
    } catch {
      return dateFilter;
    }
  };

  // Highlight dates that have orders
  const hasOrders = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return availableDates.includes(dateStr);
  };

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
            variant={dateFilter === 'today' || dateFilter === today ? 'default' : 'outline'}
            onClick={() => onDateChange('today')}
            size="lg"
            className="text-base"
          >
            Today
          </Button>
          
          {/* Date Picker */}
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={dateFilter !== 'all' && dateFilter !== 'today' && dateFilter !== today ? 'default' : 'outline'}
                size="lg"
                className={cn(
                  "text-base gap-2",
                  dateFilter !== 'all' && dateFilter !== 'today' && dateFilter !== today && "pr-2"
                )}
              >
                <CalendarIcon className="w-4 h-4" />
                {dateFilter !== 'all' && dateFilter !== 'today' && dateFilter !== today 
                  ? getDateLabel() 
                  : 'Pick Date'}
                {dateFilter !== 'all' && dateFilter !== 'today' && dateFilter !== today && (
                  <X 
                    className="w-4 h-4 ml-1 hover:text-destructive" 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDateChange('all');
                    }}
                  />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateFilter !== 'all' && dateFilter !== 'today' ? new Date(dateFilter) : undefined}
                onSelect={handleDateSelect}
                className={cn("p-3 pointer-events-auto")}
                modifiers={{ hasOrders }}
                modifiersStyles={{ 
                  hasOrders: { 
                    backgroundColor: 'hsl(var(--primary) / 0.2)',
                    fontWeight: 'bold'
                  } 
                }}
              />
              <div className="px-3 pb-3 text-xs text-muted-foreground">
                Highlighted dates have orders
              </div>
            </PopoverContent>
          </Popover>
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
