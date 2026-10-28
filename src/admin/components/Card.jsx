import './Card.scss';

/**
 * Umumiy karta konteyneri: sarlavha, ixtiyoriy tavsif, o‘ng tomonda amallar
 * va DEMO belgisi.
 */
const Card = ({ title, subtitle, actions, demo = false, className = '', children }) => (
  <section className={`card ${className}`.trim()}>
    {(title || actions) && (
      <header className="card__header">
        <div className="card__heading">
          {title && (
            <h3 className="card__title">
              {title}
              {demo && <span className="badge badge--muted">DEMO</span>}
            </h3>
          )}
          {subtitle && <p className="card__subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="card__actions">{actions}</div>}
      </header>
    )}
    <div className="card__body">{children}</div>
  </section>
);

export default Card;
