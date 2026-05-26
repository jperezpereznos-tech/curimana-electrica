'use client'

import { lazy, Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { AnimatedNumber } from '@/components/animated-number'
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
            contentStyle={{ borderRadius: '6px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
          />
          <mod.Bar dataKey="total" fill="#0a4a3a" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={800} animationEasing="ease-out" />
            </mod.BarChart>
          </mod.ResponsiveContainer>
        </CardContent>
      </Card>
    )
  }))
)

const SectorConsumptionChartInner = lazy(() =>
  import('recharts').then(mod => {
    const COLORS = ['#0a4a3a', '#2d7a5a', '#e8a020', '#4a7a3a', '#062e24']
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
          isAnimationActive
          animationDuration={800}
          animationEasing="ease-out"
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

const accentStyles = {
  blue: 'border-t-2 border-t-muni-blue bg-muni-blue-light/50 dark:bg-muni-blue/10',
  amber: 'border-t-2 border-t-muni-amber bg-muni-amber-light/50 dark:bg-muni-amber/10',
  green: 'border-t-2 border-t-muni-green bg-muni-green-light/50 dark:bg-muni-green/10',
  red: 'border-t-2 border-t-destructive bg-destructive/[0.04] dark:bg-destructive/10',
} as const

const accentIconBg = {
  blue: 'bg-muni-blue/10 text-muni-blue',
  amber: 'bg-muni-gold/15 text-muni-amber',
  green: 'bg-muni-green/10 text-muni-green',
  red: 'bg-destructive/10 text-destructive',
} as const

export function KPICard({ title, value, subtext, icon, trend, accent }: KPIProps) {
  const numericValue = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]/g, '')) || 0
  const isCurrency = typeof value === 'string' && value.startsWith('S/')

  return (
    <Card className={accent ? accentStyles[accent] : ''}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && accent ? (
          <div className={`p-2 rounded-lg ${accentIconBg[accent]}`}>{icon}</div>
        ) : icon}
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-heading font-bold tracking-tight">
          <AnimatedNumber
            value={numericValue}
            decimals={isCurrency ? 2 : 0}
            prefix={isCurrency ? 'S/ ' : ''}
            duration={1000}
          />
        </div>
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
