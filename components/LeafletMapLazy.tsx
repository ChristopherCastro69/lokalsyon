"use client";

import dynamic from "next/dynamic";

export type { LatLng } from "./LeafletMap";

// Leaflet touches `window` on import, so this component is client-only with no SSR.
const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[300px] w-full items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
      Loading map…
    </div>
  ),
});

export default LeafletMap;
