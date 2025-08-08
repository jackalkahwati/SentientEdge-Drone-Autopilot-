"use client";

import { useEffect, useMemo, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useDrones } from "@/hooks/use-drones";

export default function MapboxTacticalMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const { drones } = useDrones();

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center: [-122.4194, 37.7749],
      zoom: 12,
      attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");
    mapRef.current = map;
    return () => map.remove();
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    // Clear existing markers by tracking them on the map object
    (map as any)._markers = (map as any)._markers || [];
    (map as any)._markers.forEach((m: maplibregl.Marker) => m.remove());
    (map as any)._markers = drones.map((d) => {
      const el = document.createElement("div");
      el.className = "bg-primary rounded-full";
      el.style.width = "10px";
      el.style.height = "10px";
      el.style.border = "2px solid white";
      const marker = new maplibregl.Marker({ element: el }).setLngLat([d.lon, d.lat]).addTo(map);
      return marker;
    });
  }, [drones]);

  return <div ref={containerRef} className="w-full h-80 rounded-md border" />;
}


