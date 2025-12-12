import React, { useState } from 'react';
import { Search, Plus, Tag, AlertTriangle, ShoppingCart, ChevronDown, ChevronUp } from 'lucide-react';
import { StockItem } from '../types';

interface InventoryListProps {
  stocks: StockItem[];
  onSellClick: (stock: StockItem) => void;
  onNavigateAdd: () => void;
}

export const InventoryList: React.FC<InventoryListProps> = ({ stocks, onSellClick, onNavigateAdd }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredStocks = stocks.filter(stock => 
    stock.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    stock.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
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

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input 
          type="text" 
          placeholder="搜索名称或类别..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
        />
      </div>

      {filteredStocks.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
          <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Tag className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-medium text-slate-900">未找到商品</h3>
          <p className="text-slate-500 mb-6">库存为空或未找到匹配项。</p>
          <button 
            onClick={onNavigateAdd}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-200"
          >
            <Plus className="w-5 h-5" /> 添加第一个商品
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredStocks.map(stock => {
            // Check for low stock variants
            const lowStockVariants = stock.variants?.filter(v => v.quantity === 1) || [];
            const hasLowStock = lowStockVariants.length > 0;
            const isExpanded = expandedId === stock.id;

            return (
              <div key={stock.id} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-4 flex gap-4">
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
                        <h3 className="font-semibold text-slate-900">{stock.name}</h3>
                        <span className="text-xs font-medium px-2 py-1 bg-slate-100 text-slate-600 rounded-full">
                          {stock.category || '鞋类'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 line-clamp-1">{stock.description}</p>
                    </div>
                    
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex flex-col">
                        <div className="text-sm">
                          <span className="text-slate-400">总库存:</span>
                          <span className={`ml-1 font-semibold ${stock.currentQuantity === 0 ? 'text-red-500' : 'text-slate-700'}`}>
                            {stock.currentQuantity}
                          </span>
                        </div>
                        {hasLowStock && (
                          <div className="flex items-center gap-1 mt-1 text-amber-600 text-xs font-medium">
                            <AlertTriangle className="w-3 h-3" />
                            <span>{lowStockVariants.length} 个规格库存紧张 (仅1双)</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleExpand(stock.id)}
                          className="px-3 py-2 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 transition flex items-center gap-1 text-sm"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          详情
                        </button>
                        <button 
                          onClick={() => onSellClick(stock)}
                          disabled={stock.currentQuantity === 0}
                          className="px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition flex items-center gap-1 shadow-sm"
                        >
                          <ShoppingCart className="w-4 h-4" /> 出售
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Details - Variant List */}
                {isExpanded && (
                  <div className="bg-slate-50 border-t border-slate-100 p-4 animate-in slide-in-from-top-2">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2 tracking-wider">库存明细</h4>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      {stock.variants && stock.variants.length > 0 ? (
                        stock.variants.map((v) => (
                          <div key={v.id} className={`flex items-center justify-between p-2 rounded-lg border ${v.quantity === 1 ? 'bg-amber-50 border-amber-200' : v.quantity === 0 ? 'bg-slate-100 border-slate-200 opacity-60' : 'bg-white border-slate-200'}`}>
                             <div className="flex flex-col">
                               <span className="font-medium text-slate-700">{v.size}码</span>
                               <span className="text-xs text-slate-500">{v.color}</span>
                             </div>
                             <div className="flex items-center gap-1">
                               <span className={`font-bold ${v.quantity === 1 ? 'text-amber-600' : 'text-slate-800'}`}>
                                 x{v.quantity}
                               </span>
                               {v.quantity === 1 && <AlertTriangle className="w-3 h-3 text-amber-500" />}
                             </div>
                          </div>
                        ))
                      ) : (
                        <div className="col-span-3 text-center text-slate-400 py-2 text-xs">暂无具体规格信息</div>
                      )}
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