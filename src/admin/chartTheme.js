// Recharts uchun umumiy mavzu. CSS o‘zgaruvchilari ishlatilgani uchun
// grafiklar yorug‘/qorong‘i mavzuga avtomatik moslashadi.

export const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-5)',
  'var(--chart-4)',
];

export const axisProps = {
  tick: { fill: 'var(--text-muted)', fontSize: 12 },
  axisLine: { stroke: 'var(--border)' },
  tickLine: false,
};

export const gridProps = {
  stroke: 'var(--border)',
  strokeDasharray: '3 3',
  vertical: false,
};

export const tooltipProps = {
  contentStyle: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    boxShadow: 'var(--shadow-md)',
    color: 'var(--text)',
    fontSize: 13,
  },
  labelStyle: { color: 'var(--text)', fontWeight: 600 },
  itemStyle: { color: 'var(--text-muted)' },
  cursor: { fill: 'var(--surface-2)', stroke: 'var(--border)' },
};

export const legendProps = {
  iconType: 'circle',
  iconSize: 8,
  wrapperStyle: { fontSize: 12, color: 'var(--text-muted)' },
};
