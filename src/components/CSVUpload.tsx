import { useState, useRef } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { parseCSV, ParseResult } from '@/utils/csvParser';
import { useOrders } from '@/context/OrderContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function CSVUpload() {
  const [isDragging, setIsDragging] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { importOrders, orders } = useOrders();

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setParseResult({
        success: false,
        orders: [],
        errors: ['Please upload a CSV file.'],
        warnings: [],
      });
      return;
    }

    const text = await file.text();
    const result = parseCSV(text);
    setParseResult(result);

    if (result.success) {
      setShowConfirmation(true);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const confirmImport = () => {
    if (parseResult?.success) {
      importOrders(parseResult.orders);
      setParseResult(null);
    }
    setShowConfirmation(false);
  };

  const cancelImport = () => {
    setShowConfirmation(false);
    setParseResult(null);
  };

  return (
    <>
      <Card className="p-6">
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            border-3 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
            ${isDragging 
              ? 'border-primary bg-primary/5' 
              : 'border-border hover:border-primary/50 hover:bg-secondary/50'
            }
          `}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleInputChange}
            className="hidden"
          />
          
          <Upload className={`w-16 h-16 mx-auto mb-4 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
          
          <h3 className="text-xl font-bold mb-2">Upload Orders CSV</h3>
          <p className="text-muted-foreground text-lg mb-4">
            Drag and drop your CSV file here, or click to browse
          </p>
          
          <Button variant="outline" size="lg" className="text-lg py-6 px-8">
            <FileText className="w-5 h-5 mr-2" />
            Select CSV File
          </Button>
        </div>

        {/* Error display */}
        {parseResult && !parseResult.success && parseResult.errors.length > 0 && (
          <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-destructive mb-2">Upload Failed</h4>
                <ul className="space-y-1">
                  {parseResult.errors.map((error, i) => (
                    <li key={i} className="text-base">{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Required columns info */}
        <div className="mt-6 p-4 bg-secondary/50 rounded-lg">
          <h4 className="font-semibold mb-2">Required CSV Columns:</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
            <span>• Order Number</span>
            <span>• Collection Name</span>
            <span>• Collection Date</span>
            <span>• Location</span>
            <span>• Product Name</span>
            <span>• Quantity</span>
          </div>
          <h4 className="font-semibold mt-4 mb-2">Optional Columns:</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
            <span>• Alternative Name</span>
            <span>• Phone Number</span>
          </div>
        </div>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-success" />
              CSV Parsed Successfully
            </AlertDialogTitle>
            <AlertDialogDescription className="text-lg space-y-4">
              <p>
                Found <strong>{parseResult?.orders.length}</strong> orders ready to import.
              </p>
              
              {orders.length > 0 && (
                <p className="p-3 bg-warning/10 border border-warning/20 rounded-lg text-warning-foreground">
                  ⚠️ This will replace {orders.length} existing orders. A backup will be created automatically.
                </p>
              )}

              {parseResult?.warnings && parseResult.warnings.length > 0 && (
                <div className="p-3 bg-secondary rounded-lg">
                  <p className="font-medium mb-2">Warnings ({parseResult.warnings.length}):</p>
                  <ul className="text-sm space-y-1 max-h-32 overflow-y-auto">
                    {parseResult.warnings.slice(0, 5).map((warning, i) => (
                      <li key={i}>• {warning}</li>
                    ))}
                    {parseResult.warnings.length > 5 && (
                      <li>• ...and {parseResult.warnings.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-3">
            <AlertDialogCancel onClick={cancelImport} className="text-lg py-6">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmImport} className="btn-collect text-lg py-6">
              Import {parseResult?.orders.length} Orders
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
