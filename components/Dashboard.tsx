import React from 'react';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { DashboardStats, SaleRecord, StockItem } from '../types';
import { DollarSign, Package, TrendingUp, ShoppingBag, Trophy, ArrowUpRight } from 'lucide-react';

interface DashboardProps {
  stats: DashboardStats;
  sales: SaleRecord[];
  stocks: StockItem[];
}

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between relative overflow-hidden group">
    <div className="relative z-10">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
    </div>
    <div className={`p-3 rounded-xl ${color} bg-opacity-10 text-opacity-100 relative z-10`}>
      {icon}
    </div>
    <div className={`absolute -right-4 -bottom-4 w-24 h-24 ${color} bg-opacity-5 rounded-full group-hover:scale-150 transition-transform duration-500`}></div>
  </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ stats, sales, stocks }) => {
  // Prepare data for chart: Profit by Category
  const categoryData = React.useMemo(() => {
    const data: Record<string, number> = {};
    sales.forEach(sale => {
      const stock = stocks.find(s => s.id === sale.stockId);
      const cat = stock?.category || '未分类';
      data[cat] = (data[cat] || 0) + sale.profit;
    });
    return Object.entries(data)
      .map(([name, profit]) => ({ name, profit }))
      .sort((a, b) => b.profit - a.profit);
  }, [sales, stocks]);

  // Prepare data for chart: Profit Trend (Last 7 Days Continuous)
  const trendData = React.useMemo(() => {
    const profitByDate: Record<string, number> = {};
    
    // 1. Sum profits by local date key
    sales.forEach(sale => {
      const d = new Date(sale.saleDate);
      const localDateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      profitByDate[localDateKey] = (profitByDate[localDateKey] || 0) + sale.profit;
    });

    // 2. Generate last 7 days array (including today) to ensure continuous axis
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;
      
      result.push({
        name: `${parseInt(month)}/${parseInt(day)}`, // Format: M/D
        fullDate: dateKey,
        profit: profitByDate[dateKey] || 0
      });
    }
      
    return result;
  }, [sales]);

  // Calculate Best Sellers
  const bestSellers = React.useMemo(() => {
    const productSales: Record<string, { name: string, qty: number, revenue: number, img?: string }> = {};
    
    sales.forEach(sale => {
       const stock = stocks.find(s => s.id === sale.stockId);
       // Handle deleted stock case
       const stockName = stock?.name || '已删除商品';
       const stockImg = stock?.imageUrl;
       
       if (!productSales[sale.stockId]) {
         productSales[sale.stockId] = { name: stockName, qty: 0, revenue: 0, img: stockImg };
       }
       productSales[sale.stockId].qty += sale.quantitySold;
       productSales[sale.stockId].revenue += sale.totalRevenue;
    });

    return Object.values(productSales)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [sales, stocks]);

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-6 pb-20">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">仪表盘</h1>
        <p className="text-slate-500">您的鞋店经营概况。</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="总利润" 
          value={`¥${stats.totalProfit.toLocaleString()}`} 
          icon={<DollarSign className="w-6 h-6 text-emerald-600" />} 
          color="bg-emerald-500"
        />
        <StatCard 
          title="库存总值" 
          value={`¥${stats.totalInventoryValue.toLocaleString()}`} 
          icon={<Package className="w-6 h-6 text-blue-600" />} 
          color="bg-blue-500"
        />
        <StatCard 
          title="库存数量" 
          value={stats.totalInventoryCount.toString()} 
          icon={<ShoppingBag className="w-6 h-6 text-indigo-600" />} 
          color="bg-indigo-500"
        />
        <StatCard 
          title="今日销量" 
          value={stats.salesToday.toString()} 
          icon={<TrendingUp className="w-6 h-6 text-orange-600" />} 
          color="bg-orange-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profit Trend Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">近7日利润趋势</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 12}} 
                  padding={{ left: 10, right: 10 }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 12}} 
                  tickFormatter={(value) => `¥${value}`} 
                />
                <Tooltip 
                    cursor={{stroke: '#cbd5e1', strokeWidth: 1}}
                    formatter={(value: number) => [`¥${value}`, '利润']}
                    labelStyle={{ color: '#64748b', marginBottom: '0.25rem' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="profit" 
                  stroke="#4f46e5" 
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Best Sellers List */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-semibold text-slate-900">热销排行榜</h3>
          </div>
          <div className="space-y-4">
            {bestSellers.length > 0 ? (
              bestSellers.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 shrink-0 overflow-hidden border border-slate-100">
                     {item.img ? (
                       <img src={item.img} alt={item.name} className="w-full h-full object-cover" />
                     ) : (
                       <div className="w-full h-full flex items-center justify-center text-slate-300 font-bold">{idx + 1}</div>
                     )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{item.name}</p>
                    <p className="text-xs text-slate-500">已售 {item.qty} 双</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-700">¥{item.revenue}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-slate-400 py-8 text-sm">暂无销量数据</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};