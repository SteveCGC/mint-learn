declare module 'recharts' {
  import type { ComponentType, ReactNode } from 'react';

  export const ResponsiveContainer: ComponentType<{
    width?: string | number;
    height?: string | number;
    children?: ReactNode;
  }>;

  export const BarChart: ComponentType<Record<string, unknown>>;
  export const Bar: ComponentType<Record<string, unknown>>;
  export const CartesianGrid: ComponentType<Record<string, unknown>>;
  export const Tooltip: ComponentType<Record<string, unknown>>;
  export const XAxis: ComponentType<Record<string, unknown>>;
  export const YAxis: ComponentType<Record<string, unknown>>;
}
