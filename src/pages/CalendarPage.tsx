import { OrderCalendar } from '@/components/OrderCalendar';
import { CalendarDays } from 'lucide-react';

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <CalendarDays className="w-8 h-8 text-primary" />
          Order Calendar
        </h1>
        <p className="text-lg text-muted-foreground">
          View all orders by date - click any day to see full order details
        </p>
      </header>

      <OrderCalendar />
    </div>
  );
}
