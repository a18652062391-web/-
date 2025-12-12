import React, { useState, useEffect } from 'react';
import { X, ShoppingBag, Plus, Trash2, AlertCircle } from 'lucide-react';
import { StockItem, SaleRecord } from '../types';

interface SaleModalProps {
  stock: StockItem | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmSale: (records: SaleRecord[]) => void;
}

interface PriceEntry {
  id: string;
  variantId: string; // Required now
  quantity: number | string; 
  price: number | string;
}

export const SaleModal: React.FC<SaleModalProps> = ({ stock, isOpen, onClose, onConfirmSale }) => {
  const [entries, setEntries] = useState<PriceEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Initialize with one default entry when modal opens
  useEffect(() => {
    if (stock && isOpen) {
      // Find first variant with stock
      const firstAvailableVariant = stock.variants?.find(v => v.quantity > 0);
      
      setEntries([{ 
        id: crypto.randomUUID(), 
        variantId: firstAvailableVariant?.id || '',
        quantity: 1, 
        price: Math.ceil(stock.unitCost * 1.3) 
      }]);
      setError(null);
    }
  }, [stock, isOpen]);

  if (!isOpen || !stock) return null;

  const getNumber = (val: number | string) => {
    if (typeof val === 'number') return val;
    return parseFloat(val) || 0;
  };

  const totalQuantity = entries.reduce((sum, e) => sum + getNumber(e.quantity), 0);
  const totalRevenue = entries.reduce((sum, e) => sum + (getNumber(e.quantity) * getNumber(e.price)), 0);
  const totalProfit = entries.reduce((sum, e) => sum + ((getNumber(e.price) - stock.unitCost) * getNumber(e.quantity)), 0);
  
  // Validation logic
  const validateStock = () => {
    // Group requested quantities by variant
    const requestedStock: Record<string, number> = {};
    for (const entry of entries) {
      if (!entry.variantId) continue;
      requestedStock[entry.variantId] = (requestedStock[entry.variantId] || 0) + getNumber(entry.quantity);
    }

    // Check against actual stock
    for (const [vId, reqQty] of Object.entries(requestedStock)) {
      const variant = stock.variants?.find(v => v.id === vId);
      if (!variant) return false;
      if (reqQty > variant.quantity) return false;
    }
    return true;
  };

  const isStockSufficient = validateStock();

  const handleAddEntry = () => {
    const lastEntry = entries[entries.length - 1];
    setEntries([...entries, { 
      id: crypto.randomUUID(), 
      variantId: lastEntry ? lastEntry.variantId : '',
      quantity: 1, 
      price: lastEntry ? lastEntry.price : Math.ceil(stock.unitCost * 1.3)
    }]);
  };

  const handleRemoveEntry = (id: string) => {
    if (entries.length > 1) {
      setEntries(entries.filter(e => e.id !== id));
    }
  };

  const updateEntry = (id: string, field: keyof PriceEntry, value: string) => {
    setEntries(entries.map(e => {
      if (e.id === id) {
        return { ...e, [field]: value };
      }
      return e;
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isStockSufficient) {
      setError("部分规格库存不足，请检查数量。");
      return;
    }

    // Filter out entries with 0 quantity or no variant selected
    const validEntries = entries.filter(e => getNumber(e.quantity) > 0 && e.variantId);

    if (validEntries.length === 0) {
      setError("请填写有效的销售信息。");
      return;
    }

    const newRecords: SaleRecord[] = validEntries.map(entry => {
      const qty = getNumber(entry.quantity);
      const price = getNumber(entry.price);
      const variant = stock.variants?.find(v => v.id === entry.variantId);
      
      return {
        id: crypto.randomUUID(),
        stockId: stock.id,
        variantId: entry.variantId,
        size: variant?.size || 'Unknown',
        color: variant?.color || 'Unknown',
        quantitySold: qty,
        salePricePerUnit: price,
        saleDate: new Date().toISOString(),
        totalRevenue: qty * price,
        profit: (price - stock.unitCost) * qty
      };
    });

    onConfirmSale(newRecords);
  };

  const availableVariants = stock.variants?.filter(v => v.quantity > 0) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <h3 className="font-bold text-slate-800">记录销售</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 bg-white border-b border-slate-100 flex gap-4 shrink-0">
           {stock.imageUrl && (
             <img src={stock.imageUrl} alt={stock.name} className="w-16 h-16 object-cover rounded-lg bg-slate-100" />
           )}
           <div>
             <h4 className="font-semibold text-slate-900">{stock.name}</h4>
             <p className="text-xs text-slate-500 mb-1">剩余总库存: {stock.currentQuantity} 双</p>
             <p className="text-xs text-slate-400">进价: ¥{stock.unitCost}</p>
           </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm font-medium text-slate-700">
              <span>销售明细</span>
              <button 
                type="button" 
                onClick={handleAddEntry}
                className="text-indigo-600 text-xs flex items-center gap-1 hover:text-indigo-700"
              >
                <Plus className="w-3 h-3" /> 添加一条
              </button>
            </div>

            {entries.map((entry, index) => (
              <div key={entry.id} className="flex flex-col gap-2 p-3 bg-slate-50 rounded-lg animate-in slide-in-from-left-2 duration-200">
                
                {/* Variant Selection */}
                <div>
                   <label className="text-[10px] text-slate-400 mb-1 block">选择规格 (尺码/颜色)</label>
                   <select
                     value={entry.variantId}
                     onChange={(e) => updateEntry(entry.id, 'variantId', e.target.value)}
                     className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
                   >
                     <option value="" disabled>选择鞋子...</option>
                     {stock.variants?.map(v => (
                       <option key={v.id} value={v.id} disabled={v.quantity === 0}>
                         {v.size}码 - {v.color} (剩 {v.quantity} 双)
                       </option>
                     ))}
                   </select>
                </div>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] text-slate-400 mb-1 block">数量</label>
                    <input 
                      type="number" 
                      min="1"
                      value={entry.quantity}
                      onChange={(e) => updateEntry(entry.id, 'quantity', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  </div>
                  <div className="flex-[1.5]">
                     <label className="text-[10px] text-slate-400 mb-1 block">单价 (¥)</label>
                     <div className="relative">
                       <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">¥</span>
                       <input 
                         type="number" 
                         min="0"
                         step="0.01"
                         value={entry.price}
                         onChange={(e) => updateEntry(entry.id, 'price', e.target.value)}
                         className="w-full pl-6 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                       />
                     </div>
                  </div>
                  {entries.length > 1 && (
                    <div className="pt-6">
                      <button 
                        type="button"
                        onClick={() => handleRemoveEntry(entry.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {(!isStockSufficient || error) && (
             <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 p-3 rounded-lg">
               <AlertCircle className="w-4 h-4" />
               <span>{error || '销售数量超过了某些规格的现有库存'}</span>
             </div>
          )}
        </form>

        <div className="p-4 bg-slate-50 border-t border-slate-100 shrink-0 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">总销售量:</span>
            <span className="font-medium text-slate-900">{totalQuantity} 双</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">总销售额:</span>
            <span className="font-bold text-slate-900 text-lg">¥{totalRevenue.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">预计总利润:</span>
            <span className="font-medium text-emerald-600">+¥{totalProfit.toFixed(2)}</span>
          </div>

          <button 
            onClick={handleSubmit}
            disabled={!isStockSufficient || totalQuantity === 0}
            className="w-full py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition shadow-lg shadow-emerald-200 flex justify-center items-center gap-2 disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed"
          >
            <ShoppingBag className="w-5 h-5" /> 确认销售
          </button>
        </div>
      </div>
    </div>
  );
};