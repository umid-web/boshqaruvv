import { getInitials } from '../../utils/format';
import './Avatar.scss';

const TONES = ['primary', 'success', 'warning', 'info', 'danger'];

// Ism bo‘yicha doimiy rang tanlaydi (har safar bir xil)
const toneFor = (seed) => {
  let hash = 0;
  for (const ch of String(seed)) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return TONES[hash % TONES.length];
};

const Avatar = ({ firstName, lastName, size = 36 }) => (
  <span
    className={`avatar avatar--${toneFor(`${firstName}${lastName}`)}`}
    style={{ width: size, height: size, fontSize: size * 0.38 }}
    aria-hidden="true"
  >
    {getInitials(lastName, firstName)}
  </span>
);

export default Avatar;
