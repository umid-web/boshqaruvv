import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { axisProps, gridProps, tooltipProps, legendProps } from '../chartTheme';

/** Yangi, faol va faol bo‘lmagan talabalar. data: [{ name, new, active, inactive }] */
const StudentStatsChart = ({ data = [] }) => (
  <ResponsiveContainer width="100%" height={300}>
    <BarChart data={data} margin={{ top: 10, right: 16, left: -12, bottom: 0 }} barGap={4}>
      <CartesianGrid {...gridProps} />
      <XAxis dataKey="name" {...axisProps} />
      <YAxis {...axisProps} />
      <Tooltip {...tooltipProps} />
      <Legend {...legendProps} />
      <Bar dataKey="new" name="Yangi" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
      <Bar dataKey="active" name="Faol" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
      <Bar dataKey="inactive" name="Faol emas" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
    </BarChart>
  </ResponsiveContainer>
);

export default StudentStatsChart;
