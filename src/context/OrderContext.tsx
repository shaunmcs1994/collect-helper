import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Order, Backup, StockItem } from '@/types/order';
import { toast } from '@/hooks/use-toast';

interface OrderContextType {
  orders: Order[];
  backups: Backup[];
  isLoading: boolean;
  importOrders: (orders: Order[]) => void;
  markAsCollected: (orderId: string, collectedBy?: string) => void;
  getOrdersByStatus: (status: 'pending' | 'collected') => Order[];
  searchOrders: (query: string) => Order[];
  getStockSummary: () => StockItem[];
  getRemainingCount: (date?: '23' | '24') => number;
  getLocations: () => string[];
  createBackup: () => void;
  restoreBackup: (backupId: string) => void;
  downloadBackup: () => void;
  clearAllData: () => void;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

const STORAGE_KEY = 'buzzy_bee_orders';
const BACKUP_KEY = 'buzzy_bee_backups';
const MAX_BACKUPS = 10;
const AUTO_BACKUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function OrderProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load data from localStorage on mount
  useEffect(() => {
    try {
      const savedOrders = localStorage.getItem(STORAGE_KEY);
      const savedBackups = localStorage.getItem(BACKUP_KEY);
      
      if (savedOrders) {
        setOrders(JSON.parse(savedOrders));
      }
      if (savedBackups) {
        setBackups(JSON.parse(savedBackups));
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Warning",
        description: "Could not load saved data. Starting fresh.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save orders to localStorage whenever they change
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    }
  }, [orders, isLoading]);

  // Save backups to localStorage
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(BACKUP_KEY, JSON.stringify(backups));
    }
  }, [backups, isLoading]);

  // Auto-backup every 5 minutes
  useEffect(() => {
    if (orders.length === 0) return;

    const interval = setInterval(() => {
      createBackupInternal();
    }, AUTO_BACKUP_INTERVAL);

    return () => clearInterval(interval);
  }, [orders]);

  const createBackupInternal = useCallback(() => {
    if (orders.length === 0) return;

    const newBackup: Backup = {
      id: `backup_${Date.now()}`,
      timestamp: new Date().toISOString(),
      orderCount: orders.length,
      data: [...orders],
    };

    setBackups(prev => {
      const updated = [newBackup, ...prev].slice(0, MAX_BACKUPS);
      return updated;
    });
  }, [orders]);

  const importOrders = useCallback((newOrders: Order[]) => {
    // Create backup before import
    if (orders.length > 0) {
      createBackupInternal();
    }
    setOrders(newOrders);
    toast({
      title: "Orders Imported",
      description: `Successfully imported ${newOrders.length} orders.`,
    });
  }, [orders, createBackupInternal]);

  const markAsCollected = useCallback((orderId: string, collectedBy?: string) => {
    setOrders(prev => prev.map(order => {
      if (order.id === orderId && order.status === 'pending') {
        return {
          ...order,
          status: 'collected' as const,
          collectedAt: new Date().toISOString(),
          collectedBy: collectedBy || 'Staff',
        };
      }
      return order;
    }));
  }, []);

  const getOrdersByStatus = useCallback((status: 'pending' | 'collected') => {
    return orders.filter(order => order.status === status);
  }, [orders]);

  const searchOrders = useCallback((query: string) => {
    if (!query.trim()) return orders;
    
    const lowerQuery = query.toLowerCase().trim();
    return orders.filter(order => 
      order.orderNumber.toLowerCase().includes(lowerQuery) ||
      order.customerFirstName.toLowerCase().includes(lowerQuery) ||
      order.customerLastName.toLowerCase().includes(lowerQuery) ||
      `${order.customerFirstName} ${order.customerLastName}`.toLowerCase().includes(lowerQuery)
    );
  }, [orders]);

  const getStockSummary = useCallback((): StockItem[] => {
    const stockMap = new Map<string, StockItem>();

    orders.forEach(order => {
      order.products.forEach(product => {
        const existing = stockMap.get(product.name) || {
          productName: product.name,
          totalOrdered: 0,
          totalCollected: 0,
          remaining: 0,
        };

        existing.totalOrdered += product.quantity;
        if (order.status === 'collected') {
          existing.totalCollected += product.quantity;
        }
        existing.remaining = existing.totalOrdered - existing.totalCollected;

        stockMap.set(product.name, existing);
      });
    });

    return Array.from(stockMap.values()).sort((a, b) => 
      a.productName.localeCompare(b.productName)
    );
  }, [orders]);

  const getRemainingCount = useCallback((date?: '23' | '24') => {
    return orders.filter(order => {
      const matchesDate = !date || order.collectionDate === date;
      return order.status === 'pending' && matchesDate;
    }).length;
  }, [orders]);

  const getLocations = useCallback(() => {
    const locations = new Set(orders.map(o => o.collectionLocation));
    return Array.from(locations).sort();
  }, [orders]);

  const createBackup = useCallback(() => {
    createBackupInternal();
    toast({
      title: "Backup Created",
      description: "Manual backup saved successfully.",
    });
  }, [createBackupInternal]);

  const restoreBackup = useCallback((backupId: string) => {
    const backup = backups.find(b => b.id === backupId);
    if (backup) {
      setOrders(backup.data);
      toast({
        title: "Backup Restored",
        description: `Restored ${backup.orderCount} orders from ${new Date(backup.timestamp).toLocaleString()}.`,
      });
    }
  }, [backups]);

  const downloadBackup = useCallback(() => {
    const dataStr = JSON.stringify(orders, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `buzzy_bee_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Backup Downloaded",
      description: "Your backup file has been downloaded.",
    });
  }, [orders]);

  const clearAllData = useCallback(() => {
    createBackupInternal();
    setOrders([]);
    toast({
      title: "Data Cleared",
      description: "All orders have been cleared. A backup was created.",
    });
  }, [createBackupInternal]);

  return (
    <OrderContext.Provider value={{
      orders,
      backups,
      isLoading,
      importOrders,
      markAsCollected,
      getOrdersByStatus,
      searchOrders,
      getStockSummary,
      getRemainingCount,
      getLocations,
      createBackup,
      restoreBackup,
      downloadBackup,
      clearAllData,
    }}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrders() {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrders must be used within an OrderProvider');
  }
  return context;
}
