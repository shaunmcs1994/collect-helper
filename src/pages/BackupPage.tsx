import { BackupPanel } from '@/components/BackupPanel';
import { Shield } from 'lucide-react';

export default function BackupPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <Shield className="w-8 h-8 text-primary" />
          Backup & Recovery
        </h1>
        <p className="text-lg text-muted-foreground">
          Manage backups and export your data
        </p>
      </header>

      <BackupPanel />
    </div>
  );
}
