import { CSVUpload } from '@/components/CSVUpload';
import { Upload } from 'lucide-react';

export default function UploadPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <Upload className="w-8 h-8 text-primary" />
          Upload Orders
        </h1>
        <p className="text-lg text-muted-foreground">
          Import your Christmas collection orders from a CSV file
        </p>
      </header>

      <CSVUpload />
    </div>
  );
}
