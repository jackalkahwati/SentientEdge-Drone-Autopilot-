"use client";

import { useRef, useState, useEffect } from "react";
import mapboxgl from 'mapbox-gl';
import type { Feature, FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useRealtime } from "@/hooks/use-realtime";
import { OperationalZone, MapMarker } from "@/lib/types";

// Set the Mapbox access token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

export function TacticalMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markerRefs = useRef<Record<string, mapboxgl.Marker>>({});
  const [zones, setZones] = useState<OperationalZone[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [is3D, setIs3D] = useState(false);
  const { realtimeData, connected } = useRealtime();

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    try {
      const mapInstance = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/satellite-streets-v12',
        center: [-122.3965, 37.7915],
        zoom: 16,
        pitch: 0,
        bearing: 0
      });

      // Add navigation controls
      mapInstance.addControl(new mapboxgl.NavigationControl(), 'top-left');
      mapInstance.addControl(new mapboxgl.ScaleControl(), 'bottom-left');
      
      // Save the map instance to the ref
      map.current = mapInstance;

      mapInstance.on('load', () => {
        setMapLoaded(true);
      });

      return () => {
        mapInstance.remove();
        map.current = null;
      };
    } catch (error) {
      console.error('Failed to initialize map:', error);
    }
  }, []);
  
  // Update markers from realtime data
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    
    const mapInstance = map.current;
    const { dronePositions } = realtimeData;
    
    // Handle existing markers
    Object.keys(markerRefs.current).forEach(id => {
      // Remove markers that are no longer in the data
      if (!dronePositions.find(marker => marker.id === id)) {
        markerRefs.current[id].remove();
        delete markerRefs.current[id];
      }
    });
    
    // Update or add markers
    dronePositions.forEach(marker => {
      const existingMarker = markerRefs.current[marker.id];
      
      if (existingMarker) {
        // Update position of existing marker
        existingMarker.setLngLat(marker.position);
      } else {
        // Create new marker
        const el = document.createElement('div');
        let className = 'w-4 h-4 rounded-full border-2 border-white ';
        
        // Add color based on type
        switch (marker.type) {
          case 'drone':
            className += 'bg-blue-500';
            break;
          case 'friendly':
            className += 'bg-green-500';
            break;
          case 'enemy':
            className += 'bg-red-500';
            break;
          case 'unknown':
            className += 'bg-yellow-500';
            break;
          default:
            className += 'bg-gray-500';
        }
        
        el.className = className;
        
        // Add label if provided
        if (marker.label) {
          const popup = new mapboxgl.Popup({ offset: 25 }).setText(marker.label);
          markerRefs.current[marker.id] = new mapboxgl.Marker(el)
            .setLngLat(marker.position)
            .setPopup(popup)
            .addTo(mapInstance);
        } else {
          markerRefs.current[marker.id] = new mapboxgl.Marker(el)
            .setLngLat(marker.position)
            .addTo(mapInstance);
        }
      }
    });
  }, [realtimeData.dronePositions, mapLoaded]);
  
  // Update operational zones when they change
  useEffect(() => {
    const mapInstance = map.current;
    if (!mapInstance || !mapLoaded) return;
    
    // Remove existing zones
    if (mapInstance.getSource('zones')) {
      mapInstance.removeLayer('zone-fills');
      mapInstance.removeLayer('zone-borders');
      mapInstance.removeSource('zones');
    }
    
    if (zones.length === 0) return;
    
    // Generate GeoJSON for zones
    const features = zones.map(zone => {
      const { center, radiusKm } = zone;
      return generateCircleFeature(center, radiusKm);
    });
    
    // Add zones as a new source
    mapInstance.addSource('zones', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features
      } as FeatureCollection
    });
    
    // Add fill layer
    mapInstance.addLayer({
      id: 'zone-fills',
      type: 'fill',
      source: 'zones',
      paint: {
        'fill-color': '#ffffff',
        'fill-opacity': 0.08
      }
    });
    
    // Add border layer
    mapInstance.addLayer({
      id: 'zone-borders',
      type: 'line',
      source: 'zones',
      paint: {
        'line-color': '#ffffff',
        'line-opacity': 0.25,
        'line-width': 1.5,
        'line-dasharray': [2, 2]
      }
    });
  }, [zones, mapLoaded]);
  
  // Function to generate circle GeoJSON feature
  const generateCircleFeature = (center: [number, number], radiusKm: number): Feature => {
    const points = 64;
    const coords: [number, number][] = [];
    
    for (let i = 0; i < points; i++) {
      const angle = (i / points) * (2 * Math.PI);
      const lng = center[0] + (radiusKm / (111.32 * Math.cos(center[1] * (Math.PI / 180)))) * Math.sin(angle);
      const lat = center[1] + (radiusKm / 111.32) * Math.cos(angle);
      coords.push([lng, lat]);
    }
    
    // Close the circle
    coords.push(coords[0]);
    
    return {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [coords]
      }
    } as Feature;
  };
  
  // Add a new operational zone at current map center
  const addZone = () => {
    if (!map.current) return;
    
    const center = map.current.getCenter();
    const newZone: OperationalZone = {
      id: Date.now().toString(),
      name: `New Zone ${zones.length + 1}`,
      center: [center.lng, center.lat],
      radiusKm: 0.2
    };
    
    setZones([...zones, newZone]);
  };
  
  // Update an operational zone
  const updateZone = (id: string, updates: Partial<OperationalZone>) => {
    setZones(zones.map(zone => 
      zone.id === id ? { ...zone, ...updates } : zone
    ));
  };
  
  // Remove an operational zone
  const removeZone = (id: string) => {
    setZones(zones.filter(zone => zone.id !== id));
  };
  
  // Toggle 3D view
  const toggle3DView = () => {
    if (!map.current) return;
    
    const currentPitch = map.current.getPitch();
    map.current.easeTo({
      pitch: currentPitch === 0 ? 60 : 0,
      duration: 500
    });
    
    setIs3D(!is3D);
  };
  
  // Rotate map view
  const rotateMap = () => {
    if (!map.current) return;
    
    const currentBearing = map.current.getBearing();
    map.current.easeTo({
      bearing: currentBearing + 90,
      duration: 500
    });
  };

  if (!mapboxgl.supported()) {
    return (
      <div className="flex flex-col h-full w-full items-center justify-center">
        <div className="p-6 max-w-md text-center">
          <h3 className="text-lg font-medium mb-2">WebGL Not Supported</h3>
          <p className="text-muted-foreground">
            Your browser or device doesn't support WebGL, which is required for the tactical map. Please try using a different browser or device.
          </p>
        </div>
      </div>
    );
  }

  if (!mapboxgl.accessToken) {
    return (
      <div className="flex flex-col h-full w-full items-center justify-center">
        <div className="p-6 max-w-md text-center">
          <h3 className="text-lg font-medium mb-2">Missing Map API Token</h3>
          <p className="text-muted-foreground">
            A Mapbox API token is required to display the tactical map. Please set the NEXT_PUBLIC_MAPBOX_TOKEN environment variable.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full space-y-4">
      {/* Map Container */}
      <div className="relative flex-1 rounded-lg overflow-hidden">
        <div ref={mapContainer} className="h-full w-full" />
        
        {/* Connection Status Indicator */}
        <div className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span>{connected ? 'Connected' : 'Disconnected'}</span>
        </div>
        
        {/* Map Controls */}
        <div className="absolute top-4 right-4 bg-background/80 backdrop-blur-sm p-4 rounded-lg border">
          <h3 className="font-semibold mb-2">Map Controls</h3>
          <div className="space-y-2">
            <Button 
              className="w-full px-3 py-1 bg-primary text-primary-foreground rounded-md text-sm"
              onClick={toggle3DView}
            >
              {is3D ? 'Switch to 2D View' : 'Switch to 3D View'}
            </Button>
            <Button 
              className="w-full px-3 py-1 bg-primary text-primary-foreground rounded-md text-sm"
              onClick={rotateMap}
            >
              Rotate Map
            </Button>
          </div>
        </div>
      </div>

      {/* Operational Zones Panel */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Operational Zones</h3>
          <Button
            onClick={addZone}
            className="px-3 py-1 bg-green-600 text-white rounded-md text-sm"
          >
            Add New Zone
          </Button>
        </div>
        
        <div className="flex flex-wrap gap-4">
          {zones.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No operational zones defined. Click "Add New Zone" to create one.
            </p>
          )}
          
          {zones.map(zone => (
            <div key={zone.id} className="flex-1 min-w-[200px] max-w-[300px] bg-secondary/50 p-3 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <Input
                  type="text"
                  value={zone.name}
                  onChange={(e) => updateZone(zone.id, { name: e.target.value })}
                  className="flex-1 h-8 px-2 py-1 bg-background rounded text-sm"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => removeZone(zone.id)}
                  className="ml-2 h-8"
                >
                  X
                </Button>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <Label className="text-xs">Radius</Label>
                  <span className="text-xs">{zone.radiusKm.toFixed(2)} km</span>
                </div>
                <Input
                  type="range"
                  min="0.05"
                  max="0.5"
                  step="0.01"
                  value={zone.radiusKm}
                  onChange={(e) => updateZone(zone.id, { radiusKm: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
