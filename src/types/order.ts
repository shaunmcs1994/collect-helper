export interface ProductProperty {
  name: string;
  value: string;
}

export interface Product {
  name: string;
  quantity: number;
  properties?: ProductProperty[]; // Infinite Options data from Shopify
  sku?: string;
  variant_title?: string;
  image_url?: string; // Product image from Shopify
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
  createdAt?: string; // When the order was created in the database
  isCustomCake?: boolean; // Flag for custom cake orders needing enhanced print
  customNotes?: string; // Detailed instructions for custom cakes
  customImages?: string[]; // Array of image URLs for custom cakes
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
  remainingChester: number;
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
