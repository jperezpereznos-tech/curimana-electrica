'use client'

import { lazy, Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import type { KPIProps, ChartDataEntry } from '@/types/views'

const RevenueChartInner = lazy(() =>
  import('recharts').then(mod => ({
    default: ({ data }: { data: ChartDataEntry[] }) => (
      <Card className="col-span-1 md:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Recaudación por Periodo</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <mod.ResponsiveContainer width="100%" height="100%">
            <mod.BarChart data={data}>
              <mod.CartesianGrid strokeDasharray="3 3" vertical={false} />
              <mod.XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
              <mod.YAxis
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `S/${value}`}
              />
              <mod.Tooltip
                formatter={(value) => [formatCurrency(Number(value)), 'Recaudado']}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <mod.Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </mod.BarChart>
          </mod.ResponsiveContainer>
        </CardContent>
      </Card>
    )
  }))
)

const SectorConsumptionChartInner = lazy(() =>
  import('recharts').then(mod => {
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']
    return {
      default: ({ data }: { data: ChartDataEntry[] }) => (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Distribución por Sector (kWh)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <mod.ResponsiveContainer width="100%" height="100%">
              <mod.PieChart>
                <mod.Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <mod.Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </mod.Pie>
                <mod.Tooltip />
              </mod.PieChart>
            </mod.ResponsiveContainer>
          </CardContent>
        </Card>
      )
    }
  })
)

function ChartSkeleton() {
  return <div className="h-[300px] bg-muted/30 animate-pulse rounded-lg" />
}

export function KPICard({ title, value, subtext, icon, trend }: KPIProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">
          {subtext}
          {trend && (
            <span className={`ml-1 ${trend > 0 ? 'text-success' : 'text-destructive'}`}>
              {trend > 0 ? '+' : ''}{trend}%
            </span>
          )}
        </p>
      </CardContent>
    </Card>
  )
}

export function RevenueChart({ data }: { data: ChartDataEntry[] }) {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <RevenueChartInner data={data} />
    </Suspense>
  )
}

export function SectorConsumptionChart({ data }: { data: ChartDataEntry[] }) {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <SectorConsumptionChartInner data={data} />
    </Suspense>
  )
}
