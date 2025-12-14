import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Check, Plus, Trash2, ArrowLeft, ImageOff } from 'lucide-react';
import { StockItem, StockVariant } from '../types';
import { generateId } from '../App';

interface StockFormProps {
  initialData?: StockItem; // Optional prop for edit mode
  onAddStock: (item: StockItem) => void;
  onUpdateStock?: (item: StockItem) => void;
  onCancel: () => void;
}

export const StockForm: React.FC<StockFormProps> = ({ initialData, onAddStock, onUpdateStock, onCancel }) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isProcessingImg, setIsProcessingImg] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [unitCost, setUnitCost] = useState<number | string>('');
  
  const [variants, setVariants] = useState<StockVariant[]>([
    { id: generateId(), size: '', color: '', quantity: 1 }
  ]);

  // Load initial data if editing
  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setCategory(initialData.category || '');
      setDescription(initialData.description || '');
      setUnitCost(initialData.unitCost);
      setImagePreview(initialData.imageUrl || null);
      if (initialData.variants && initialData.variants.length > 0) {
        setVariants(initialData.variants);
      }
    }
  }, [initialData]);

  const totalQuantity = variants.reduce((sum, v) => sum + (Number(v.quantity) || 0), 0);
  const calculatedTotalCost = totalQuantity * (Number(unitCost) || 0);

  // Aggressive Image Compression for LocalStorage
  const compressImage = (base64Str: string, maxWidth = 600, quality = 0.6): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Scale down keeping aspect ratio
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Compress strictly to jpeg
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve(base64Str);
        }
      };
      img.onerror = () => resolve(base64Str);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Basic size check before processing (limit 10MB input)
      if (file.size > 10 * 1024 * 1024) {
        alert('图片太大，请选择小一点的图片。');
        return;
      }

      setIsProcessingImg(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          const compressed = await compressImage(base64);
          setImagePreview(compressed);
        } catch (err) {
          console.error("Compression failed", err);
          setImagePreview(base64);
        } finally {
          setIsProcessingImg(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddVariant = () => {
    const lastVariant = variants[variants.length - 1];
    setVariants([
      ...variants, 
      { 
        id: generateId(), 
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
    let finalValue = value;
    if (field === 'quantity') {
       if (value === '') finalValue = 0;
       else finalValue = parseInt(value.toString()) || 0;
    }
    setVariants(variants.map(v => v.id === id ? { ...v, [field]: finalValue } : v));
  };
  
  const handleCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      setUnitCost('');
      return;
    }
    if (val.length > 1 && val.startsWith('0') && val[1] !== '.') {
      setUnitCost(val.replace(/^0+/, ''));
    } else {
      setUnitCost(val);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (totalQuantity === 0) {
      alert("请至少添加一件库存数量。");
      return;
    }

    const itemData: StockItem = {
      id: initialData ? initialData.id : generateId(), // Keep ID if editing
      name,
      category,
      description,
      imageUrl: imagePreview || undefined,
      initialQuantity: initialData ? initialData.initialQuantity : totalQuantity, // Keep initial if editing
      currentQuantity: totalQuantity, // Reset current based on variants
      unitCost: Number(unitCost),
      totalCost: calculatedTotalCost,
      purchaseDate: initialData ? initialData.purchaseDate : new Date().toISOString(),
      variants: variants.map(v => ({...v, quantity: Number(v.quantity)}))
    };

    if (initialData && onUpdateStock) {
      onUpdateStock(itemData);
    } else {
      onAddStock(itemData);
    }
  };

  return (
    <div className="pb-20">
      <header className="mb-6 flex items-center gap-2">
        <button onClick={onCancel} className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-500">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{initialData ? '编辑库存' : '新增库存'}</h1>
          <p className="text-slate-500 text-sm">{initialData ? '修改商品信息或调整库存' : '登记新进货鞋子'}</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Image Upload Section */}
        <div className="p-6 border-b border-slate-100">
          <label className="block text-sm font-medium text-slate-700 mb-2">鞋子照片</label>
          <div 
            onClick={() => !isProcessingImg && fileInputRef.current?.click()}
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
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setImagePreview(null); }}
                  className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full text-slate-600 shadow-sm z-10"
                >
                  <ImageOff className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="text-slate-400 flex flex-col items-center">
                <Upload className="w-8 h-8 mb-2" />
                <p className="text-sm font-medium">{isProcessingImg ? "压缩处理中..." : "点击上传或拍照"}</p>
                <p className="text-xs mt-1">建议横向拍摄</p>
              </div>
            )}
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleFileChange}
              disabled={isProcessingImg}
            />
          </div>
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
                onChange={handleCostChange}
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
               库存明细
               <span className="text-xs font-normal text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">总计: {totalQuantity} 双</span>
             </label>
             <button 
               type="button" 
               onClick={handleAddVariant}
               className="text-indigo-600 text-xs font-medium flex items-center gap-1 hover:text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md"
             >
               <Plus className="w-4 h-4" /> 添加规格
             </button>
          </div>
          
          <div className="space-y-3">
            {variants.map((variant, index) => (
              <div key={variant.id} className="flex gap-2 items-start bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex-1">
                  <label className="text-[10px] text-slate-400 mb-1 block">尺码</label>
                  <input 
                    type="text" 
                    value={variant.size}
                    onChange={(e) => updateVariant(variant.id, 'size', e.target.value)}
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
                    className="w-full px-2 py-1.5 rounded-md border border-slate-200 text-sm focus:border-indigo-500 focus:outline-none"
                    required
                  />
                </div>
                <div className="flex-[0.8]">
                  <label className="text-[10px] text-slate-400 mb-1 block">数量</label>
                  <input 
                    type="number" 
                    min="0"
                    value={variant.quantity.toString()}
                    onChange={(e) => updateVariant(variant.id, 'quantity', e.target.value)}
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
             <span className="text-sm font-medium">总库存价值</span>
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
            disabled={isProcessingImg}
            className={`flex-1 px-4 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 ${isProcessingImg ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            <Check className="w-5 h-5" /> {initialData ? '保存修改' : '确认添加'}
          </button>
        </div>
      </form>
    </div>
  );
};