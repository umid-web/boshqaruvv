import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { tooltipProps, legendProps } from '../chartTheme';

// To‘langan, qisman to‘langan, to‘lanmagan
const COLORS = ['var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)'];

/** To‘lovlar holati (donut). data: [{ status, value }] — qiymatlar foizda. */
const PaymentsStatusChart = ({ data = [] }) => (
  <ResponsiveContainer width="100%" height={300}>
    <PieChart>
      <Pie
        data={data}
        dataKey="value"
        nameKey="status"
        cx="50%"
        cy="46%"
        innerRadius={62}
        outerRadius={92}
        paddingAngle={3}
        stroke="var(--surface)"
        strokeWidth={2}
      >
        {data.map((entry, index) => (
          <Cell key={entry.status} fill={COLORS[index % COLORS.length]} />
        ))}
      </Pie>
      <Tooltip {...tooltipProps} formatter={(v, name) => [`${v}%`, name]} />
      <Legend {...legendProps} />
    </PieChart>
  </ResponsiveContainer>
);

export default PaymentsStatusChart;
