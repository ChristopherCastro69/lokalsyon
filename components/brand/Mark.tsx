type Props = { className?: string; size?: number };

/**
 * Lokalsyon mark — a surveyor's location glyph: crosshair tick marks around
 * a circle with an off-center solid dot (the "pin drop").
 */
export default function Mark({ className, size = 20 }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="8"
        stroke="currentColor"
        fill="none"
        strokeWidth="1.25"
      />
      <path
        d="M12 2.5 V5 M12 19 V21.5 M2.5 12 H5 M19 12 H21.5"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <circle cx="13" cy="11" r="2.25" fill="currentColor" />
    </svg>
  );
}
