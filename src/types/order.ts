export interface Product {
  name: string;
  quantity: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  collectionName: string;
  alternativeName?: string;
  phoneNumber?: string;
  collectionDate: string; // ISO date format YYYY-MM-DD
  collectionLocation: string;
  pickupTime?: string;
  products: Product[];
  status: 'pending' | 'collected';
  collectedAt?: string;
  collectedBy?: string;
  shopifyOrderId?: string; // For Shopify integration
}

export interface StockItem {
  productName: string;
  totalOrdered: number;
  totalCollected: number;
  remaining: number;
  remaining23: number;
  remaining24: number;
  remainingWilmslow: number;
  remainingManchester: number;
}

export interface Backup {
  id: string;
  timestamp: string;
  orderCount: number;
  data: Order[];
}

// Now supports any date string (YYYY-MM-DD) or 'all' or 'today'
export type CollectionDate = string | 'all' | 'today';
export type LocationFilter = string | 'all';
