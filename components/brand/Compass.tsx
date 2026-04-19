type Props = { className?: string; size?: number };

/** Decorative compass rose — North-forward, for map corners / decoration. */
export default function Compass({ className, size = 48 }: Props) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <circle
        cx="32"
        cy="32"
        r="28"
        stroke="currentColor"
        fill="none"
        strokeWidth="0.75"
        opacity="0.45"
      />
      <circle
        cx="32"
        cy="32"
        r="22"
        stroke="currentColor"
        fill="none"
        strokeWidth="0.75"
        opacity="0.3"
      />
      {/* cardinal points */}
      <path
        d="M32 6 L34 32 L32 58 L30 32 Z"
        fill="currentColor"
        opacity="0.7"
      />
      <path
        d="M6 32 L32 30 L58 32 L32 34 Z"
        fill="currentColor"
        opacity="0.4"
      />
      {/* N label */}
      <text
        x="32"
        y="4"
        fontFamily="var(--font-mono)"
        fontSize="6"
        textAnchor="middle"
        fill="currentColor"
        opacity="0.8"
      >
        N
      </text>
      <circle cx="32" cy="32" r="1.2" fill="currentColor" />
    </svg>
  );
}
