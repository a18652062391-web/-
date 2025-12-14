import React, { useState, useMemo } from 'react';
import { Search, Plus, Tag, AlertTriangle, ShoppingCart, ChevronDown, ChevronUp, Pencil, Trash2, DollarSign, Filter, Copy } from 'lucide-react';
import { StockItem, SaleRecord } from '../types';

interface InventoryListProps {
  stocks: StockItem[];
  sales: SaleRecord[]; // Need sales to calculate per-item profit
  onSellClick: (stock: StockItem) => void;
  onNavigateAdd: () => void;
  onEditClick: (stock: StockItem) => void;
  onDeleteClick: (id: string) => void;
}

export const InventoryList: React.FC<InventoryListProps> = ({ stocks, sales, onSellClick, onNavigateAdd, onEditClick, onDeleteClick }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'low'>('all');

  // Optimization: Pre-calculate profits map
  const profitMap = useMemo(() => {
    const map: Record<string, number> = {};
    sales.forEach(s => {
      map[s.stockId] = (map[s.stockId] || 0) + s.profit;
    });
    return map;
  }, [sales]);

  // Filter Logic
  const filteredStocks = stocks.filter(stock => {
    const matchesSearch = stock.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          stock.category?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    if (filterMode === 'low') {
      // Logic for "Low Stock": Total < 3 OR has specific variants with <= 1
      const isTotalLow = stock.currentQuantity < 3;
      const hasLowVariant = stock.variants?.some(v => v.quantity <= 1);
      return isTotalLow || hasLowVariant;
    }
    
    return true;
  });

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleCopyStockInfo = (stock: StockItem, e: React.MouseEvent) => {
    e.stopPropagation();
    
    let text = `【${stock.name}】\n`;
    if (stock.currentQuantity === 0) {
      text += `状态: 已售罄\n`;
    } else {
      stock.variants?.forEach(v => {
        if (v.quantity > 0) {
          text += `${v.size}码/${v.color}: 余${v.quantity}\n`;
        }
      });
    }
    // Simple heuristic for "Selling Price" (Estimated as Cost * 1.5 or just don't show if unknown)
    // Since we don't store "Selling Price" in StockItem, we omit price or use a placeholder.
    // Let's just list availability.
    
    navigator.clipboard.writeText(text).then(() => {
      alert('库存信息已复制！');
    });
  };

  return (
    <div className="pb-24">
       <header className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">库存管理</h1>
          <p className="text-slate-500">管理库存并记录销售。</p>
        </div>
        <button 
          onClick={onNavigateAdd}
          className="hidden md:flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          <Plus className="w-4 h-4" /> 新增
        </button>
      </header>

      {/* Controls: Search & Filter */}
      <div className="space-y-3 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="搜索鞋名、类别..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          />
        </div>
        
        {/* Filter Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button 
            onClick={() => setFilterMode('all')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${filterMode === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
          >
            全部商品
          </button>
          <button 
            onClick={() => setFilterMode('low')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${filterMode === 'low' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500'}`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>缺货预警</span>
          </button>
        </div>
      </div>

      {filteredStocks.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
          <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            {filterMode === 'low' ? <CheckCircleIcon /> : <Tag className="w-8 h-8 text-slate-300" />}
          </div>
          <h3 className="text-lg font-medium text-slate-900">{filterMode === 'low' ? '库存充足' : '未找到商品'}</h3>
          <p className="text-slate-500 mb-6">{filterMode === 'low' ? '没有发现急需补货的商品。' : '库存为空或未找到匹配项。'}</p>
          {filterMode === 'all' && (
            <button 
              onClick={onNavigateAdd}
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-200"
            >
              <Plus className="w-5 h-5" /> 添加第一个商品
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredStocks.map(stock => {
            // Check for low stock variants
            const lowStockVariants = stock.variants?.filter(v => v.quantity <= 1) || [];
            const hasLowStock = lowStockVariants.length > 0;
            const isExpanded = expandedId === stock.id;
            const totalItemProfit = profitMap[stock.id] || 0;

            return (
              <div key={stock.id} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div onClick={() => toggleExpand(stock.id)} className="p-4 flex gap-4 cursor-pointer active:bg-slate-50 transition-colors">
                  <div className="w-24 h-24 shrink-0 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 relative">
                    {stock.imageUrl ? (
                      <img src={stock.imageUrl} alt={stock.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <Tag className="w-8 h-8" />
                      </div>
                    )}
                    {stock.currentQuantity === 0 && (
                       <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                         <span className="text-white text-xs font-bold px-2 py-1 bg-red-500 rounded-full">售罄</span>
                       </div>
                    )}
                  </div>
                  
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <h3 className="font-semibold text-slate-900 line-clamp-1">{stock.name}</h3>
                        <span className="text-xs font-medium px-2 py-1 bg-slate-100 text-slate-600 rounded-full shrink-0">
                          {stock.category || '鞋类'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 line-clamp-1 mt-1">{stock.description}</p>
                    </div>
                    
                    <div className="flex items-end justify-between mt-2">
                      <div className="flex flex-col">
                        <div className="text-sm">
                          <span className="text-slate-400">剩余:</span>
                          <span className={`ml-1 font-semibold ${stock.currentQuantity === 0 ? 'text-red-500' : 'text-slate-700'}`}>
                            {stock.currentQuantity}
                          </span>
                        </div>
                        {hasLowStock && stock.currentQuantity > 0 && (
                          <div className="flex items-center gap-1 mt-1 text-amber-600 text-[10px] font-medium">
                            <AlertTriangle className="w-3 h-3" />
                            <span>{lowStockVariants.length}个尺码余1</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                        <button 
                          onClick={() => onSellClick(stock)}
                          disabled={stock.currentQuantity === 0}
                          className="px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition flex items-center gap-1 shadow-sm active:scale-95"
                        >
                          <ShoppingCart className="w-4 h-4" /> 出售
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Details - Variant List & Actions */}
                {isExpanded && (
                  <div className="bg-slate-50 border-t border-slate-100 p-4 animate-in slide-in-from-top-2">
                    {/* Actions Row */}
                    <div className="flex gap-3 mb-4">
                      <button 
                         onClick={(e) => handleCopyStockInfo(stock, e)}
                         className="flex-1 flex items-center justify-center gap-2 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 text-sm font-medium hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition"
                      >
                        <Copy className="w-4 h-4" /> 复制库存文本
                      </button>
                      <button 
                         onClick={() => onEditClick(stock)}
                         className="flex-1 flex items-center justify-center gap-2 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 text-sm font-medium hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition"
                      >
                        <Pencil className="w-4 h-4" /> 编辑/补货
                      </button>
                      <button 
                         onClick={() => onDeleteClick(stock.id)}
                         className="flex-0 w-12 flex items-center justify-center py-2 bg-white border border-slate-200 rounded-lg text-slate-600 text-sm font-medium hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">库存明细</h4>
                        {totalItemProfit > 0 && (
                           <div className="text-xs font-medium text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded">
                             <DollarSign className="w-3 h-3" />
                             累计赚取: ¥{totalItemProfit.toFixed(2)}
                           </div>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      {stock.variants && stock.variants.length > 0 ? (
                        stock.variants.map((v) => (
                          <div key={v.id} className={`flex items-center justify-between p-2 rounded-lg border ${v.quantity <= 1 ? 'bg-amber-50 border-amber-200' : v.quantity === 0 ? 'bg-slate-100 border-slate-200 opacity-60' : 'bg-white border-slate-200'}`}>
                             <div className="flex flex-col">
                               <span className="font-medium text-slate-700">{v.size}码</span>
                               <span className="text-xs text-slate-500">{v.color}</span>
                             </div>
                             <div className="flex items-center gap-1">
                               <span className={`font-bold ${v.quantity <= 1 ? 'text-amber-600' : 'text-slate-800'}`}>
                                 x{v.quantity}
                               </span>
                               {v.quantity <= 1 && <AlertTriangle className="w-3 h-3 text-amber-500" />}
                             </div>
                          </div>
                        ))
                      ) : (
                        <div className="col-span-3 text-center text-slate-400 py-2 text-xs">暂无具体规格信息</div>
                      )}
                    </div>
                    
                    <div className="mt-3 text-[10px] text-slate-400 text-center">
                       进货时间: {new Date(stock.purchaseDate).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Helper Icon for Empty State
const CheckCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);