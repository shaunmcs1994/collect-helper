export interface Product {
  name: string;
  quantity: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  collectionName: string;
  alternativeName?: string;
  collectionDate: '23' | '24';
  collectionLocation: string;
  products: Product[];
  status: 'pending' | 'collected';
  collectedAt?: string;
  collectedBy?: string;
}

export interface StockItem {
  productName: string;
  totalOrdered: number;
  totalCollected: number;
  remaining: number;
}

export interface Backup {
  id: string;
  timestamp: string;
  orderCount: number;
  data: Order[];
}

export type CollectionDate = '23' | '24' | 'all';
export type LocationFilter = string | 'all';
