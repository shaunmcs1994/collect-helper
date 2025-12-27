import { CakePrintView } from '@/components/CakePrintView';
import { Cake } from 'lucide-react';

export default function CakePrintPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="no-print">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <Cake className="w-8 h-8 text-primary" />
          Daily Cake Print
        </h1>
        <p className="text-lg text-muted-foreground">
          Print detailed cake breakdown sheets - 2 cakes per A4 page
        </p>
      </header>

      <CakePrintView />
    </div>
  );
}
