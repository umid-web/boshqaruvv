import { Link } from 'react-router-dom';
import './NotFound.scss';

const NotFound = () => (
  <div className="not-found-page">
    <span className="not-found-page__code">404</span>
    <h1>Sahifa topilmadi</h1>
    <p>Bu sahifa mavjud emas yoki boshqa joyga ko‘chirilgan.</p>
    <Link to="/admin" className="btn btn--primary">Boshqaruv paneliga qaytish</Link>
  </div>
);

export default NotFound;
