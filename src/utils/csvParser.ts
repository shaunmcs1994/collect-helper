import { Order, Product } from '@/types/order';

interface CSVRow {
  orderNumber: string;
  collectionName: string;
  alternativeName: string;
  collectionDate: string;
  collectionLocation: string;
  productName: string;
  quantity: string;
}

// Column name mappings (case-insensitive)
const COLUMN_MAPPINGS: Record<string, keyof CSVRow> = {
  'order number': 'orderNumber',
  'ordernumber': 'orderNumber',
  'order_number': 'orderNumber',
  'order': 'orderNumber',
  'order #': 'orderNumber',
  'order#': 'orderNumber',
  
  'collection name': 'collectionName',
  'collectionname': 'collectionName',
  'collection_name': 'collectionName',
  'customer name': 'collectionName',
  'customername': 'collectionName',
  'customer_name': 'collectionName',
  'name': 'collectionName',
  
  'alternative name': 'alternativeName',
  'alternativename': 'alternativeName',
  'alternative_name': 'alternativeName',
  'alt name': 'alternativeName',
  'altname': 'alternativeName',
  'alt_name': 'alternativeName',
  'secondary name': 'alternativeName',
  'other name': 'alternativeName',
  
  'collection date': 'collectionDate',
  'collectiondate': 'collectionDate',
  'collection_date': 'collectionDate',
  'date': 'collectionDate',
  'pickup date': 'collectionDate',
  
  'collection location': 'collectionLocation',
  'collectionlocation': 'collectionLocation',
  'collection_location': 'collectionLocation',
  'location': 'collectionLocation',
  'store': 'collectionLocation',
  'pickup location': 'collectionLocation',
  
  'product name': 'productName',
  'productname': 'productName',
  'product_name': 'productName',
  'product': 'productName',
  'item': 'productName',
  'item name': 'productName',
  
  'quantity': 'quantity',
  'qty': 'quantity',
  'amount': 'quantity',
};

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

function normalizeDate(dateStr: string): '23' | '24' | null {
  const cleaned = dateStr.toLowerCase().trim();
  
  // Check for explicit 23 or 24
  if (cleaned.includes('23')) return '23';
  if (cleaned.includes('24')) return '24';
  
  // Try to parse as date
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    const day = date.getDate();
    if (day === 23) return '23';
    if (day === 24) return '24';
  }
  
  return null;
}

export interface ParseResult {
  success: boolean;
  orders: Order[];
  errors: string[];
  warnings: string[];
}

export function parseCSV(csvContent: string): ParseResult {
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim());
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (lines.length < 2) {
    return {
      success: false,
      orders: [],
      errors: ['CSV file must contain a header row and at least one data row.'],
      warnings: [],
    };
  }
  
  // Parse header
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine);
  
  // Map headers to our expected fields
  const columnMap: Record<number, keyof CSVRow> = {};
  const missingColumns: string[] = [];
  const requiredFields: (keyof CSVRow)[] = [
    'orderNumber',
    'collectionName',
    'collectionDate',
    'collectionLocation',
    'productName',
    'quantity',
  ];
  const foundFields = new Set<keyof CSVRow>();
  
  headers.forEach((header, index) => {
    const normalizedHeader = header.toLowerCase().trim();
    const mappedField = COLUMN_MAPPINGS[normalizedHeader];
    if (mappedField) {
      columnMap[index] = mappedField;
      foundFields.add(mappedField);
    }
  });
  
  requiredFields.forEach(field => {
    if (!foundFields.has(field)) {
      missingColumns.push(field);
    }
  });
  
  if (missingColumns.length > 0) {
    return {
      success: false,
      orders: [],
      errors: [`Missing required columns: ${missingColumns.join(', ')}. Please check your CSV headers.`],
      warnings: [],
    };
  }
  
  // Parse data rows
  const orderMap = new Map<string, Order>();
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    const values = parseCSVLine(line);
    const row: Partial<CSVRow> = {};
    
    Object.entries(columnMap).forEach(([indexStr, field]) => {
      const index = parseInt(indexStr);
      row[field] = values[index] || '';
    });
    
    // Validate row
    if (!row.orderNumber?.trim()) {
      warnings.push(`Row ${i + 1}: Missing order number, skipped.`);
      continue;
    }
    
    const collectionDate = normalizeDate(row.collectionDate || '');
    if (!collectionDate) {
      warnings.push(`Row ${i + 1}: Invalid collection date "${row.collectionDate}", must be 23 or 24 December.`);
      continue;
    }
    
    const quantity = parseInt(row.quantity || '0');
    if (isNaN(quantity) || quantity <= 0) {
      warnings.push(`Row ${i + 1}: Invalid quantity "${row.quantity}", defaulting to 1.`);
    }
    
    const orderKey = row.orderNumber.trim();
    const product: Product = {
      name: row.productName?.trim() || 'Unknown Product',
      quantity: Math.max(1, quantity || 1),
    };
    
    if (orderMap.has(orderKey)) {
      // Add product to existing order
      const existingOrder = orderMap.get(orderKey)!;
      existingOrder.products.push(product);
    } else {
      // Create new order
      const order: Order = {
        id: `order_${orderKey}_${Date.now()}`,
        orderNumber: orderKey,
        collectionName: row.collectionName?.trim() || 'Unknown',
        alternativeName: row.alternativeName?.trim() || undefined,
        collectionDate,
        collectionLocation: row.collectionLocation?.trim() || 'Unknown',
        products: [product],
        status: 'pending',
      };
      orderMap.set(orderKey, order);
    }
  }
  
  const orders = Array.from(orderMap.values());
  
  if (orders.length === 0) {
    return {
      success: false,
      orders: [],
      errors: ['No valid orders found in the CSV file.'],
      warnings,
    };
  }
  
  return {
    success: true,
    orders,
    errors: [],
    warnings,
  };
}

export function exportOrdersToCSV(orders: Order[]): string {
  const headers = [
    'Order Number',
    'Collection Name',
    'Alternative Name',
    'Collection Date',
    'Collection Location',
    'Product Name',
    'Quantity',
    'Status',
    'Collected At',
    'Collected By',
  ];
  
  const rows = orders.flatMap(order =>
    order.products.map(product => [
      order.orderNumber,
      order.collectionName,
      order.alternativeName || '',
      `December ${order.collectionDate}`,
      order.collectionLocation,
      product.name,
      product.quantity.toString(),
      order.status,
      order.collectedAt || '',
      order.collectedBy || '',
    ])
  );
  
  const escapeCsvValue = (value: string) => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(escapeCsvValue).join(',')),
  ].join('\n');
  
  return csvContent;
}
