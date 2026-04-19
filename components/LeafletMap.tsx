"use client";

import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";

export type LatLng = { lat: number; lng: number };

type Props = {
  center: LatLng;
  zoom?: number;
  pin?: LatLng | null;
  onPinChange?: (pos: LatLng) => void;
  otherPins?: Array<{
    id: string;
    pos: LatLng;
    label?: string;
    color?: string;
    number?: number;
  }>;
  polyline?: LatLng[] | null; // render an optional route line
  fitToBounds?: boolean; // when polyline/pins update, re-fit viewport
  className?: string;
  interactive?: boolean;
};

// Leaflet's default marker icon relies on image URLs that webpack mangles. Use a
// simple SVG div-icon instead — crisper and bundle-friendly.
function makeDivIcon(color = "#111827", number?: number) {
  const numberLabel =
    typeof number === "number"
      ? `<div style="
        position: absolute; inset: 0; display: flex; align-items: center;
        justify-content: center; transform: rotate(45deg);
        color: white; font: 600 11px/1 system-ui, sans-serif;
      ">${number}</div>`
      : "";
  return L.divIcon({
    className: "",
    html: `<div style="
      position: relative; width: 22px; height: 22px;
      border-radius: 50% 50% 50% 0;
      background: ${color}; transform: rotate(-45deg);
      border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.35);
    ">${numberLabel}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 22],
  });
}

export default function LeafletMap({
  center,
  zoom = 14,
  pin,
  onPinChange,
  otherPins,
  polyline,
  fitToBounds,
  className,
  interactive = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const pinMarkerRef = useRef<L.Marker | null>(null);
  const otherMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const polylineRef = useRef<L.Polyline | null>(null);

  const defaultIcon = useMemo(() => makeDivIcon("#111827"), []);

  // init + teardown
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [center.lat, center.lng],
      zoom,
      zoomControl: interactive,
      dragging: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
      touchZoom: interactive,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    if (interactive && onPinChange) {
      map.on("click", (e: L.LeafletMouseEvent) => {
        onPinChange({ lat: e.latlng.lat, lng: e.latlng.lng });
      });
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      pinMarkerRef.current = null;
      otherMarkersRef.current.clear();
    };
    // Intentionally only run once; center/zoom handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep map centered when center prop changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setView([center.lat, center.lng], zoom, { animate: false });
  }, [center.lat, center.lng, zoom]);

  // main pin
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!pin) {
      pinMarkerRef.current?.remove();
      pinMarkerRef.current = null;
      return;
    }

    if (pinMarkerRef.current) {
      pinMarkerRef.current.setLatLng([pin.lat, pin.lng]);
    } else {
      const marker = L.marker([pin.lat, pin.lng], {
        icon: defaultIcon,
        draggable: Boolean(interactive && onPinChange),
      }).addTo(map);
      if (interactive && onPinChange) {
        marker.on("dragend", () => {
          const ll = marker.getLatLng();
          onPinChange({ lat: ll.lat, lng: ll.lng });
        });
      }
      pinMarkerRef.current = marker;
    }
  }, [pin, interactive, onPinChange, defaultIcon]);

  // other pins
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const existing = otherMarkersRef.current;
    const incomingIds = new Set((otherPins ?? []).map((p) => p.id));

    for (const [id, marker] of existing.entries()) {
      if (!incomingIds.has(id)) {
        marker.remove();
        existing.delete(id);
      }
    }

    for (const p of otherPins ?? []) {
      // Recreate markers unconditionally when number/color change to keep the icon fresh.
      existing.get(p.id)?.remove();
      const marker = L.marker([p.pos.lat, p.pos.lng], {
        icon: makeDivIcon(p.color ?? "#2563eb", p.number),
      }).addTo(map);
      if (p.label) marker.bindTooltip(p.label);
      existing.set(p.id, marker);
    }
  }, [otherPins]);

  // polyline
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    polylineRef.current?.remove();
    polylineRef.current = null;

    if (polyline && polyline.length >= 2) {
      polylineRef.current = L.polyline(
        polyline.map((p) => [p.lat, p.lng]),
        { color: "#2563eb", weight: 4, opacity: 0.85 },
      ).addTo(map);
    }
  }, [polyline]);

  // fit viewport to polyline + pins
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !fitToBounds) return;

    const points: [number, number][] = [];
    if (polyline) points.push(...polyline.map((p) => [p.lat, p.lng] as [number, number]));
    for (const p of otherPins ?? []) points.push([p.pos.lat, p.pos.lng]);
    if (pin) points.push([pin.lat, pin.lng]);

    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], Math.max(map.getZoom(), 15));
      return;
    }
    map.fitBounds(points, { padding: [32, 32], maxZoom: 17 });
  }, [polyline, otherPins, pin, fitToBounds]);

  return (
    <div
      ref={containerRef}
      className={
        className ??
        "h-[300px] w-full rounded-xl border border-zinc-200 dark:border-zinc-800"
      }
    />
  );
}
