import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Check, Loader2, Calculator, Plus, Trash2, AlertCircle } from 'lucide-react';
import { analyzeShoeImage } from '../services/geminiService';
import { StockItem, StockVariant } from '../types';

interface StockFormProps {
  onAddStock: (item: StockItem) => void;
  onCancel: () => void;
}

export const StockForm: React.FC<StockFormProps> = ({ onAddStock, onCancel }) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [unitCost, setUnitCost] = useState<number | string>('');
  
  // Variants State
  const [variants, setVariants] = useState<StockVariant[]>([
    { id: crypto.randomUUID(), size: '', color: '', quantity: 1 }
  ]);

  // Derived State
  const totalQuantity = variants.reduce((sum, v) => sum + (v.quantity || 0), 0);
  const calculatedTotalCost = totalQuantity * (Number(unitCost) || 0);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setImagePreview(base64);
        
        // Auto-analyze with Gemini
        setIsAnalyzing(true);
        try {
          const analysis = await analyzeShoeImage(base64);
          if (analysis.name) setName(analysis.name);
          if (analysis.category) setCategory(analysis.category);
          if (analysis.description) setDescription(analysis.description);
        } finally {
          setIsAnalyzing(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddVariant = () => {
    // Copy size/color from previous entry for faster entry
    const lastVariant = variants[variants.length - 1];
    setVariants([
      ...variants, 
      { 
        id: crypto.randomUUID(), 
        size: lastVariant ? lastVariant.size : '', 
        color: lastVariant ? lastVariant.color : '', 
        quantity: 1 
      }
    ]);
  };

  const handleRemoveVariant = (id: string) => {
    if (variants.length > 1) {
      setVariants(variants.filter(v => v.id !== id));
    }
  };

  const updateVariant = (id: string, field: keyof StockVariant, value: string | number) => {
    setVariants(variants.map(v => {
      if (v.id === id) {
        return { ...v, [field]: value };
      }
      return v;
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (totalQuantity === 0) return;

    const newItem: StockItem = {
      id: crypto.randomUUID(),
      name,
      category,
      description,
      imageUrl: imagePreview || undefined,
      initialQuantity: totalQuantity,
      currentQuantity: totalQuantity,
      unitCost: Number(unitCost),
      totalCost: calculatedTotalCost,
      purchaseDate: new Date().toISOString(),
      variants: variants.map(v => ({...v, quantity: Number(v.quantity)}))
    };
    onAddStock(newItem);
  };

  return (
    <div className="pb-20">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">新增库存</h1>
        <p className="text-slate-500">登记新进货鞋子的尺码和颜色。</p>
      </header>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Image Upload Section */}
        <div className="p-6 border-b border-slate-100">
          <label className="block text-sm font-medium text-slate-700 mb-2">鞋子照片</label>
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="relative cursor-pointer group aspect-video rounded-xl bg-slate-50 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center hover:border-indigo-400 transition-colors overflow-hidden"
          >
            {imagePreview ? (
              <>
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white font-medium flex items-center gap-2">
                    <Camera className="w-5 h-5" /> 更换照片
                  </span>
                </div>
              </>
            ) : (
              <div className="text-slate-400 flex flex-col items-center">
                <Upload className="w-8 h-8 mb-2" />
                <p className="text-sm font-medium">点击上传或拍照</p>
                <p className="text-xs mt-1">AI 将自动识别详情</p>
              </div>
            )}
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*" 
              capture="environment"
              className="hidden" 
              onChange={handleFileChange}
              required={!imagePreview}
            />
          </div>
          {isAnalyzing && (
            <div className="mt-3 flex items-center gap-2 text-indigo-600 text-sm animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>正在使用 AI 分析图片...</span>
            </div>
          )}
        </div>

        {/* Basic Info */}
        <div className="p-6 space-y-5 border-b border-slate-100">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">商品名称</label>
            <input 
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="例如：耐克 Air Zoom"
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">类别</label>
              <input 
                type="text" 
                value={category}
                onChange={e => setCategory(e.target.value)}
                placeholder="运动鞋"
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
             <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">单价 (¥)</label>
              <input 
                type="number" 
                min="0.01"
                step="0.01"
                value={unitCost}
                onChange={e => setUnitCost(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          </div>
        </div>

        {/* Variants Section */}
        <div className="p-6 bg-slate-50/50">
          <div className="flex justify-between items-center mb-3">
             <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
               库存明细 (尺码 & 颜色)
               <span className="text-xs font-normal text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">总计: {totalQuantity} 双</span>
             </label>
             <button 
               type="button" 
               onClick={handleAddVariant}
               className="text-indigo-600 text-xs font-medium flex items-center gap-1 hover:text-indigo-700"
             >
               <Plus className="w-4 h-4" /> 添加规格
             </button>
          </div>
          
          <div className="space-y-3">
            {variants.map((variant, index) => (
              <div key={variant.id} className="flex gap-2 items-start bg-white p-3 rounded-xl border border-slate-200 shadow-sm animate-in slide-in-from-left-2">
                <div className="flex-1">
                  <label className="text-[10px] text-slate-400 mb-1 block">尺码</label>
                  <input 
                    type="text" 
                    value={variant.size}
                    onChange={(e) => updateVariant(variant.id, 'size', e.target.value)}
                    placeholder="如: 42"
                    className="w-full px-2 py-1.5 rounded-md border border-slate-200 text-sm focus:border-indigo-500 focus:outline-none"
                    required
                  />
                </div>
                <div className="flex-[1.5]">
                  <label className="text-[10px] text-slate-400 mb-1 block">颜色</label>
                  <input 
                    type="text" 
                    value={variant.color}
                    onChange={(e) => updateVariant(variant.id, 'color', e.target.value)}
                    placeholder="如: 黑白"
                    className="w-full px-2 py-1.5 rounded-md border border-slate-200 text-sm focus:border-indigo-500 focus:outline-none"
                    required
                  />
                </div>
                <div className="flex-[0.8]">
                  <label className="text-[10px] text-slate-400 mb-1 block">数量</label>
                  <input 
                    type="number" 
                    min="1"
                    value={variant.quantity}
                    onChange={(e) => updateVariant(variant.id, 'quantity', parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 rounded-md border border-slate-200 text-sm focus:border-indigo-500 focus:outline-none text-center"
                    required
                  />
                </div>
                {variants.length > 1 && (
                  <button 
                    type="button"
                    onClick={() => handleRemoveVariant(variant.id)}
                    className="mt-6 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer Info */}
        <div className="p-6">
          <div className="mb-4">
             <label className="block text-sm font-medium text-slate-700 mb-1">备注描述</label>
             <textarea 
               value={description}
               onChange={e => setDescription(e.target.value)}
               className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 h-20 resize-none"
             ></textarea>
          </div>
          
          <div className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-slate-700 mb-4">
             <span className="text-sm font-medium">总进货成本</span>
             <span className="font-bold text-lg">¥{calculatedTotalCost.toFixed(2)}</span>
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
          <button 
            type="button" 
            onClick={onCancel}
            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-100 transition-colors"
          >
            取消
          </button>
          <button 
            type="submit" 
            className="flex-1 px-4 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
          >
            <Check className="w-5 h-5" /> 保存库存
          </button>
        </div>
      </form>
    </div>
  );
};