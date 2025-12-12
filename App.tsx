import React, { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, Package, PlusCircle, History, Settings, Trash2 } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { InventoryList } from './components/InventoryList';
import { StockForm } from './components/StockForm';
import { SaleModal } from './components/SaleModal';
import { StockItem, SaleRecord, AppView, DashboardStats } from './types';

// Initial data with variants (Used only if local storage is empty)
const INITIAL_STOCKS: StockItem[] = [
  {
    id: '1',
    name: '经典小白鞋',
    category: '运动鞋',
    description: '基础款百搭白色运动鞋',
    initialQuantity: 10,
    currentQuantity: 8,
    unitCost: 150,
    totalCost: 1500,
    purchaseDate: new Date().toISOString(),
    imageUrl: 'https://picsum.photos/300/300?random=1',
    variants: [
      { id: 'v1', size: '37', color: '白色', quantity: 3 },
      { id: 'v2', size: '38', color: '白色', quantity: 1 }, // Low stock example
      { id: 'v3', size: '39', color: '白色', quantity: 4 }
    ]
  },
  {
    id: '2',
    name: '专业跑鞋 X',
    category: '运动鞋',
    description: '高性能长跑专用鞋',
    initialQuantity: 5,
    currentQuantity: 5,
    unitCost: 280,
    totalCost: 1400,
    purchaseDate: new Date().toISOString(),
    imageUrl: 'https://picsum.photos/300/300?random=2',
    variants: [
      { id: 'v4', size: '42', color: '黑红', quantity: 2 },
      { id: 'v5', size: '43', color: '黑红', quantity: 3 }
    ]
  }
];

const STORAGE_KEYS = {
  STOCKS: 'shoe-store-stocks',
  SALES: 'shoe-store-sales'
};

const App: React.FC = () => {
  const [view, setView] = useState<AppView | 'settings'>('dashboard');
  
  // Initialize state from LocalStorage or fallback to INITIAL_STOCKS
  const [stocks, setStocks] = useState<StockItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.STOCKS);
      return saved ? JSON.parse(saved) : INITIAL_STOCKS;
    } catch (e) {
      console.error("Failed to load stocks from storage", e);
      return INITIAL_STOCKS;
    }
  });

  const [sales, setSales] = useState<SaleRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SALES);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load sales from storage", e);
      return [];
    }
  });
  
  // State for Sale Modal
  const [selectedStockForSale, setSelectedStockForSale] = useState<StockItem | null>(null);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);

  // --- Persistence Effects ---
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.STOCKS, JSON.stringify(stocks));
  }, [stocks]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
  }, [sales]);

  // --- Actions ---

  const handleAddStock = (newItem: StockItem) => {
    setStocks(prev => [newItem, ...prev]);
    setView('inventory');
  };

  const handleInitiateSale = (stock: StockItem) => {
    setSelectedStockForSale(stock);
    setIsSaleModalOpen(true);
  };

  const handleConfirmSale = (newRecords: SaleRecord[]) => {
    if (newRecords.length === 0) return;

    // 1. Add all sale records
    setSales(prev => [...newRecords, ...prev]);

    // 2. Update stock quantity (Variants and Total)
    const stockId = newRecords[0].stockId;

    setStocks(prev => prev.map(item => {
      if (item.id === stockId) {
        
        // Update variants
        const updatedVariants = item.variants?.map(variant => {
          // Find if this variant was sold
          const saleForVariant = newRecords.find(r => r.variantId === variant.id);
          if (saleForVariant) {
            return {
              ...variant,
              quantity: Math.max(0, variant.quantity - saleForVariant.quantitySold)
            };
          }
          return variant;
        }) || [];

        // Recalculate total quantity
        const newTotalQuantity = updatedVariants.reduce((sum, v) => sum + v.quantity, 0);

        return {
          ...item,
          variants: updatedVariants,
          currentQuantity: newTotalQuantity
        };
      }
      return item;
    }));

    setIsSaleModalOpen(false);
    setSelectedStockForSale(null);
  };

  const handleResetData = () => {
    if (confirm('确定要清空所有数据吗？此操作无法撤销，数据将恢复到初始测试状态。')) {
      localStorage.removeItem(STORAGE_KEYS.STOCKS);
      localStorage.removeItem(STORAGE_KEYS.SALES);
      setStocks(INITIAL_STOCKS);
      setSales([]);
      alert('数据已重置');
      setView('dashboard');
    }
  };

  // --- Derived Statistics ---

  const stats: DashboardStats = useMemo(() => {
    const totalInventoryCount = stocks.reduce((sum, item) => sum + item.currentQuantity, 0);
    const totalInventoryValue = stocks.reduce((sum, item) => sum + (item.currentQuantity * item.unitCost), 0);
    const totalRevenue = sales.reduce((sum, item) => sum + item.totalRevenue, 0);
    const totalProfit = sales.reduce((sum, item) => sum + item.profit, 0);
    
    // Simple "today" check
    const today = new Date().toDateString();
    const salesToday = sales.filter(s => new Date(s.saleDate).toDateString() === today).length;

    return {
      totalInventoryCount,
      totalInventoryValue,
      totalRevenue,
      totalProfit,
      salesToday
    };
  }, [stocks, sales]);

  // --- Render ---

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Mobile-first Layout Container */}
      <div className="max-w-4xl mx-auto min-h-screen flex flex-col">
        
        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-6">
          {view === 'dashboard' && (
            <Dashboard stats={stats} sales={sales} stocks={stocks} />
          )}
          {view === 'inventory' && (
            <InventoryList 
              stocks={stocks} 
              onSellClick={handleInitiateSale} 
              onNavigateAdd={() => setView('add-stock')}
            />
          )}
          {view === 'add-stock' && (
            <StockForm 
              onAddStock={handleAddStock} 
              onCancel={() => setView('inventory')} 
            />
          )}
          {view === 'sales-history' && (
             <div className="pb-20">
               <h1 className="text-2xl font-bold mb-6">销售历史</h1>
               {sales.length === 0 ? (
                 <p className="text-slate-500">暂无销售记录。</p>
               ) : (
                 <div className="space-y-3">
                   {sales.map(sale => {
                     const stock = stocks.find(s => s.id === sale.stockId);
                     return (
                       <div key={sale.id} className="bg-white p-4 rounded-xl border border-slate-100 flex justify-between items-center">
                         <div>
                           <h4 className="font-semibold">{stock?.name || '未知商品'}</h4>
                           <div className="text-xs text-slate-500 flex flex-col mt-1 gap-0.5">
                             <div className="flex gap-2">
                               <span>{new Date(sale.saleDate).toLocaleDateString()}</span>
                               <span>•</span>
                               <span>{sale.quantitySold} 双</span>
                             </div>
                             {(sale.size || sale.color) && (
                               <span className="text-slate-400">
                                 规格: {sale.size || '-'}码 / {sale.color || '-'}
                               </span>
                             )}
                           </div>
                         </div>
                         <div className="text-right">
                           <div className="font-bold text-slate-900">+¥{sale.totalRevenue}</div>
                           <div className="text-xs font-medium text-emerald-600">利润: ¥{sale.profit.toFixed(2)}</div>
                         </div>
                       </div>
                     );
                   })}
                 </div>
               )}
             </div>
          )}
          {view === 'settings' && (
             <div className="pb-20">
               <h1 className="text-2xl font-bold mb-6">应用设置</h1>
               <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                 <div className="p-6">
                   <h3 className="font-semibold text-lg text-slate-900 mb-2">数据管理</h3>
                   <p className="text-slate-500 text-sm mb-6">
                     您的数据当前存储在本地浏览器的缓存中。如果您清除浏览器缓存，数据可能会丢失。
                   </p>
                   
                   <button 
                     onClick={handleResetData}
                     className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 border border-red-100 rounded-xl font-medium hover:bg-red-100 transition-colors"
                   >
                     <Trash2 className="w-5 h-5" />
                     清空所有数据 (重置)
                   </button>
                 </div>
               </div>
               
               <div className="mt-8 text-center text-xs text-slate-400">
                 <p>鞋店管家 v1.0.1</p>
                 <p className="mt-1">Designed for Small Business</p>
               </div>
             </div>
          )}
        </main>

        {/* Bottom Navigation Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-200 z-40 pb-safe">
          <div className="max-w-4xl mx-auto flex justify-around items-center h-16 px-2">
            <button 
              onClick={() => setView('dashboard')}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${view === 'dashboard' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <LayoutDashboard className="w-6 h-6" />
              <span className="text-[10px] font-medium">概览</span>
            </button>
            <button 
              onClick={() => setView('inventory')}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${view === 'inventory' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Package className="w-6 h-6" />
              <span className="text-[10px] font-medium">库存</span>
            </button>
            <div className="relative -top-5">
              <button 
                onClick={() => setView('add-stock')}
                className="w-14 h-14 rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-200 flex items-center justify-center hover:scale-105 transition-transform"
              >
                <PlusCircle className="w-8 h-8" />
              </button>
            </div>
            <button 
              onClick={() => setView('sales-history')}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${view === 'sales-history' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <History className="w-6 h-6" />
              <span className="text-[10px] font-medium">历史</span>
            </button>
            <button 
              onClick={() => setView('settings')}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${view === 'settings' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Settings className="w-6 h-6" />
              <span className="text-[10px] font-medium">设置</span>
            </button>
          </div>
        </div>

      </div>

      {/* Modals */}
      <SaleModal 
        stock={selectedStockForSale}
        isOpen={isSaleModalOpen}
        onClose={() => { setIsSaleModalOpen(false); setSelectedStockForSale(null); }}
        onConfirmSale={handleConfirmSale}
      />
    </div>
  );
};

export default App;