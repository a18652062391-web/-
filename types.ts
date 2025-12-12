export interface StockVariant {
  id: string;
  size: string;
  color: string;
  quantity: number;
}

export interface StockItem {
  id: string;
  name: string;
  description?: string;
  category?: string; // e.g., Sneaker, Boot, Heels
  imageUrl?: string;
  purchaseDate: string; // ISO String
  initialQuantity: number;
  currentQuantity: number; // Sum of all variant quantities
  unitCost: number; // Cost per pair
  totalCost: number; // initialQuantity * unitCost
  variants: StockVariant[]; // New field for detailed inventory
}

export interface SaleRecord {
  id: string;
  stockId: string;
  variantId?: string; // Track which specific item was sold
  size?: string;      // Snapshot for history
  color?: string;     // Snapshot for history
  quantitySold: number;
  salePricePerUnit: number; // Price sold per pair
  saleDate: string; // ISO String
  totalRevenue: number;
  profit: number; // (salePrice - costPrice) * quantity
}

export type AppView = 'dashboard' | 'inventory' | 'add-stock' | 'sales-history';

export interface DashboardStats {
  totalInventoryCount: number;
  totalInventoryValue: number; // Based on cost
  totalRevenue: number;
  totalProfit: number;
  salesToday: number;
}