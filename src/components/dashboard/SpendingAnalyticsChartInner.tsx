'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

export interface ChartDataPoint {
  day: string;
  income: number;
  expenses: number;
}

interface ChartInnerProps {
  data: ChartDataPoint[];
}

export default function SpendingAnalyticsChartInner({ data }: ChartInnerProps) {
  return (
    <div className="w-full">
      {/* Visually Hidden Accessibility Data Table */}
      <table className="sr-only" aria-label="Weekly Financial Income and Expenses Breakdown">
        <caption>Weekly Income and Expenses Summary (in Nigerian Naira)</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Income (Credits)</th>
            <th scope="col">Expenses (Debits)</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.day}>
              <td>{item.day}</td>
              <td>₦{(item.income / 100).toLocaleString('en-NG')}</td>
              <td>₦{(item.expenses / 100).toLocaleString('en-NG')}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Chart Legend with Explicit Text Markers */}
      <div className="flex items-center justify-between mb-4 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-[var(--brand-primary)] inline-block"></span>
            <span className="font-semibold text-[var(--text-primary)]">Income (Credits +)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-[#FF6B4A] dark:bg-[#FF6B4A] inline-block border border-[var(--accent-terracotta)]"></span>
            <span className="font-semibold text-[var(--text-primary)]">Expenses (Debits -)</span>
          </div>
        </div>
        <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
          Past 7 Days
        </span>
      </div>

      <div className="h-64 w-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.6} />
            <XAxis dataKey="day" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
            <YAxis
              stroke="var(--text-muted)"
              fontSize={10}
              tickLine={false}
              tickFormatter={(val) => `₦${val / 1000}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-color)',
                borderRadius: '0.75rem',
                color: 'var(--text-primary)',
                fontSize: '12px',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
              }}
              formatter={(value: number, name: string) => [
                `₦${(value / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
                name === 'income' ? 'Income (+)' : 'Expenses (-)',
              ]}
            />
            <Legend display="none" />
            <Bar dataKey="income" fill="var(--brand-primary)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" fill="#FF6B4A" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
