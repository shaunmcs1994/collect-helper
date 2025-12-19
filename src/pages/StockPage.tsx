import { StockDashboard } from '@/components/StockDashboard';
import { BarChart3 } from 'lucide-react';

export default function StockPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-primary" />
          Stock Dashboard
        </h1>
        <p className="text-lg text-muted-foreground">
          Live product totals and collection progress
        </p>
      </header>

      <StockDashboard />
    </div>
  );
}
