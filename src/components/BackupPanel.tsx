import { useOrders } from '@/context/OrderContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, RotateCcw, Save, Trash2, Clock } from 'lucide-react';
import { exportOrdersToCSV } from '@/utils/csvParser';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function BackupPanel() {
  const { orders, backups, createBackup, restoreBackup, downloadBackup, clearAllData } = useOrders();

  const handleExportCSV = () => {
    const csvContent = exportOrdersToCSV(orders);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `buzzy_bee_orders_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <Card className="p-5">
        <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            onClick={createBackup}
            variant="outline"
            size="lg"
            className="text-lg py-6"
            disabled={orders.length === 0}
          >
            <Save className="w-5 h-5 mr-2" />
            Create Backup Now
          </Button>
          
          <Button
            onClick={downloadBackup}
            variant="outline"
            size="lg"
            className="text-lg py-6"
            disabled={orders.length === 0}
          >
            <Download className="w-5 h-5 mr-2" />
            Download JSON Backup
          </Button>
          
          <Button
            onClick={handleExportCSV}
            variant="outline"
            size="lg"
            className="text-lg py-6"
            disabled={orders.length === 0}
          >
            <Download className="w-5 h-5 mr-2" />
            Export to CSV
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="lg"
                className="text-lg py-6 text-destructive hover:text-destructive border-destructive/30 hover:border-destructive hover:bg-destructive/5"
                disabled={orders.length === 0}
              >
                <Trash2 className="w-5 h-5 mr-2" />
                Clear All Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-2xl text-destructive">
                  ⚠️ Clear All Orders?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-lg">
                  This will remove all {orders.length} orders from the system.
                  <br /><br />
                  A backup will be created automatically before clearing.
                  <br /><br />
                  <strong>This action cannot be undone.</strong>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-col sm:flex-row gap-3">
                <AlertDialogCancel className="text-lg py-6">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={clearAllData}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-lg py-6"
                >
                  Yes, Clear All Data
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </Card>

      {/* Auto-save Info */}
      <Card className="p-5 bg-success/5 border-success/20">
        <div className="flex items-start gap-3">
          <Clock className="w-6 h-6 text-success flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-success mb-1">Auto-Backup Active</h4>
            <p className="text-muted-foreground">
              Your data is automatically saved every 5 minutes and stored locally.
              Up to 10 backups are kept.
            </p>
          </div>
        </div>
      </Card>

      {/* Backup History */}
      <Card className="p-5">
        <h3 className="text-lg font-bold mb-4">Backup History</h3>
        
        {backups.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No backups yet. Backups are created automatically every 5 minutes.
          </p>
        ) : (
          <div className="space-y-3">
            {backups.map((backup) => (
              <div
                key={backup.id}
                className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg"
              >
                <div>
                  <p className="font-medium">
                    {new Date(backup.timestamp).toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {backup.orderCount} orders
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="lg">
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Restore
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-xl">
                        Restore This Backup?
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-lg">
                        This will restore {backup.orderCount} orders from{' '}
                        {new Date(backup.timestamp).toLocaleString()}.
                        <br /><br />
                        Your current data will be replaced.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-3">
                      <AlertDialogCancel className="text-lg py-6">Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => restoreBackup(backup.id)}
                        className="text-lg py-6"
                      >
                        Yes, Restore Backup
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
