import { Order, Product } from '@/types/order';

interface CSVRow {
  orderNumber: string;
  collectionName: string;
  alternativeName: string;
  phoneNumber: string;
  collectionDate: string;
  collectionLocation: string;
  pickupTime: string;
  productName: string;
  quantity: string;
}

// Column name mappings (case-insensitive)
const COLUMN_MAPPINGS: Record<string, keyof CSVRow> = {
  // Order number variations
  'order number': 'orderNumber',
  'ordernumber': 'orderNumber',
  'order_number': 'orderNumber',
  'order': 'orderNumber',
  'order #': 'orderNumber',
  'order#': 'orderNumber',
  'name': 'orderNumber', // Shopify uses "Name" for order number like #13872
  
  // Customer/Collection name variations
  'collection name': 'collectionName',
  'collectionname': 'collectionName',
  'collection_name': 'collectionName',
  'customer name': 'collectionName',
  'customername': 'collectionName',
  'customer_name': 'collectionName',
  'billing name': 'collectionName',
  'shipping name': 'collectionName',
  'first name': 'collectionName',
  'firstname': 'collectionName',
  
  // Alternative name variations
  'alternative name': 'alternativeName',
  'alternativename': 'alternativeName',
  'alternative_name': 'alternativeName',
  'alt name': 'alternativeName',
  'altname': 'alternativeName',
  'alt_name': 'alternativeName',
  'secondary name': 'alternativeName',
  'other name': 'alternativeName',
  'last name': 'alternativeName',
  'lastname': 'alternativeName',
  
  // Phone variations
  'phone number': 'phoneNumber',
  'phonenumber': 'phoneNumber',
  'phone_number': 'phoneNumber',
  'phone': 'phoneNumber',
  'telephone': 'phoneNumber',
  'tel': 'phoneNumber',
  'mobile': 'phoneNumber',
  'contact number': 'phoneNumber',
  'billing phone': 'phoneNumber',
  'shipping phone': 'phoneNumber',
  
  // Collection date variations
  'collection date': 'collectionDate',
  'collectiondate': 'collectionDate',
  'collection_date': 'collectionDate',
  'date': 'collectionDate',
  'pickup date': 'collectionDate',
  'created at': 'collectionDate',
  'order date': 'collectionDate',
  
  // Location variations
  'collection location': 'collectionLocation',
  'collectionlocation': 'collectionLocation',
  'collection_location': 'collectionLocation',
  'location': 'collectionLocation',
  'store': 'collectionLocation',
  'pickup location': 'collectionLocation',
  'shipping city': 'collectionLocation',
  'billing city': 'collectionLocation',
  
  // Pickup time variations
  'pickup time': 'pickupTime',
  'pickuptime': 'pickupTime',
  'pickup_time': 'pickupTime',
  'collection time': 'pickupTime',
  'collectiontime': 'pickupTime',
  'collection_time': 'pickupTime',
  'time': 'pickupTime',
  'time slot': 'pickupTime',
  'timeslot': 'pickupTime',
  
  // Product name variations (Shopify line item format)
  'product name': 'productName',
  'productname': 'productName',
  'product_name': 'productName',
  'product': 'productName',
  'item': 'productName',
  'item name': 'productName',
  'lineitem name': 'productName',
  'lineitem_name': 'productName',
  'line item name': 'productName',
  'lineitem sku': 'productName',
  
  // Quantity variations
  'quantity': 'quantity',
  'qty': 'quantity',
  'amount': 'quantity',
  'lineitem quantity': 'quantity',
  'lineitem_quantity': 'quantity',
  'line item quantity': 'quantity',
  'lineitem qty': 'quantity',
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
  
  // Check for explicit 23 or 24 in various formats
  // Match standalone 23 or 24 (with word boundaries to avoid matching e.g. "2023")
  if (/\b23\b/.test(cleaned) || cleaned.includes('dec 23') || cleaned.includes('23rd') || cleaned.includes('23 dec')) return '23';
  if (/\b24\b/.test(cleaned) || cleaned.includes('dec 24') || cleaned.includes('24th') || cleaned.includes('24 dec')) return '24';
  
  // Try various date formats
  // Format: DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = cleaned.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1]);
    if (day === 23) return '23';
    if (day === 24) return '24';
  }
  
  // Format: YYYY-MM-DD (ISO)
  const isoMatch = cleaned.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (isoMatch) {
    const day = parseInt(isoMatch[3]);
    if (day === 23) return '23';
    if (day === 24) return '24';
  }
  
  // Try to parse as date string
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
  // Track last known order data for inheriting customer details on sparse rows
  let lastOrderData: Partial<CSVRow> | null = null;
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    const values = parseCSVLine(line);
    const row: Partial<CSVRow> = {};
    
    Object.entries(columnMap).forEach(([indexStr, field]) => {
      const index = parseInt(indexStr);
      row[field] = values[index] || '';
    });
    
    // Clean order number (remove # prefix if present, e.g., "#13872" -> "13872")
    let orderKey = row.orderNumber?.trim().replace(/^#/, '') || '';
    
    // If order number is empty but we have a product, this might be a continuation row
    // for the same order (common in Shopify exports)
    if (!orderKey && row.productName?.trim() && lastOrderData?.orderNumber) {
      orderKey = lastOrderData.orderNumber.trim().replace(/^#/, '');
      // Inherit customer details from last order
      row.orderNumber = lastOrderData.orderNumber;
      row.collectionName = row.collectionName?.trim() || lastOrderData.collectionName;
      row.alternativeName = row.alternativeName?.trim() || lastOrderData.alternativeName;
      row.phoneNumber = row.phoneNumber?.trim() || lastOrderData.phoneNumber;
      row.collectionDate = row.collectionDate?.trim() || lastOrderData.collectionDate;
      row.collectionLocation = row.collectionLocation?.trim() || lastOrderData.collectionLocation;
      row.pickupTime = row.pickupTime?.trim() || lastOrderData.pickupTime;
    }
    
    // Skip if still no order number
    if (!orderKey) {
      warnings.push(`Row ${i + 1}: Missing order number, skipped.`);
      continue;
    }
    
    // If this row has full customer details, save it for potential inheritance
    if (row.collectionName?.trim()) {
      lastOrderData = { ...row };
    }
    
    // For existing orders (multi-line), inherit missing details
    if (orderMap.has(orderKey)) {
      const existingOrder = orderMap.get(orderKey)!;
      
      // Only add product if it has a name
      if (row.productName?.trim()) {
        const quantity = parseInt(row.quantity || '1');
        const product: Product = {
          name: row.productName.trim(),
          quantity: Math.max(1, isNaN(quantity) ? 1 : quantity),
        };
        existingOrder.products.push(product);
      }
      continue;
    }
    
    // New order - validate collection date
    const collectionDate = normalizeDate(row.collectionDate || '');
    if (!collectionDate) {
      warnings.push(`Row ${i + 1}: Invalid collection date "${row.collectionDate}", must be 23 or 24 December.`);
      continue;
    }
    
    const quantity = parseInt(row.quantity || '1');
    if (row.quantity && (isNaN(parseInt(row.quantity)) || parseInt(row.quantity) <= 0)) {
      warnings.push(`Row ${i + 1}: Invalid quantity "${row.quantity}", defaulting to 1.`);
    }
    
    const product: Product = {
      name: row.productName?.trim() || 'Unknown Product',
      quantity: Math.max(1, isNaN(quantity) ? 1 : quantity),
    };
    
    // Create new order
    const order: Order = {
      id: `order_${orderKey}_${Date.now()}`,
      orderNumber: orderKey,
      collectionName: row.collectionName?.trim() || 'Unknown',
      alternativeName: row.alternativeName?.trim() || undefined,
      phoneNumber: row.phoneNumber?.trim() || undefined,
      collectionDate,
      collectionLocation: row.collectionLocation?.trim() || 'Unknown',
      pickupTime: row.pickupTime?.trim() || undefined,
      products: [product],
      status: 'pending',
    };
    orderMap.set(orderKey, order);
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
    'Phone Number',
    'Collection Date',
    'Collection Location',
    'Pickup Time',
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
      order.phoneNumber || '',
      `December ${order.collectionDate}`,
      order.collectionLocation,
      order.pickupTime || '',
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
