"use client";

import { useRef, useState, useEffect } from "react";
import mapboxgl from 'mapbox-gl';
import type { Feature, FeatureCollection } from 'geojson';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMissions } from "@/hooks/use-missions";

// Set the Mapbox access token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

interface MissionDetailMapProps {
  missionId?: string;
  coordinates?: [number, number]; // [lng, lat]
  showControls?: boolean;
}

export function MissionDetailMap({ 
  missionId,
  coordinates = [-122.4194, 37.7749], // Default to San Francisco
  showControls = true
}: MissionDetailMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [is3D, setIs3D] = useState(false);
  const { toast } = useToast();
  const { getMission } = useMissions();
  const [mission, setMission] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch mission data if ID provided
  useEffect(() => {
    async function fetchMissionData() {
      if (!missionId) {
        setLoading(false);
        return;
      }

      try {
        const missionData = await getMission(missionId);
        if (missionData) {
          setMission(missionData);
          if (missionData.coordinates) {
            coordinates = missionData.coordinates;
          }
        }
      } catch (error) {
        console.error("Failed to fetch mission data:", error);
        toast({
          title: "Error fetching mission data",
          description: "Could not load mission details. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchMissionData();
  }, [missionId, getMission, toast]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    try {
      // Check if mapboxgl is properly initialized
      if (!mapboxgl.accessToken) {
        toast({
          title: "Map API token missing",
          description: "Please set NEXT_PUBLIC_MAPBOX_TOKEN in your environment variables.",
          variant: "destructive",
        });
        return;
      }

      const mapInstance = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/satellite-streets-v12',
        center: coordinates,
        zoom: 15,
        pitch: 0,
        bearing: 0
      });

      // Add navigation controls
      if (showControls) {
        mapInstance.addControl(new mapboxgl.NavigationControl(), 'top-left');
        mapInstance.addControl(new mapboxgl.ScaleControl(), 'bottom-left');
      }
      
      // Save the map instance to the ref
      map.current = mapInstance;

      mapInstance.on('load', () => {
        setMapLoaded(true);

        // Add mission path if we have one (simple line for now)
        if (mission && mission.path) {
          addMissionPath(mapInstance, mission.path);
        } else {
          // Add sample mission path for demo purposes
          const samplePath = [
            [coordinates[0] - 0.01, coordinates[1] - 0.01],
            [coordinates[0], coordinates[1]],
            [coordinates[0] + 0.01, coordinates[1] + 0.008],
            [coordinates[0] + 0.015, coordinates[1] + 0.01]
          ];
          addMissionPath(mapInstance, samplePath);
        }

        // Add mission area (circular area of operation)
        addMissionArea(mapInstance, coordinates, 0.5);

        // Add sample drones
        addSampleDrones(mapInstance, coordinates);
      });

      return () => {
        mapInstance.remove();
        map.current = null;
      };
    } catch (error) {
      console.error('Failed to initialize map:', error);
      toast({
        title: "Map initialization failed",
        description: "Could not load the mission map. Please check your browser compatibility.",
        variant: "destructive",
      });
    }
  }, [coordinates, mission, showControls, toast]);

  // Add mission path to map
  const addMissionPath = (mapInstance: mapboxgl.Map, path: Array<[number, number]>) => {
    mapInstance.addSource('mission-path', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: path
        }
      }
    });

    mapInstance.addLayer({
      id: 'mission-path',
      type: 'line',
      source: 'mission-path',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#4CAF50',
        'line-width': 3,
        'line-opacity': 0.8,
        'line-dasharray': [2, 1]
      }
    });
  };

  // Add mission area to map
  const addMissionArea = (mapInstance: mapboxgl.Map, center: [number, number], radiusKm: number) => {
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
    
    mapInstance.addSource('mission-area', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [coords]
        }
      } as Feature
    });
    
    mapInstance.addLayer({
      id: 'mission-area-fill',
      type: 'fill',
      source: 'mission-area',
      paint: {
        'fill-color': '#FFC107',
        'fill-opacity': 0.1
      }
    });
    
    mapInstance.addLayer({
      id: 'mission-area-border',
      type: 'line',
      source: 'mission-area',
      paint: {
        'line-color': '#FFC107',
        'line-opacity': 0.6,
        'line-width': 2,
        'line-dasharray': [3, 3]
      }
    });
  };

  // Add sample drones to map
  const addSampleDrones = (mapInstance: mapboxgl.Map, center: [number, number]) => {
    // Create sample drone positions
    const dronePositions = [
      [center[0] - 0.005, center[1] - 0.005],
      [center[0], center[1]],
      [center[0] + 0.008, center[1] + 0.006]
    ];

    // Add drone markers
    dronePositions.forEach((position, index) => {
      const el = document.createElement('div');
      el.className = 'w-4 h-4 rounded-full bg-blue-500 border-2 border-white';
      
      // Add drone marker
      const marker = new mapboxgl.Marker(el)
        .setLngLat(position as [number, number])
        .addTo(mapInstance);
      
      // Add popup
      const popup = new mapboxgl.Popup({ offset: 25 })
        .setHTML(`<strong>Drone ${index + 1}</strong><br>Altitude: ${Math.floor(Math.random() * 300) + 100}m<br>Speed: ${Math.floor(Math.random() * 30) + 10} km/h`);
      
      marker.setPopup(popup);
    });
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
            Your browser or device doesn't support WebGL, which is required for the mission map. Please try using a different browser or device.
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
            A Mapbox API token is required to display the mission map. Please set the NEXT_PUBLIC_MAPBOX_TOKEN environment variable.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 rounded-lg overflow-hidden h-full">
      <div ref={mapContainer} className="h-full w-full" />
      
      {/* Map Status */}
      <div className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium">
        {loading ? "Loading map..." : "Mission map loaded"}
      </div>
      
      {/* Mission Info */}
      {mission && (
        <div className="absolute top-12 left-4 bg-background/80 backdrop-blur-sm p-2 rounded-lg border max-w-xs">
          <h3 className="font-semibold text-sm">{mission.name}</h3>
          <p className="text-xs text-muted-foreground">{mission.description}</p>
          <div className="flex items-center mt-1 gap-2">
            <Badge variant={mission.status === "active" ? "default" : "outline"}>
              {mission.status}
            </Badge>
            <span className="text-xs">Drones: {mission.droneCount}</span>
          </div>
        </div>
      )}
      
      {/* Map Controls */}
      {showControls && (
        <div className="absolute top-4 right-4 bg-background/80 backdrop-blur-sm p-3 rounded-lg border">
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
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-background/80 backdrop-blur-sm p-3 rounded-lg border">
        <div className="flex items-center space-y-1 flex-col">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500 border border-white"></div>
            <span className="text-xs">Drone</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-green-500"></div>
            <span className="text-xs">Flight Path</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full border border-yellow-500"></div>
            <span className="text-xs">Mission Area</span>
          </div>
        </div>
      </div>
    </div>
  );
}