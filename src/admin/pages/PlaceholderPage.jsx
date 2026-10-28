import { Construction } from 'lucide-react';
import './PlaceholderPage.scss';

const PlaceholderPage = ({ title }) => (
  <div className="placeholder-page">
    <span className="placeholder-page__icon">
      <Construction size={28} />
    </span>
    <h1>{title}</h1>
    <p className="demo-label">DEMO — bu sahifa hozircha ishlab chiqilmoqda.</p>
  </div>
);

export default PlaceholderPage;
