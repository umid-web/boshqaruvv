import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CHART_COLORS, tooltipProps, legendProps } from '../chartTheme';

/** Talabalarning kurslar bo‘yicha taqsimoti. data: [{ name, value }] */
const CourseDistributionChart = ({ data = [] }) => (
  <ResponsiveContainer width="100%" height={300}>
    <PieChart>
      <Pie
        data={data}
        dataKey="value"
        nameKey="name"
        cx="50%"
        cy="46%"
        outerRadius={92}
        paddingAngle={2}
        stroke="var(--surface)"
        strokeWidth={2}
      >
        {data.map((entry, index) => (
          <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
        ))}
      </Pie>
      <Tooltip {...tooltipProps} formatter={(v, name) => [`${v} nafar`, name]} />
      <Legend {...legendProps} />
    </PieChart>
  </ResponsiveContainer>
);

export default CourseDistributionChart;
