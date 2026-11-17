import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Order, Backup, StockItem } from '@/types/order';
import { toast } from '@/hooks/use-toast';
import { christmasDates } from '@/utils/christmas';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

interface SyncWarnings {
  missingDateTag: Array<{ orderNumber: string; tags: string; customerName: string }>;
  alreadyCollected: Array<{ orderNumber: string; tags: string; customerName: string }>;
  syncError: Array<{ orderNumber: string; tags: string; customerName: string }>;
}

interface PrintLog {
  id: string;
  collection_date: string;
  printed_at: string;
  printed_by: string | null;
  location_filter: string;
  order_count: number;
}

interface PrintWarning {
  collectionDate: string;
  newOrderCount: number;
  printedAt: string;
  orders: Order[];
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
  printLogs: PrintLog[];
  printWarnings: PrintWarning[];
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
  updateOrderDetails: (orderId: string, details: { isCustomCake?: boolean; customNotes?: string; customImages?: string[] }) => Promise<void>;
  uploadCakeImage: (file: File) => Promise<string | null>;
  deleteCakeImage: (imageUrl: string) => Promise<void>;
  logPrint: (dates: string[], location: string, count: number, orderIds?: string[]) => Promise<void>;
  clearPrintWarnings: () => void;
  getLatestPrintLog: (date: string) => PrintLog | undefined;
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
  const [printLogs, setPrintLogs] = useState<PrintLog[]>([]);
  const [printWarnings, setPrintWarnings] = useState<PrintWarning[]>([]);
  const { user, displayName } = useAuth();

  // Load data from Supabase on mount and when user changes
  useEffect(() => {
    if (!user) {
      setOrders([]);
      setProductEmojis({});
      setPrintLogs([]);
      setPrintWarnings([]);
      setIsLoading(false);
      return;
    }

    loadOrders();
    loadProductEmojis();
    loadProfiles();
    loadPrintLogs();
    
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

  // Compute print warnings whenever orders or printLogs change
  useEffect(() => {
    if (printLogs.length === 0 || orders.length === 0) {
      setPrintWarnings([]);
      return;
    }

    // For each date that has been printed, find the latest print log
    const latestPrintByDate: Record<string, PrintLog> = {};
    printLogs.forEach(log => {
      const existing = latestPrintByDate[log.collection_date];
      if (!existing || new Date(log.printed_at) > new Date(existing.printed_at)) {
        latestPrintByDate[log.collection_date] = log;
      }
    });

    // Find orders created after the last print for their collection date
    const warnings: PrintWarning[] = [];
    Object.entries(latestPrintByDate).forEach(([date, log]) => {
      const printedAt = new Date(log.printed_at);
      const newOrders = orders.filter(o => 
        o.collectionDate === date && 
        o.status === 'pending' &&
        new Date(o.createdAt || '') > printedAt
      );
      if (newOrders.length > 0) {
        warnings.push({
          collectionDate: date,
          newOrderCount: newOrders.length,
          printedAt: log.printed_at,
          orders: newOrders,
        });
      }
    });

    setPrintWarnings(warnings);
  }, [orders, printLogs]);

  const loadOrders = async () => {
    try {
      // Christmas-only: load 23rd/24th December orders, paging past the 1000-row limit
      const data: any[] = [];
      const pageSize = 1000;
      for (let from = 0; ; from += pageSize) {
        const { data: page, error } = await supabase
          .from('orders')
          .select('*')
          .in('collection_date', christmasDates())
          .order('created_at', { ascending: false })
          .range(from, from + pageSize - 1);
        if (error) throw error;
        data.push(...(page || []));
        if (!page || page.length < pageSize) break;
      }

      const mappedOrders: Order[] = (data || []).map(row => {
        return {
          id: row.id,
          orderNumber: row.order_number,
          collectionName: row.customer_name,
          collectionDate: row.collection_date,
          collectionLocation: row.collection_location,
          pickupTime: (row as any).pickup_time || undefined,
          products: row.products as { name: string; quantity: number }[],
          status: row.status as 'pending' | 'collected',
          collectedAt: row.collected_at || undefined,
          collectedBy: row.collected_by || undefined,
          createdAt: row.created_at,
          isCustomCake: (row as any).is_custom_cake || false,
          customNotes: (row as any).custom_notes || undefined,
          customImages: (row as any).custom_images || [],
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

  const loadPrintLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('print_logs')
        .select('*')
        .order('printed_at', { ascending: false });

      if (error) throw error;
      setPrintLogs((data || []) as PrintLog[]);
    } catch (error) {
      console.error('Error loading print logs:', error);
    }
  };

  const getDisplayName = useCallback((userId: string): string => {
    return profiles[userId] || 'Staff';
  }, [profiles]);

  const importOrders = useCallback(async (newOrders: Order[]) => {
    if (!user) return;

    try {
      if (orders.length > 0) {
        createBackupInternal();
      }

      await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      for (const order of newOrders) {
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

      const order = orders.find(o => o.id === orderId);
      
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

      if (order?.orderNumber) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          await supabase.functions.invoke('shopify-fulfill', {
            body: { orderNumber: order.orderNumber },
            headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined
          });
        } catch (fulfillError) {
          console.error('Shopify fulfillment failed:', fulfillError);
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

      if (order?.orderNumber) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          await supabase.functions.invoke('shopify-unfulfill', {
            body: { orderNumber: order.orderNumber },
            headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined
          });
          console.log('Shopify unfulfillment triggered for order:', order.orderNumber);
        } catch (unfulfillError) {
          console.error('Shopify unfulfillment failed:', unfulfillError);
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
          remainingChester: 0,
        };

        existing.totalOrdered += product.quantity;
        if (order.status === 'collected') {
          existing.totalCollected += product.quantity;
        } else {
          if (order.collectionDate.endsWith('-23') || order.collectionDate === '23') {
            existing.remaining23 += product.quantity;
          } else if (order.collectionDate.endsWith('-24') || order.collectionDate === '24') {
            existing.remaining24 += product.quantity;
          }
          if (order.collectionLocation.toLowerCase() === 'wilmslow') {
            existing.remainingWilmslow += product.quantity;
          } else if (order.collectionLocation.toLowerCase() === 'manchester') {
            existing.remainingManchester += product.quantity;
          } else if (order.collectionLocation.toLowerCase() === 'chester') {
            existing.remainingChester += product.quantity;
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
      const { error } = await supabase
        .from('product_emojis')
        .upsert(
          { product_name: productName, emoji } as any,
          { onConflict: 'product_name' }
        );

      if (error) throw error;

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
      
      const { data: existing } = await supabase
        .from('product_emojis')
        .select('product_name')
        .eq('product_name', productName)
        .maybeSingle();
      
      if (existing) {
        const { error } = await supabase
          .from('product_emojis')
          .update({ color: colorJson } as any)
          .eq('product_name', productName);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('product_emojis')
          .insert({ product_name: productName, emoji: '📦', color: colorJson } as any);
        if (error) throw error;
      }

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
      // Reload print logs to recalculate warnings after sync
      await loadPrintLogs();

      const warnings = data?.warnings;
      const missingDateOrders = warnings?.missingDateTag || [];
      
      if (missingDateOrders.length > 0) {
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

  const updateOrderDetails = useCallback(async (
    orderId: string, 
    details: { isCustomCake?: boolean; customNotes?: string; customImages?: string[] }
  ) => {
    if (!user) return;

    try {
      const updateData: any = {};
      if (details.isCustomCake !== undefined) updateData.is_custom_cake = details.isCustomCake;
      if (details.customNotes !== undefined) updateData.custom_notes = details.customNotes;
      if (details.customImages !== undefined) updateData.custom_images = details.customImages;

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) throw error;

      setOrders(prev => prev.map(o => {
        if (o.id === orderId) {
          return {
            ...o,
            isCustomCake: details.isCustomCake ?? o.isCustomCake,
            customNotes: details.customNotes ?? o.customNotes,
            customImages: details.customImages ?? o.customImages,
          };
        }
        return o;
      }));

      toast({
        title: "Order Updated",
        description: "Custom cake details saved.",
      });
    } catch (error) {
      console.error('Error updating order details:', error);
      toast({
        title: "Error",
        description: "Could not update order details.",
        variant: "destructive",
      });
    }
  }, [user]);

  const uploadCakeImage = useCallback(async (file: File): Promise<string | null> => {
    if (!user) return null;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('cake-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('cake-photos')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Upload Failed",
        description: "Could not upload image.",
        variant: "destructive",
      });
      return null;
    }
  }, [user]);

  const deleteCakeImage = useCallback(async (imageUrl: string) => {
    if (!user) return;

    try {
      const urlParts = imageUrl.split('/cake-photos/');
      if (urlParts.length < 2) return;
      
      const filePath = urlParts[1];

      const { error } = await supabase.storage
        .from('cake-photos')
        .remove([filePath]);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  }, [user]);

  const logPrint = useCallback(async (dates: string[], location: string, count: number, orderIds?: string[]) => {
    if (!user) return;

    try {
      const inserts = dates.map(date => ({
        collection_date: date,
        printed_by: user.id,
        location_filter: location,
        order_count: count,
      }));

      const { data: printLogData, error } = await supabase
        .from('print_logs')
        .insert(inserts as any)
        .select();

      if (error) throw error;

      // Insert order-level audit records if order IDs provided
      if (orderIds && orderIds.length > 0 && printLogData && printLogData.length > 0) {
        const orderInserts = printLogData.flatMap((log: any) =>
          orderIds.map(orderId => ({
            print_log_id: log.id,
            order_id: orderId,
          }))
        );

        const { error: orderError } = await supabase
          .from('print_log_orders' as any)
          .insert(orderInserts);

        if (orderError) {
          console.error('Error logging print order details:', orderError);
        }
      }

      // Reload print logs
      await loadPrintLogs();

      toast({
        title: "Print Logged",
        description: `Recorded print for ${dates.length} day${dates.length > 1 ? 's' : ''}.`,
      });
    } catch (error) {
      console.error('Error logging print:', error);
    }
  }, [user]);

  const clearPrintWarnings = useCallback(() => {
    setPrintWarnings([]);
  }, []);

  const getLatestPrintLog = useCallback((date: string): PrintLog | undefined => {
    return printLogs.find(log => log.collection_date === date);
  }, [printLogs]);

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
      printLogs,
      printWarnings,
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
      updateOrderDetails,
      uploadCakeImage,
      deleteCakeImage,
      logPrint,
      clearPrintWarnings,
      getLatestPrintLog,
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
