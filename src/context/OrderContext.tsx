import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Order, Backup, StockItem } from '@/types/order';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface OrderContextType {
  orders: Order[];
  backups: Backup[];
  isLoading: boolean;
  productEmojis: Record<string, string>;
  importOrders: (orders: Order[]) => Promise<void>;
  addOrder: (order: Order) => Promise<void>;
  markAsCollected: (orderId: string, collectedBy?: string) => Promise<void>;
  markAsPending: (orderId: string) => Promise<void>;
  getOrdersByStatus: (status: 'pending' | 'collected') => Order[];
  searchOrders: (query: string) => Order[];
  getStockSummary: () => StockItem[];
  getRemainingCount: (date?: '23' | '24') => number;
  getLocations: () => string[];
  setProductEmoji: (productName: string, emoji: string) => Promise<void>;
  createBackup: () => void;
  restoreBackup: (backupId: string) => void;
  downloadBackup: () => void;
  clearAllData: () => Promise<void>;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

const MAX_BACKUPS = 10;

export function OrderProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [productEmojis, setProductEmojis] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { user, displayName } = useAuth();

  // Load data from Supabase on mount and when user changes
  useEffect(() => {
    if (!user) {
      setOrders([]);
      setProductEmojis({});
      setIsLoading(false);
      return;
    }

    loadOrders();
    loadProductEmojis();
    
    // Set up real-time subscriptions
    const ordersChannel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('Order change received:', payload);
          // Reload orders on any change from other devices
          loadOrders();
        }
      )
      .subscribe();

    const emojisChannel = supabase
      .channel('emojis-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'product_emojis'
        },
        () => {
          loadProductEmojis();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(emojisChannel);
    };
  }, [user]);

  const loadOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedOrders: Order[] = (data || []).map(row => {
        // Extract day from collection_date (stored as YYYY-12-DD)
        const dateStr = row.collection_date;
        const day = dateStr.endsWith('23') ? '23' : '24';
        
        return {
          id: row.id,
          orderNumber: row.order_number,
          collectionName: row.customer_name,
          collectionDate: day as '23' | '24',
          collectionLocation: row.collection_location,
          pickupTime: (row as any).pickup_time || undefined,
          products: row.products as { name: string; quantity: number }[],
          status: row.status as 'pending' | 'collected',
          collectedAt: row.collected_at || undefined,
          collectedBy: row.collected_by || undefined,
        };
      });

      setOrders(mappedOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast({
        title: "Error",
        description: "Could not load orders from the database.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadProductEmojis = async () => {
    try {
      const { data, error } = await supabase
        .from('product_emojis')
        .select('*');

      if (error) throw error;

      const emojiMap: Record<string, string> = {};
      (data || []).forEach(row => {
        emojiMap[row.product_name] = row.emoji;
      });

      setProductEmojis(emojiMap);
    } catch (error) {
      console.error('Error loading product emojis:', error);
    }
  };

  const importOrders = useCallback(async (newOrders: Order[]) => {
    if (!user) return;

    try {
      // Create backup before import
      if (orders.length > 0) {
        createBackupInternal();
      }

      // Clear existing orders
      await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // Insert new orders one by one to avoid type issues
      const currentYear = new Date().getFullYear();
      for (const order of newOrders) {
        // Convert '23' or '24' to proper date format (December 23/24 of current year)
        const collectionDateStr = `${currentYear}-12-${order.collectionDate}`;
        
        const { error } = await supabase.from('orders').insert({
          order_number: order.orderNumber,
          customer_name: order.collectionName,
          collection_date: collectionDateStr,
          collection_location: order.collectionLocation,
          pickup_time: order.pickupTime || null,
          products: JSON.parse(JSON.stringify(order.products)),
          status: order.status,
          collected_at: order.collectedAt || null,
          collected_by: order.collectedBy ? user.id : null,
        } as any);
        
        if (error) throw error;
      }

      toast({
        title: "Orders Imported",
        description: `Successfully imported ${newOrders.length} orders.`,
      });

      await loadOrders();
    } catch (error) {
      console.error('Error importing orders:', error);
      toast({
        title: "Import Failed",
        description: "Could not import orders to the database.",
        variant: "destructive",
      });
    }
  }, [orders, user]);

  const addOrder = useCallback(async (order: Order) => {
    if (!user) return;

    try {
      const currentYear = new Date().getFullYear();
      const collectionDateStr = `${currentYear}-12-${order.collectionDate}`;
      
      const { error } = await supabase.from('orders').insert({
        order_number: order.orderNumber,
        customer_name: order.collectionName,
        collection_date: collectionDateStr,
        collection_location: order.collectionLocation,
        pickup_time: order.pickupTime || null,
        products: JSON.parse(JSON.stringify(order.products)),
        status: order.status,
      } as any);

      if (error) throw error;
    } catch (error) {
      console.error('Error adding order:', error);
      toast({
        title: "Error",
        description: "Could not add order.",
        variant: "destructive",
      });
    }
  }, [user]);

  const markAsCollected = useCallback(async (orderId: string, collectedBy?: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'collected',
          collected_at: new Date().toISOString(),
          collected_by: user.id,
        })
        .eq('id', orderId)
        .eq('status', 'pending');

      if (error) throw error;

      // Optimistic update for immediate feedback
      setOrders(prev => prev.map(order => {
        if (order.id === orderId && order.status === 'pending') {
          return {
            ...order,
            status: 'collected' as const,
            collectedAt: new Date().toISOString(),
            collectedBy: displayName || collectedBy || 'Staff',
          };
        }
        return order;
      }));
    } catch (error) {
      console.error('Error marking as collected:', error);
      toast({
        title: "Error",
        description: "Could not update order status.",
        variant: "destructive",
      });
    }
  }, [user, displayName]);

  const markAsPending = useCallback(async (orderId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'pending',
          collected_at: null,
          collected_by: null,
        })
        .eq('id', orderId);

      if (error) throw error;

      // Optimistic update
      setOrders(prev => prev.map(order => {
        if (order.id === orderId) {
          return {
            ...order,
            status: 'pending' as const,
            collectedAt: undefined,
            collectedBy: undefined,
          };
        }
        return order;
      }));

      toast({
        title: "Order Reverted",
        description: "Order has been moved back to pending.",
      });
    } catch (error) {
      console.error('Error marking as pending:', error);
      toast({
        title: "Error",
        description: "Could not update order status.",
        variant: "destructive",
      });
    }
  }, [user]);

  const getOrdersByStatus = useCallback((status: 'pending' | 'collected') => {
    return orders.filter(order => order.status === status);
  }, [orders]);

  const searchOrders = useCallback((query: string) => {
    if (!query.trim()) return orders;
    
    const lowerQuery = query.toLowerCase().trim();
    return orders.filter(order => 
      order.orderNumber.toLowerCase().includes(lowerQuery) ||
      order.collectionName.toLowerCase().includes(lowerQuery) ||
      (order.alternativeName && order.alternativeName.toLowerCase().includes(lowerQuery))
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
          remaining23: 0,
          remaining24: 0,
        };

        existing.totalOrdered += product.quantity;
        if (order.status === 'collected') {
          existing.totalCollected += product.quantity;
        } else {
          if (order.collectionDate === '23') {
            existing.remaining23 += product.quantity;
          } else if (order.collectionDate === '24') {
            existing.remaining24 += product.quantity;
          }
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

  const setProductEmoji = useCallback(async (productName: string, emoji: string) => {
    if (!user) return;

    try {
      // Upsert the emoji
      const { error } = await supabase
        .from('product_emojis')
        .upsert(
          { product_name: productName, emoji },
          { onConflict: 'product_name' }
        );

      if (error) throw error;

      // Optimistic update
      setProductEmojis(prev => ({
        ...prev,
        [productName]: emoji
      }));
    } catch (error) {
      console.error('Error setting product emoji:', error);
      toast({
        title: "Error",
        description: "Could not save emoji.",
        variant: "destructive",
      });
    }
  }, [user]);

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
      importOrders(backup.data);
    }
  }, [backups, importOrders]);

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

  const clearAllData = useCallback(async () => {
    if (!user) return;

    try {
      createBackupInternal();
      
      await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      setOrders([]);
      
      toast({
        title: "Data Cleared",
        description: "All orders have been cleared. A backup was created.",
      });
    } catch (error) {
      console.error('Error clearing data:', error);
      toast({
        title: "Error",
        description: "Could not clear data.",
        variant: "destructive",
      });
    }
  }, [user, createBackupInternal]);

  return (
    <OrderContext.Provider value={{
      orders,
      backups,
      isLoading,
      productEmojis,
      importOrders,
      addOrder,
      markAsCollected,
      markAsPending,
      getOrdersByStatus,
      searchOrders,
      getStockSummary,
      getRemainingCount,
      getLocations,
      setProductEmoji,
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
