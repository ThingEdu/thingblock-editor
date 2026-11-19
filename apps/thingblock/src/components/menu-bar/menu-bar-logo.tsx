/**
 * The ThingBlock wordmark.
 * @param props - React props.
 * @param props.className - The class that sizes it.
 * @returns The logo as an SVG.
 */
const MenuBarLogo = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 175 40"
    overflow="visible"
    aria-label="ThingBlock"
    role="img"
    className={className}
  >
    <defs>
      <linearGradient id="tb-logo-orange" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FFD166" />
        <stop offset="100%" stopColor="#FF7B35" />
      </linearGradient>
      <linearGradient id="tb-logo-lime" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#D9F99D" />
        <stop offset="100%" stopColor="#84CC16" />
      </linearGradient>
      <filter id="tb-logo-shadow">
        <feDropShadow dx="1" dy="2" stdDeviation="0.5" floodColor="#0D2800" floodOpacity="0.75" />
      </filter>
    </defs>
    <text
      x="2"
      y="30"
      fontFamily="'Fredoka One', cursive"
      fontSize="31"
      strokeWidth="5.5"
      strokeLinejoin="round"
      style={{ filter: 'url(#tb-logo-shadow)' }}
    >
      <tspan fill="url(#tb-logo-orange)" stroke="white" style={{ paintOrder: 'stroke fill' }}>
        {'Thing'}
      </tspan>
      <tspan fill="url(#tb-logo-lime)" stroke="white" style={{ paintOrder: 'stroke fill' }}>
        {'Block'}
      </tspan>
    </text>
  </svg>
)

export default MenuBarLogo
