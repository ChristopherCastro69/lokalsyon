// Deep-link builders for navigation handoff. No SDKs, no tokens — these are
// URL schemes all major map apps understand.

export type LatLng = { lat: number; lng: number };

export function wazeLink(lat: number, lng: number): string {
  // Waze's URL scheme doesn't accept an origin — it always routes from the
  // user's current location, which requires granting location permission to
  // the Waze app or waze.com.
  return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
}

export function googleMapsLink(
  destLat: number,
  destLng: number,
  origin?: LatLng | null,
): string {
  const base = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`;
  if (origin) {
    return `${base}&origin=${origin.lat},${origin.lng}&travelmode=driving`;
  }
  return base;
}
