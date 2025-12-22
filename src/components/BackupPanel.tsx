import { useState } from 'react';
import { useOrders } from '@/context/OrderContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, RotateCcw, Save, Trash2, Clock, ShieldAlert } from 'lucide-react';
import { exportOrdersToCSV } from '@/utils/csvParser';
import { toast } from '@/hooks/use-toast';
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

const ADMIN_PASSWORD = 'admin123';

export function BackupPanel() {
  const { orders, backups, createBackup, restoreBackup, downloadBackup, clearAllData } = useOrders();
  const [wipePassword, setWipePassword] = useState('');
  const [wipeDialogOpen, setWipeDialogOpen] = useState(false);

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

  const handleWipeAllOrders = () => {
    if (wipePassword === ADMIN_PASSWORD) {
      clearAllData();
      setWipePassword('');
      setWipeDialogOpen(false);
      toast({
        title: "All orders wiped",
        description: "The system has been reset. A backup was created before wiping.",
      });
    } else {
      toast({
        title: "Incorrect password",
        description: "Please enter the correct admin password.",
        variant: "destructive",
      });
    }
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
          
          <AlertDialog open={wipeDialogOpen} onOpenChange={(open) => {
            setWipeDialogOpen(open);
            if (!open) setWipePassword('');
          }}>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="lg"
                className="text-lg py-6 text-destructive hover:text-destructive border-destructive/30 hover:border-destructive hover:bg-destructive/5"
                disabled={orders.length === 0}
              >
                <ShieldAlert className="w-5 h-5 mr-2" />
                Wipe All Orders
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-2xl text-destructive">
                  🔒 Wipe All Orders?
                </AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="text-lg space-y-4">
                    <p>This will remove all {orders.length} orders from the system.</p>
                    <p>A backup will be created automatically before wiping.</p>
                    <p><strong>Enter admin password to confirm:</strong></p>
                    <Input
                      type="password"
                      placeholder="Enter password"
                      value={wipePassword}
                      onChange={(e) => setWipePassword(e.target.value)}
                      className="text-lg py-6"
                    />
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-col sm:flex-row gap-3">
                <AlertDialogCancel className="text-lg py-6">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleWipeAllOrders}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-lg py-6"
                  disabled={!wipePassword}
                >
                  Wipe All Orders
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </Card>

      {/* Cloud Sync Info */}
      <Card className="p-5 bg-success/5 border-success/20">
        <div className="flex items-start gap-3">
          <Clock className="w-6 h-6 text-success flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-success mb-1">Cloud Sync Active</h4>
            <p className="text-muted-foreground">
              Your data is automatically saved to the cloud in real-time and syncs across all devices.
              Use manual backups below for additional safety.
            </p>
          </div>
        </div>
      </Card>

      {/* Backup History */}
      <Card className="p-5">
        <h3 className="text-lg font-bold mb-4">Manual Backup History</h3>
        
        {backups.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No manual backups yet. Click "Create Backup Now" to save a local copy.
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
