import { CSVUpload } from '@/components/CSVUpload';
import { ManualOrderForm } from '@/components/ManualOrderForm';
import { Upload, FileText, UserPlus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function UploadPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <Upload className="w-8 h-8 text-primary" />
          Add Orders
        </h1>
        <p className="text-lg text-muted-foreground">
          Import orders from CSV or add them manually
        </p>
      </header>

      <Tabs defaultValue="csv" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-14 text-lg">
          <TabsTrigger value="csv" className="text-base py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <FileText className="w-5 h-5 mr-2" />
            CSV Upload
          </TabsTrigger>
          <TabsTrigger value="manual" className="text-base py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <UserPlus className="w-5 h-5 mr-2" />
            Manual Entry
          </TabsTrigger>
        </TabsList>
        <TabsContent value="csv" className="mt-6">
          <CSVUpload />
        </TabsContent>
        <TabsContent value="manual" className="mt-6">
          <ManualOrderForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}
