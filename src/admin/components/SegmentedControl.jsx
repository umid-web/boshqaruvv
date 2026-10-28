import './SegmentedControl.scss';

/** Kichik tab-ko‘rinishidagi tanlagich. options: [{ value, label }] */
const SegmentedControl = ({ options, value, onChange, label }) => (
  <div className="segmented" role="group" aria-label={label}>
    {options.map((o) => (
      <button
        key={o.value}
        type="button"
        className={o.value === value ? 'segmented__btn is-active' : 'segmented__btn'}
        aria-pressed={o.value === value}
        onClick={() => onChange(o.value)}
      >
        {o.label}
      </button>
    ))}
  </div>
);

export default SegmentedControl;
