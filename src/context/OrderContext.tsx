import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Order, Backup, StockItem } from '@/types/order';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

interface SyncWarnings {
  missingDateTag: Array<{ orderNumber: string; tags: string; customerName: string }>;
  alreadyCollected: Array<{ orderNumber: string; tags: string; customerName: string }>;
  syncError: Array<{ orderNumber: string; tags: string; customerName: string }>;
}

interface OrderContextType {
  orders: Order[];
  backups: Backup[];
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncTime: string | null;
  syncWarnings: SyncWarnings | null;
  productEmojis: Record<string, string>;
  productColors: Record<string, string>;
  getDisplayName: (userId: string) => string;
  importOrders: (orders: Order[]) => Promise<void>;
  addOrder: (order: Order) => Promise<void>;
  markAsCollected: (orderId: string, collectedBy?: string) => Promise<void>;
  markAsPending: (orderId: string) => Promise<void>;
  getOrdersByStatus: (status: 'pending' | 'collected') => Order[];
  searchOrders: (query: string) => Order[];
  getStockSummary: () => StockItem[];
  getRemainingCount: (date?: string) => number;
  getLocations: () => string[];
  getAvailableDates: () => string[];
  setProductEmoji: (productName: string, emoji: string) => Promise<void>;
  setProductColor: (productName: string, color: { bg: string; border: string }) => Promise<void>;
  createBackup: () => void;
  restoreBackup: (backupId: string) => void;
  downloadBackup: () => void;
  clearAllData: () => Promise<void>;
  syncWithShopify: () => Promise<void>;
  clearSyncWarnings: () => void;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

const MAX_BACKUPS = 10;

export function OrderProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [productEmojis, setProductEmojis] = useState<Record<string, string>>({});
  const [productColors, setProductColors] = useState<Record<string, string>>({});
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncWarnings, setSyncWarnings] = useState<SyncWarnings | null>(null);
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
    loadProfiles();
    
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
        return {
          id: row.id,
          orderNumber: row.order_number,
          collectionName: row.customer_name,
          collectionDate: row.collection_date, // Now stored as full date YYYY-MM-DD
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
      const colorMap: Record<string, string> = {};
      (data || []).forEach(row => {
        emojiMap[row.product_name] = row.emoji;
        if ((row as any).color) {
          colorMap[row.product_name] = (row as any).color;
        }
      });

      setProductEmojis(emojiMap);
      setProductColors(colorMap);
    } catch (error) {
      console.error('Error loading product emojis:', error);
    }
  };

  const loadProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name');

      if (error) throw error;

      const profileMap: Record<string, string> = {};
      (data || []).forEach(row => {
        if (row.display_name) {
          profileMap[row.user_id] = row.display_name;
        }
      });

      setProfiles(profileMap);
    } catch (error) {
      console.error('Error loading profiles:', error);
    }
  };

  const getDisplayName = useCallback((userId: string): string => {
    return profiles[userId] || 'Staff';
  }, [profiles]);

  const importOrders = useCallback(async (newOrders: Order[]) => {
    if (!user) return;

    try {
      // Create backup before import
      if (orders.length > 0) {
        createBackupInternal();
      }

      // Clear existing orders
      await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // Insert new orders
      for (const order of newOrders) {
        // Handle both old format ('23', '24') and new format (YYYY-MM-DD)
        let collectionDateStr = order.collectionDate;
        if (collectionDateStr === '23' || collectionDateStr === '24') {
          const currentYear = new Date().getFullYear();
          collectionDateStr = `${currentYear}-12-${collectionDateStr}`;
        }
        
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
      // Handle both old format ('23', '24') and new format (YYYY-MM-DD)
      let collectionDateStr = order.collectionDate;
      if (collectionDateStr === '23' || collectionDateStr === '24') {
        const currentYear = new Date().getFullYear();
        collectionDateStr = `${currentYear}-12-${collectionDateStr}`;
      }
      
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

      // Get the order to check if it has a Shopify order ID
      const order = orders.find(o => o.id === orderId);
      
      // Optimistic update for immediate feedback
      setOrders(prev => prev.map(o => {
        if (o.id === orderId && o.status === 'pending') {
          return {
            ...o,
            status: 'collected' as const,
            collectedAt: new Date().toISOString(),
            collectedBy: displayName || collectedBy || 'Staff',
          };
        }
        return o;
      }));

      // If order has Shopify ID, trigger fulfillment in background
      if (order?.shopifyOrderId) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          await supabase.functions.invoke('shopify-fulfill', {
            body: { 
              orderNumber: order.orderNumber,
              shopifyOrderId: order.shopifyOrderId 
            },
            headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined
          });
        } catch (fulfillError) {
          console.error('Shopify fulfillment failed:', fulfillError);
          // Don't show error to user - collection still succeeded locally
        }
      }
    } catch (error) {
      console.error('Error marking as collected:', error);
      toast({
        title: "Error",
        description: "Could not update order status.",
        variant: "destructive",
      });
    }
  }, [user, displayName, orders]);

  const markAsPending = useCallback(async (orderId: string) => {
    if (!user) return;

    // Get the order first to check for Shopify info
    const order = orders.find(o => o.id === orderId);

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
      setOrders(prev => prev.map(o => {
        if (o.id === orderId) {
          return {
            ...o,
            status: 'pending' as const,
            collectedAt: undefined,
            collectedBy: undefined,
          };
        }
        return o;
      }));

      // If order has Shopify ID, trigger unfulfillment in background
      if (order?.orderNumber) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          await supabase.functions.invoke('shopify-unfulfill', {
            body: { 
              orderNumber: order.orderNumber,
              shopifyOrderId: order.shopifyOrderId 
            },
            headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined
          });
          console.log('Shopify unfulfillment triggered for order:', order.orderNumber);
        } catch (unfulfillError) {
          console.error('Shopify unfulfillment failed:', unfulfillError);
          // Don't show error to user - revert still succeeded locally
        }
      }

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
  }, [user, orders]);

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
    const today = format(new Date(), 'yyyy-MM-dd');

    orders.forEach(order => {
      order.products.forEach(product => {
        const existing = stockMap.get(product.name) || {
          productName: product.name,
          totalOrdered: 0,
          totalCollected: 0,
          remaining: 0,
          remaining23: 0,
          remaining24: 0,
          remainingWilmslow: 0,
          remainingManchester: 0,
        };

        existing.totalOrdered += product.quantity;
        if (order.status === 'collected') {
          existing.totalCollected += product.quantity;
        } else {
          // For backwards compatibility, check if date ends with 23 or 24
          if (order.collectionDate.endsWith('-23') || order.collectionDate === '23') {
            existing.remaining23 += product.quantity;
          } else if (order.collectionDate.endsWith('-24') || order.collectionDate === '24') {
            existing.remaining24 += product.quantity;
          }
          // Track remaining by location
          if (order.collectionLocation.toLowerCase() === 'wilmslow') {
            existing.remainingWilmslow += product.quantity;
          } else if (order.collectionLocation.toLowerCase() === 'manchester') {
            existing.remainingManchester += product.quantity;
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

  const getRemainingCount = useCallback((date?: string) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    
    return orders.filter(order => {
      if (!date || date === 'all') return order.status === 'pending';
      if (date === 'today') return order.status === 'pending' && order.collectionDate === today;
      // Support old format ('23', '24') for backwards compatibility
      if (date === '23' || date === '24') {
        return order.status === 'pending' && order.collectionDate.endsWith(`-${date}`);
      }
      return order.status === 'pending' && order.collectionDate === date;
    }).length;
  }, [orders]);

  const getLocations = useCallback(() => {
    const locations = new Set(orders.map(o => o.collectionLocation));
    return Array.from(locations).sort();
  }, [orders]);

  const getAvailableDates = useCallback(() => {
    const dates = new Set(orders.map(o => o.collectionDate));
    return Array.from(dates).sort();
  }, [orders]);

  const setProductEmoji = useCallback(async (productName: string, emoji: string) => {
    if (!user) return;

    try {
      // Upsert the emoji
      const { error } = await supabase
        .from('product_emojis')
        .upsert(
          { product_name: productName, emoji } as any,
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

  const setProductColor = useCallback(async (productName: string, color: { bg: string; border: string }) => {
    if (!user) return;

    try {
      const colorJson = JSON.stringify(color);
      
      // Check if record exists
      const { data: existing } = await supabase
        .from('product_emojis')
        .select('product_name')
        .eq('product_name', productName)
        .maybeSingle();
      
      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('product_emojis')
          .update({ color: colorJson } as any)
          .eq('product_name', productName);
        if (error) throw error;
      } else {
        // Insert new record with default emoji
        const { error } = await supabase
          .from('product_emojis')
          .insert({ product_name: productName, emoji: '📦', color: colorJson } as any);
        if (error) throw error;
      }

      // Optimistic update
      setProductColors(prev => ({
        ...prev,
        [productName]: colorJson
      }));
      
      toast({
        title: "Color Updated",
        description: `Color saved for ${productName}`,
      });
    } catch (error) {
      console.error('Error setting product color:', error);
      toast({
        title: "Error",
        description: "Could not save color.",
        variant: "destructive",
      });
    }
  }, [user]);

  const syncWithShopify = useCallback(async () => {
    if (!user) return;

    setIsSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('shopify-sync', {
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined
      });

      if (error) throw error;

      setLastSyncTime(new Date().toISOString());
      await loadOrders();

      // Check for warnings about skipped orders
      const warnings = data?.warnings;
      const missingDateOrders = warnings?.missingDateTag || [];
      
      if (missingDateOrders.length > 0) {
        // Show warning toast with details
        const orderList = missingDateOrders.slice(0, 5).map((o: any) => o.orderNumber).join(', ');
        const moreText = missingDateOrders.length > 5 ? ` and ${missingDateOrders.length - 5} more` : '';
        
        toast({
          title: `Sync Complete - ${missingDateOrders.length} orders need attention`,
          description: `Orders missing date tags: ${orderList}${moreText}. Add DD/MM/YYYY date tags in Shopify.`,
          variant: "destructive",
          duration: 10000,
        });
      } else {
        toast({
          title: "Sync Complete",
          description: data?.message || `Synced orders from Shopify.`,
        });
      }
      
      // Store warnings in state for UI display
      if (warnings && (warnings.missingDateTag?.length > 0 || warnings.syncError?.length > 0)) {
        setSyncWarnings(warnings);
      } else {
        setSyncWarnings(null);
      }
    } catch (error) {
      console.error('Error syncing with Shopify:', error);
      toast({
        title: "Sync Failed",
        description: "Could not sync orders from Shopify.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
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

  const clearSyncWarnings = useCallback(() => {
    setSyncWarnings(null);
  }, []);

  return (
    <OrderContext.Provider value={{
      orders,
      backups,
      isLoading,
      isSyncing,
      lastSyncTime,
      syncWarnings,
      productEmojis,
      productColors,
      getDisplayName,
      importOrders,
      addOrder,
      markAsCollected,
      markAsPending,
      getOrdersByStatus,
      searchOrders,
      getStockSummary,
      getRemainingCount,
      getLocations,
      getAvailableDates,
      setProductEmoji,
      setProductColor,
      createBackup,
      restoreBackup,
      downloadBackup,
      clearAllData,
      syncWithShopify,
      clearSyncWarnings,
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
