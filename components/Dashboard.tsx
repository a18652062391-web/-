import React from 'react';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { DashboardStats, SaleRecord, StockItem } from '../types';
import { DollarSign, Package, TrendingUp, ShoppingBag } from 'lucide-react';

interface DashboardProps {
  stats: DashboardStats;
  sales: SaleRecord[];
  stocks: StockItem[];
}

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
    <div>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
    </div>
    <div className={`p-3 rounded-xl ${color} bg-opacity-10 text-opacity-100`}>
      {icon}
    </div>
  </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ stats, sales, stocks }) => {
  // Prepare data for chart: Profit by Category
  const categoryData = React.useMemo(() => {
    const data: Record<string, number> = {};
    sales.forEach(sale => {
      const stock = stocks.find(s => s.id === sale.stockId);
      if (stock && stock.category) {
        data[stock.category] = (data[stock.category] || 0) + sale.profit;
      } else {
        data['其他'] = (data['其他'] || 0) + sale.profit;
      }
    });
    return Object.entries(data).map(([name, profit]) => ({ name, profit }));
  }, [sales, stocks]);

  // Prepare data for chart: Profit Trend (Daily)
  const trendData = React.useMemo(() => {
    const data: Record<string, number> = {};
    
    sales.forEach(sale => {
      // Use ISO date string (YYYY-MM-DD) as key for grouping and sorting
      const isoDate = new Date(sale.saleDate).toISOString().split('T')[0];
      data[isoDate] = (data[isoDate] || 0) + sale.profit;
    });

    // Convert to array, sort by date, map to display format
    const sortedData = Object.entries(data)
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([date, profit]) => {
         const d = new Date(date);
         return {
           name: `${d.getMonth() + 1}/${d.getDate()}`, // Format: M/D
           fullDate: date,
           profit
         };
      });
      
    // If no data, return empty array
    if (sortedData.length === 0) return [];

    // Optional: If you want to show at least a few days of context if there's only 1 data point
    return sortedData;
  }, [sales]);

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profit Trend Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">利润趋势</h3>
          {trendData.length > 0 ? (
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
          ) : (
             <div className="h-64 flex items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
               暂无趋势数据
             </div>
          )}
        </div>

        {/* Category Profit Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">分类利润占比</h3>
          {categoryData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} tickFormatter={(value) => `¥${value}`} />
                  <Tooltip 
                     cursor={{fill: '#f1f5f9'}}
                     formatter={(value: number) => `¥${value}`}
                     contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="profit" name="利润" radius={[4, 4, 0, 0]}>
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              暂无销售数据
            </div>
          )}
        </div>
      </div>
    </div>
  );
};