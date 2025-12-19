import { PrintView } from '@/components/PrintView';
import { Printer } from 'lucide-react';

export default function PrintPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="no-print">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <Printer className="w-8 h-8 text-primary" />
          Print Mode
        </h1>
        <p className="text-lg text-muted-foreground">
          Generate printable order lists for emergency backup
        </p>
      </header>

      <PrintView />
    </div>
  );
}
