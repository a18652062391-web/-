import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LayoutDashboard, Package, PlusCircle, History, Settings, Trash2, Download, Upload, Smartphone, Clock, Share2, RotateCcw } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { InventoryList } from './components/InventoryList';
import { StockForm } from './components/StockForm';
import { SaleModal } from './components/SaleModal';
import { StockItem, SaleRecord, AppView, DashboardStats } from './types';

// Initial data: Empty for production use
const INITIAL_STOCKS: StockItem[] = [];

const STORAGE_KEYS = {
  STOCKS: 'shoe-store-stocks',
  SALES: 'shoe-store-sales',
  LAST_BACKUP: 'shoe-store-last-backup'
};

const App: React.FC = () => {
  const [view, setView] = useState<AppView | 'settings'>('dashboard');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Initialize state
  const [stocks, setStocks] = useState<StockItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.STOCKS);
      return saved ? JSON.parse(saved) : INITIAL_STOCKS;
    } catch (e) {
      console.error("Failed to load stocks", e);
      return INITIAL_STOCKS;
    }
  });

  const [sales, setSales] = useState<SaleRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SALES);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load sales", e);
      return [];
    }
  });

  const [lastBackup, setLastBackup] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEYS.LAST_BACKUP);
  });
  
  // State for Modals & Editing
  const [selectedStockForSale, setSelectedStockForSale] = useState<StockItem | null>(null);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [stockToEdit, setStockToEdit] = useState<StockItem | undefined>(undefined);

  // --- Safe Storage Helper ---
  const saveToStorage = (key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e: any) {
      if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        alert('⚠️ 手机存储空间不足！\n\n图片占用空间过大。请尝试：\n1. 删除一些旧的库存商品\n2. 编辑现有商品，移除图片\n3. 导出备份后清空数据');
      } else {
        console.error("Storage error", e);
      }
    }
  };

  // --- Persistence Effects ---
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.STOCKS, stocks);
  }, [stocks]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.SALES, sales);
  }, [sales]);

  // --- Navigation & Hardware Back Button ---
  useEffect(() => {
    // Set initial history state to prevent null state on first back press
    window.history.replaceState({ view: 'dashboard' }, '', '');

    const handlePopState = (event: PopStateEvent) => {
      // 1. Modal Priority: If modal is open, back button closes it first
      if (isSaleModalOpen) {
        setIsSaleModalOpen(false);
        setSelectedStockForSale(null);
        return;
      }
      
      // 2. View Navigation: Respect the history state
      const state = event.state;
      if (state && state.view) {
        setView(state.view);
        // Clean up edit state if we navigated away from add-stock
        if (state.view !== 'add-stock') {
          setStockToEdit(undefined);
        }
      } else {
        // Fallback safety
        setView('dashboard');
        setStockToEdit(undefined);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isSaleModalOpen]);

  const navigateTo = (newView: AppView | 'settings') => {
    if (view !== newView) {
      window.history.pushState({ view: newView }, '', '');
      setView(newView);
      // Ensure edit state is cleared if not going to add-stock
      if (newView !== 'add-stock') setStockToEdit(undefined);
    }
  };

  const openSaleModal = (stock: StockItem) => {
    window.history.pushState({ modal: 'sale' }, '', '');
    setSelectedStockForSale(stock);
    setIsSaleModalOpen(true);
  };

  const closeSaleModal = () => {
    if (isSaleModalOpen) {
       window.history.back();
       // State update happens in popstate listener, but we force cleanup for safety
       setTimeout(() => {
         setIsSaleModalOpen(false);
         setSelectedStockForSale(null);
       }, 50);
    }
  };

  // --- Core Logic ---

  const handleAddStock = (newItem: StockItem) => {
    setStocks(prev => [newItem, ...prev]);
    window.history.back(); 
  };

  const handleUpdateStock = (updatedItem: StockItem) => {
    setStocks(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
    setStockToEdit(undefined);
    window.history.back();
  };

  const handleEditStockRequest = (stock: StockItem) => {
    setStockToEdit(stock);
    navigateTo('add-stock'); 
  };

  const handleDeleteStock = (id: string) => {
    if (confirm('确定要删除这个商品吗？\n删除后，该商品的关联销售记录虽然保留，但无法查看商品详情。')) {
      setStocks(prev => prev.filter(s => s.id !== id));
    }
  };

  const handleConfirmSale = (newRecords: SaleRecord[]) => {
    if (newRecords.length === 0) return;
    setSales(prev => [...newRecords, ...prev]);

    const stockId = newRecords[0].stockId;
    setStocks(prev => prev.map(item => {
      if (item.id === stockId) {
        const updatedVariants = item.variants?.map(variant => {
          const saleForVariant = newRecords.find(r => r.variantId === variant.id);
          if (saleForVariant) {
            return {
              ...variant,
              quantity: Math.max(0, variant.quantity - saleForVariant.quantitySold)
            };
          }
          return variant;
        }) || [];

        const newTotalQuantity = updatedVariants.reduce((sum, v) => sum + v.quantity, 0);
        return {
          ...item,
          variants: updatedVariants,
          currentQuantity: newTotalQuantity
        };
      }
      return item;
    }));
  };
  
  // NEW: Refund / Return Logic
  const handleRefund = (sale: SaleRecord) => {
    const stock = stocks.find(s => s.id === sale.stockId);
    
    if (confirm(`⚠️ 确定要执行退货吗？\n\n退货金额: ¥${sale.totalRevenue}\n\n操作后：\n1. 销售记录将被删除\n2. 库存将自动加回 ${sale.quantitySold} 双`)) {
      
      // 1. Remove the sale record
      setSales(prev => prev.filter(s => s.id !== sale.id));

      // 2. Restore stock quantity if the item still exists
      if (stock) {
        setStocks(prev => prev.map(item => {
          if (item.id === sale.stockId) {
            // Find the specific variant to restore
            const updatedVariants = item.variants?.map(variant => {
               if (variant.id === sale.variantId) {
                 return { ...variant, quantity: variant.quantity + sale.quantitySold };
               }
               return variant;
            });
            
            // If variant logic failed (maybe legacy data), just update total? 
            // Better to only update if variants found. If variant deleted, we can't easily restore.
            // But we will try to update total anyway.
            
            const newTotalQuantity = updatedVariants 
               ? updatedVariants.reduce((sum, v) => sum + v.quantity, 0)
               : item.currentQuantity + sale.quantitySold;

            return {
              ...item,
              variants: updatedVariants || item.variants,
              currentQuantity: newTotalQuantity
            };
          }
          return item;
        }));
        alert("退货成功：款项已扣除，库存已恢复。");
      } else {
        alert("退货成功：款项已扣除。\n⚠️ 注意：原商品已被删除，无法恢复库存数量。");
      }
    }
  };

  const handleResetData = () => {
    if (confirm('确定要清空所有数据吗？此操作无法撤销。')) {
      localStorage.removeItem(STORAGE_KEYS.STOCKS);
      localStorage.removeItem(STORAGE_KEYS.SALES);
      localStorage.removeItem(STORAGE_KEYS.LAST_BACKUP);
      setStocks([]);
      setSales([]);
      setLastBackup(null);
      alert('数据已清空');
      navigateTo('dashboard');
    }
  };

  // --- Backup Logic ---
  const updateLastBackupTime = (now: Date) => {
    const timeString = now.toLocaleString('zh-CN', { hour12: false });
    setLastBackup(timeString);
    localStorage.setItem(STORAGE_KEYS.LAST_BACKUP, timeString);
  };

  const handleExportData = async () => {
    const now = new Date();
    const data = {
      stocks,
      sales,
      exportDate: now.toISOString(),
      version: '1.2'
    };
    
    const jsonString = JSON.stringify(data, null, 2);
    const fileName = `鞋店管家备份_${now.getFullYear()}${now.getMonth()+1}${now.getDate()}.json`;
    
    try {
      const file = new File([jsonString], fileName, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: '鞋店管家数据备份',
          text: `截至 ${now.toLocaleString()} 的数据备份。`
        });
        updateLastBackupTime(now);
        return;
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') console.log('Share failed, fallback to download');
    }

    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    updateLastBackupTime(now);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = event.target?.result as string;
        const data = JSON.parse(json);

        if (!data.stocks || !Array.isArray(data.stocks)) {
          alert('文件格式错误');
          return;
        }

        if (confirm(`⚠️ 警告：导入将覆盖当前所有数据！\n备份包含 ${data.stocks.length} 个商品。确定继续吗？`)) {
          setStocks(data.stocks);
          setSales(data.sales || []);
          alert('恢复成功！');
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      } catch (err) {
        alert('导入失败：文件损坏');
      }
    };
    reader.readAsText(file);
  };

  const handleImportClick = () => fileInputRef.current?.click();

  // --- Stats Calculation ---
  const stats: DashboardStats = useMemo(() => {
    const totalInventoryCount = stocks.reduce((sum, item) => sum + item.currentQuantity, 0);
    const totalInventoryValue = stocks.reduce((sum, item) => sum + (item.currentQuantity * item.unitCost), 0);
    const totalRevenue = sales.reduce((sum, item) => sum + item.totalRevenue, 0);
    const totalProfit = sales.reduce((sum, item) => sum + item.profit, 0);
    
    // Fix: Local Time Comparison for "Today"
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
    
    const salesToday = sales.filter(s => {
      const sDate = new Date(s.saleDate);
      const sDateStr = `${sDate.getFullYear()}-${sDate.getMonth()}-${sDate.getDate()}`;
      return sDateStr === todayStr;
    }).length;

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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pt-safe">
      <div className="max-w-4xl mx-auto min-h-screen flex flex-col">
        <main className="flex-1 p-4 md:p-6">
          {view === 'dashboard' && <Dashboard stats={stats} sales={sales} stocks={stocks} />}
          {view === 'inventory' && (
            <InventoryList 
              stocks={stocks} 
              sales={sales}
              onSellClick={openSaleModal} 
              onNavigateAdd={() => { setStockToEdit(undefined); navigateTo('add-stock'); }}
              onEditClick={handleEditStockRequest}
              onDeleteClick={handleDeleteStock}
            />
          )}
          {view === 'add-stock' && (
            <StockForm 
              initialData={stockToEdit}
              onAddStock={handleAddStock} 
              onUpdateStock={handleUpdateStock}
              onCancel={() => window.history.back()} 
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
                     const isProfitPositive = sale.profit > 0;
                     return (
                       <div key={sale.id} className="bg-white p-4 rounded-xl border border-slate-100 flex justify-between items-center shadow-sm group">
                         <div>
                           <h4 className="font-semibold text-slate-800">{stock?.name || '已删除商品'}</h4>
                           <div className="text-xs text-slate-500 flex flex-col mt-1 gap-0.5">
                             <div className="flex gap-2 items-center">
                               <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                                 {new Date(sale.saleDate).toLocaleDateString()}
                               </span>
                               <span>已售 {sale.quantitySold} 双</span>
                             </div>
                             {(sale.size || sale.color) && (
                               <span className="text-slate-400">
                                 规格: {sale.size || '-'}码 / {sale.color || '-'}
                               </span>
                             )}
                           </div>
                         </div>
                         <div className="flex items-center gap-3">
                           <div className="text-right">
                             <div className="font-bold text-slate-900 text-lg">+¥{sale.totalRevenue}</div>
                             <div className={`text-xs font-medium ${isProfitPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                               {isProfitPositive ? '赚' : '亏'}: ¥{Math.abs(sale.profit).toFixed(2)}
                             </div>
                           </div>
                           <button 
                             onClick={() => handleRefund(sale)}
                             className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                             title="退货/撤销"
                           >
                             <RotateCcw className="w-5 h-5" />
                           </button>
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
               <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden mb-6 shadow-sm">
                 <div className="p-6">
                   <h3 className="font-semibold text-lg text-slate-900 mb-2">数据管理</h3>
                   <div className="bg-blue-50 p-3 rounded-lg flex items-start gap-3 mb-6">
                     <Smartphone className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                     <div className="text-blue-800 text-xs leading-relaxed">
                       <p className="font-bold mb-1">数据在您手中</p>
                       <p>为了数据安全，建议每周点击“分享/导出备份”并发送到微信或网盘保存。</p>
                     </div>
                   </div>
                   <div className="flex items-center gap-2 mb-4 text-xs text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <Clock className="w-4 h-4" />
                      <span>上次备份: </span>
                      {lastBackup ? <span className="font-medium text-emerald-600">{lastBackup}</span> : <span className="font-medium text-amber-500">从未备份</span>}
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <button onClick={handleExportData} className="flex flex-col items-center justify-center gap-2 p-4 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors active:scale-95">
                       <Share2 className="w-6 h-6 text-indigo-600" />
                       <span className="text-sm font-medium">分享备份</span>
                     </button>
                     <button onClick={handleImportClick} className="flex flex-col items-center justify-center gap-2 p-4 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors active:scale-95">
                       <Upload className="w-6 h-6 text-indigo-600" />
                       <span className="text-sm font-medium">导入恢复</span>
                     </button>
                     <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileImport} />
                   </div>
                 </div>
               </div>
               <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                 <div className="p-6">
                   <h3 className="font-semibold text-lg text-slate-900 mb-2">危险区域</h3>
                   <button onClick={handleResetData} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 border border-red-100 rounded-xl font-medium hover:bg-red-100 transition-colors active:scale-95">
                     <Trash2 className="w-5 h-5" />
                     清空所有数据
                   </button>
                 </div>
               </div>
               <div className="mt-8 text-center text-xs text-slate-400"><p>鞋店管家 v1.5.0 (全能版)</p></div>
             </div>
          )}
        </main>
        
        {/* Bottom Nav */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200 z-40 pb-safe">
          <div className="max-w-4xl mx-auto flex justify-around items-center h-16 px-2">
            <button onClick={() => navigateTo('dashboard')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${view === 'dashboard' ? 'text-indigo-600' : 'text-slate-400'}`}>
              <LayoutDashboard className="w-6 h-6" /><span className="text-[10px] font-medium">概览</span>
            </button>
            <button onClick={() => navigateTo('inventory')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${view === 'inventory' ? 'text-indigo-600' : 'text-slate-400'}`}>
              <Package className="w-6 h-6" /><span className="text-[10px] font-medium">库存</span>
            </button>
            <div className="relative -top-5">
              <button onClick={() => { setStockToEdit(undefined); navigateTo('add-stock'); }} className="w-14 h-14 rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-200 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform">
                <PlusCircle className="w-8 h-8" />
              </button>
            </div>
            <button onClick={() => navigateTo('sales-history')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${view === 'sales-history' ? 'text-indigo-600' : 'text-slate-400'}`}>
              <History className="w-6 h-6" /><span className="text-[10px] font-medium">历史</span>
            </button>
            <button onClick={() => navigateTo('settings')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${view === 'settings' ? 'text-indigo-600' : 'text-slate-400'}`}>
              <Settings className="w-6 h-6" /><span className="text-[10px] font-medium">设置</span>
            </button>
          </div>
        </div>
      </div>
      <SaleModal stock={selectedStockForSale} isOpen={isSaleModalOpen} onClose={closeSaleModal} onConfirmSale={handleConfirmSale} />
    </div>
  );
};

export default App;