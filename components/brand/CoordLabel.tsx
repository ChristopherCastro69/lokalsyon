type Props = {
  lat: number;
  lng: number;
  className?: string;
  precision?: number;
};

/** Render coords in DMS-ish format — feels like a survey mark. */
export default function CoordLabel({
  lat,
  lng,
  className,
  precision = 4,
}: Props) {
  const latAbs = Math.abs(lat).toFixed(precision);
  const lngAbs = Math.abs(lng).toFixed(precision);
  const latDir = lat >= 0 ? "N" : "S";
  const lngDir = lng >= 0 ? "E" : "W";
  return (
    <span
      className={`font-mono text-[11px] tracking-tight text-ink-3 ${className ?? ""}`}
    >
      {latAbs}°{latDir} &nbsp;·&nbsp; {lngAbs}°{lngDir}
    </span>
  );
}
