'use client';

import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { formatTokenAmount, MT_DECIMALS } from '@/lib/token';

type EarningsPoint = {
  date: string;
  amount: string;
};

type EarningsChartProps = {
  data: EarningsPoint[];
};

const ranges = [
  { key: '7d', days: 7 },
  { key: '30d', days: 30 },
  { key: 'all', days: null },
] as const;

export function EarningsChart({ data }: EarningsChartProps) {
  const locale = useLocale();
  const t = useTranslations('earnings');
  const [range, setRange] = useState<(typeof ranges)[number]['key']>('7d');

  const chartData = useMemo(() => {
    const activeRange = ranges.find((item) => item.key === range) ?? ranges[0];
    const sorted = [...data].sort((left, right) => left.date.localeCompare(right.date));
    const sliced = activeRange.days ? sorted.slice(-activeRange.days) : sorted;

    return sliced.map((item) => ({
      ...item,
      label: new Intl.DateTimeFormat(locale, { month: 'numeric', day: 'numeric' }).format(
        new Date(item.date)
      ),
      mtAmount: Number(formatTokenAmount(BigInt(item.amount), MT_DECIMALS, 4)),
    }));
  }, [data, locale, range]);

  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">{t('trend_title')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('trend_description')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {ranges.map((item) => (
            <Button
              key={item.key}
              onClick={() => setRange(item.key)}
              type="button"
              variant={range === item.key ? 'default' : 'outline'}
            >
              {item.key === '7d' ? t('range_7d') : item.key === '30d' ? t('range_30d') : t('range_all')}
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-6 h-80">
        {chartData.length > 0 ? (
          <ResponsiveContainer height="100%" width="100%">
            <BarChart data={chartData}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis
                axisLine={false}
                fontSize={12}
                tickFormatter={(value: number) => `${value} MT`}
                tickLine={false}
              />
              <Tooltip
                formatter={(value: number | string) => [`${String(value)} MT`, t('chart_value')]}
                labelFormatter={(value: string | number) => `${t('chart_date')}: ${String(value)}`}
              />
              <Bar dataKey="mtAmount" fill="hsl(var(--primary))" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 text-sm text-muted-foreground">
            {t('empty_chart')}
          </div>
        )}
      </div>
    </section>
  );
}
