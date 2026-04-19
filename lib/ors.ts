// OpenRouteService helpers. All calls are server-side so ORS_API_KEY never
// reaches the browser. ORS free tier: 2,000 requests/day, no credit card.
// NOTE: ORS uses [longitude, latitude] coordinate order (GeoJSON convention),
// opposite of Leaflet's [lat, lng]. All helper inputs use {lat, lng} objects
// to avoid ordering bugs; the helpers handle conversion internally.

const ORS_BASE = "https://api.openrouteservice.org";

export type LatLng = { lat: number; lng: number };

export function isOrsConfigured(): boolean {
  return Boolean(process.env.ORS_API_KEY);
}

function authHeaders() {
  return {
    Authorization: process.env.ORS_API_KEY as string,
    "Content-Type": "application/json",
    Accept: "application/json, application/geo+json",
  };
}

export type DirectionsResult = {
  coordinates: [number, number][]; // [lng, lat] pairs along the route
  distanceMeters: number;
  durationSeconds: number;
};

export async function getDirections(
  from: LatLng,
  to: LatLng,
): Promise<DirectionsResult> {
  if (!isOrsConfigured()) throw new Error("ORS_API_KEY is not set.");

  const body = {
    coordinates: [
      [from.lng, from.lat],
      [to.lng, to.lat],
    ],
    instructions: false,
  };

  const res = await fetch(
    `${ORS_BASE}/v2/directions/driving-car/geojson`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
      cache: "no-store",
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ORS directions failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    features: Array<{
      geometry: { coordinates: [number, number][] };
      properties: { summary: { distance: number; duration: number } };
    }>;
  };

  const feature = json.features[0];
  if (!feature) throw new Error("ORS directions returned no route.");

  return {
    coordinates: feature.geometry.coordinates,
    distanceMeters: feature.properties.summary.distance,
    durationSeconds: feature.properties.summary.duration,
  };
}

export type OptimizedStop = {
  jobId: number; // matches the index you passed in `jobs`
  arrivalSeconds: number; // cumulative travel time from the origin
  location: [number, number]; // [lng, lat]
};

export type OptimizationResult = {
  stops: OptimizedStop[];
  totalDistanceMeters: number;
  totalDurationSeconds: number;
};

export async function optimizeStops(
  origin: LatLng,
  destinations: Array<{ id: number; pos: LatLng }>,
): Promise<OptimizationResult> {
  if (!isOrsConfigured()) throw new Error("ORS_API_KEY is not set.");
  if (destinations.length === 0) {
    return { stops: [], totalDistanceMeters: 0, totalDurationSeconds: 0 };
  }

  const body = {
    jobs: destinations.map((d) => ({
      id: d.id,
      location: [d.pos.lng, d.pos.lat],
    })),
    vehicles: [
      {
        id: 1,
        profile: "driving-car",
        start: [origin.lng, origin.lat],
        end: [origin.lng, origin.lat],
      },
    ],
  };

  const res = await fetch(`${ORS_BASE}/optimization`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ORS optimization failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    summary: { distance: number; duration: number };
    routes: Array<{
      steps: Array<{
        type: string; // 'start' | 'job' | 'end'
        arrival: number;
        location: [number, number];
        id?: number;
      }>;
    }>;
  };

  const route = json.routes[0];
  if (!route) throw new Error("ORS optimization returned no route.");

  const stops: OptimizedStop[] = route.steps
    .filter((s) => s.type === "job" && typeof s.id === "number")
    .map((s) => ({
      jobId: s.id as number,
      arrivalSeconds: s.arrival,
      location: s.location,
    }));

  return {
    stops,
    totalDistanceMeters: json.summary.distance,
    totalDurationSeconds: json.summary.duration,
  };
}
