"use client";

import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import 'mapbox-gl/dist/mapbox-gl.css';
import mapboxgl from 'mapbox-gl';
import type { Feature, FeatureCollection, Point } from 'geojson';
import { Flag, MapPin, Crosshair, AlertCircle, Plane } from 'lucide-react';

// Set the Mapbox access token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

interface DronePoint {
  id: string;
  position: [number, number]; // [lng, lat]
  altitude: number;
  heading: number;
  speed: number;
  status: 'active' | 'standby' | 'returning' | 'error';
}

export type FormationType = "grid" | "circle" | "hex" | "custom";

// Methods exposed to parent components via ref
export interface SwarmControlInterfaceHandle {
  /** Update the current swarm formation */
  updateFormationType: (type: FormationType) => void;
  /** Update the number of drones in the swarm */
  updateDroneCount: (count: number) => void;
  /** Toggle the simulation run / stop state */
  toggleSimulation: () => void;
}

interface SwarmControlInterfaceProps {
  initialCenter?: [number, number]; // [lng, lat]
  initialZoom?: number;
  className?: string;
}

function SwarmControlInterface(
  {
    initialCenter = [-122.4194, 37.7749],
    initialZoom = 15,
    className = '',
  }: SwarmControlInterfaceProps,
  ref: React.Ref<SwarmControlInterfaceHandle>
) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [is3D, setIs3D] = useState(false);
  const [droneCount, setDroneCount] = useState(24);
  const [mapStyle, setMapStyle] = useState<'satellite-streets-v12' | 'streets-v12' | 'outdoors-v12' | 'dark-v11'>('satellite-streets-v12');
  const [formationType, setFormationType] = useState<"grid" | "circle" | "hex" | "custom">("grid");
  const [formationCenter, setFormationCenter] = useState<[number, number]>(initialCenter);
  const [simulationRunning, setSimulationRunning] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [selectedDrone, setSelectedDrone] = useState<string | null>(null);
  const [drones, setDrones] = useState<DronePoint[]>([]);
  const droneRefs = useRef<Record<string, mapboxgl.Marker>>({});
  const animationFrame = useRef<number | null>(null);

  // Initialize map when component mounts
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    try {
      const mapInstance = new mapboxgl.Map({
        container: mapContainer.current,
        style: `mapbox://styles/mapbox/${mapStyle}`, 
        center: formationCenter,
        zoom: initialZoom,
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
        
        // Initialize with a new swarm formation after map loads
        generateSwarmFormation(formationType, droneCount, formationCenter);
        
        // Add a canvas layer for visualization elements
        mapInstance.addLayer({
          id: 'swarm-connections',
          type: 'line',
          source: {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: []
            }
          },
          paint: {
            'line-color': 'rgba(64, 196, 255, 0.4)',
            'line-width': 1,
            'line-dasharray': [2, 1]
          }
        });
        
        // Add operational area
        addOperationalArea(mapInstance, formationCenter, 0.5);
      });

      // Allow clicking on the map to move the formation center
      mapInstance.on('click', (e) => {
        const newCenter: [number, number] = [e.lngLat.lng, e.lngLat.lat];
        setFormationCenter(newCenter);
        generateSwarmFormation(formationType, droneCount, newCenter);
      });

      return () => {
        if (animationFrame.current) {
          cancelAnimationFrame(animationFrame.current);
        }
        mapInstance.remove();
        map.current = null;
      };
    } catch (error) {
      console.error('Failed to initialize map:', error);
    }
  }, []);

  // Generate swarm formation based on type
  const generateSwarmFormation = (
    type: "grid" | "circle" | "hex" | "custom", 
    count: number, 
    center: [number, number]
  ) => {
    // Convert to meters for calculation
    const spacingMeters = 20; // 20 meters between drones
    const newDrones: DronePoint[] = [];
    
    if (type === "grid") {
      // Grid formation
      const rows = Math.ceil(Math.sqrt(count));
      const cols = Math.ceil(count / rows);
      
      let droneIndex = 0;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          if (droneIndex < count) {
            // Calculate offsets (centered around the center point)
            const offsetLng = (col - cols / 2) * spacingMeters / 111320 * Math.cos(center[1] * Math.PI / 180);
            const offsetLat = (row - rows / 2) * spacingMeters / 111320;
            
            newDrones.push({
              id: `drone-${droneIndex}`,
              position: [center[0] + offsetLng, center[1] + offsetLat],
              altitude: 120 + Math.random() * 30,
              heading: Math.random() * 360,
              speed: 5 + Math.random() * 10,
              status: 'active'
            });
            
            droneIndex++;
          }
        }
      }
    } else if (type === "circle") {
      // Circle formation
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        
        // Create multiple concentric circles
        const ringIndex = Math.floor(i / 12);
        const ringRadius = (ringIndex + 1) * spacingMeters;
        
        // Convert radius from meters to degrees
        const radiusLng = ringRadius / (111320 * Math.cos(center[1] * Math.PI / 180));
        const radiusLat = ringRadius / 111320;
        
        newDrones.push({
          id: `drone-${i}`,
          position: [
            center[0] + Math.cos(angle) * radiusLng,
            center[1] + Math.sin(angle) * radiusLat
          ],
          altitude: 120 + Math.random() * 30,
          heading: angle * (180 / Math.PI),
          speed: 5 + Math.random() * 10,
          status: 'active'
        });
      }
    } else if (type === "hex") {
      // Hexagonal formation
      let droneIndex = 0;
      
      // Center drone
      if (droneIndex < count) {
        newDrones.push({
          id: `drone-${droneIndex}`,
          position: [center[0], center[1]],
          altitude: 120 + Math.random() * 30,
          heading: Math.random() * 360,
          speed: 5 + Math.random() * 10,
          status: 'active'
        });
        droneIndex++;
      }
      
      // Surrounding rings
      const maxRings = 5;
      for (let ring = 1; ring <= maxRings && droneIndex < count; ring++) {
        const hexRadius = ring * spacingMeters;
        const dronesInRing = ring * 6;
        
        for (let i = 0; i < dronesInRing && droneIndex < count; i++) {
          const angle = (i / dronesInRing) * Math.PI * 2;
          
          // Convert radius from meters to degrees
          const radiusLng = hexRadius / (111320 * Math.cos(center[1] * Math.PI / 180));
          const radiusLat = hexRadius / 111320;
          
          newDrones.push({
            id: `drone-${droneIndex}`,
            position: [
              center[0] + Math.cos(angle) * radiusLng,
              center[1] + Math.sin(angle) * radiusLat
            ],
            altitude: 120 + Math.random() * 30,
            heading: angle * (180 / Math.PI),
            speed: 5 + Math.random() * 10,
            status: 'active'
          });
          
          droneIndex++;
        }
      }
    } else if (type === "custom") {
      // Arrow formation
      const arrowLength = spacingMeters * 6; // Length of arrow
      const arrowWidth = spacingMeters * 4; // Width of arrow
      
      // Points defining the arrow shape
      const points = [
        [0, -arrowLength], // tip
        [-arrowWidth, 0], // left wing
        [-arrowWidth/2, 0], // left inner
        [-arrowWidth/2, arrowLength/2], // left tail
        [arrowWidth/2, arrowLength/2], // right tail
        [arrowWidth/2, 0], // right inner
        [arrowWidth, 0], // right wing
      ];
      
      // Convert points to lng/lat
      const lngLatPoints = points.map(([x, y]) => [
        center[0] + x / (111320 * Math.cos(center[1] * Math.PI / 180)),
        center[1] + y / 111320
      ]);
      
      // Distribute drones along the shape
      const dronesPerPoint = Math.floor(count / (lngLatPoints.length - 1));
      let remainingDrones = count % (lngLatPoints.length - 1);
      
      let droneIndex = 0;
      
      for (let i = 0; i < lngLatPoints.length - 1; i++) {
        const startPoint = lngLatPoints[i];
        const endPoint = lngLatPoints[i + 1];
        
        const dronesOnThisLine = dronesPerPoint + (remainingDrones > 0 ? 1 : 0);
        if (remainingDrones > 0) remainingDrones--;
        
        for (let j = 0; j < dronesOnThisLine; j++) {
          const ratio = j / dronesOnThisLine;
          
          newDrones.push({
            id: `drone-${droneIndex}`,
            position: [
              startPoint[0] + (endPoint[0] - startPoint[0]) * ratio,
              startPoint[1] + (endPoint[1] - startPoint[1]) * ratio
            ],
            altitude: 120 + Math.random() * 30,
            heading: Math.atan2(
              endPoint[1] - startPoint[1],
              endPoint[0] - startPoint[0]
            ) * (180 / Math.PI),
            speed: 5 + Math.random() * 10,
            status: 'active'
          });
          
          droneIndex++;
        }
      }
    }
    
    // Update state with the new drone positions
    setDrones(newDrones);
  };

  // Update markers when drones change
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    
    const mapInstance = map.current;
    
    // Update connections between drones
    updateSwarmConnections(mapInstance, drones);
    
    // Handle existing markers (remove ones that are no longer in the data)
    Object.keys(droneRefs.current).forEach(id => {
      if (!drones.find(drone => drone.id === id)) {
        droneRefs.current[id].remove();
        delete droneRefs.current[id];
      }
    });
    
    // Update or add markers
    drones.forEach(drone => {
      const existingMarker = droneRefs.current[drone.id];
      
      if (existingMarker) {
        // Update existing marker position
        existingMarker.setLngLat(drone.position);
      } else {
        // Create new marker
        const el = document.createElement('div');
        let className = 'w-3 h-3 rounded-full border border-white ';
        
        // Add color based on status
        switch (drone.status) {
          case 'active':
            className += 'bg-blue-500';
            break;
          case 'standby':
            className += 'bg-green-500';
            break;
          case 'returning':
            className += 'bg-yellow-500';
            break;
          case 'error':
            className += 'bg-red-500';
            break;
          default:
            className += 'bg-gray-500';
        }
        
        el.className = className;
        
        // Add popup with drone info
        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div class="p-2">
            <div class="font-bold">${drone.id}</div>
            <div>Altitude: ${drone.altitude.toFixed(0)}m</div>
            <div>Heading: ${drone.heading.toFixed(0)}°</div>
            <div>Speed: ${drone.speed.toFixed(1)}m/s</div>
          </div>
        `);
        
        // Create and add the marker
        const marker = new mapboxgl.Marker(el)
          .setLngLat(drone.position)
          .setPopup(popup)
          .addTo(mapInstance);
          
        // Add click handler
        marker.getElement().addEventListener('click', () => {
          setSelectedDrone(drone.id);
        });
        
        droneRefs.current[drone.id] = marker;
      }
    });
  }, [drones, mapLoaded]);

  // Update swarm connections visualization
  const updateSwarmConnections = (mapInstance: mapboxgl.Map, drones: DronePoint[]) => {
    // Create lines connecting drones based on proximity
    const features: Feature[] = [];
    
    if (drones.length < 2) return;
    
    // Create connections between drones
    for (let i = 0; i < drones.length; i++) {
      // Connect to the nearest 3 drones
      const distances = drones
        .map((otherDrone, index) => ({
          index,
          distance: Math.sqrt(
            Math.pow(drones[i].position[0] - otherDrone.position[0], 2) +
            Math.pow(drones[i].position[1] - otherDrone.position[1], 2)
          )
        }))
        .filter(item => item.index !== i) // Don't connect to self
        .sort((a, b) => a.distance - b.distance) // Sort by distance
        .slice(0, 3); // Take the 3 nearest
        
      distances.forEach(nearestDrone => {
        // Create a line feature
        features.push({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: [
              drones[i].position,
              drones[nearestDrone.index].position
            ]
          }
        });
      });
    }
    
    // Update the source with the new features
    if (mapInstance.getSource('swarm-connections')) {
      (mapInstance.getSource('swarm-connections') as mapboxgl.GeoJSONSource).setData({
        type: 'FeatureCollection',
        features
      });
    }
  };

  // Add operational area to map
  const addOperationalArea = (mapInstance: mapboxgl.Map, center: [number, number], radiusKm: number) => {
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
    
    // Remove existing area if it exists
    if (mapInstance.getSource('operational-area')) {
      mapInstance.removeLayer('operational-area-fill');
      mapInstance.removeLayer('operational-area-border');
      mapInstance.removeSource('operational-area');
    }
    
    // Add new area
    mapInstance.addSource('operational-area', {
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
      id: 'operational-area-fill',
      type: 'fill',
      source: 'operational-area',
      paint: {
        'fill-color': '#3498db',
        'fill-opacity': 0.05
      }
    });
    
    mapInstance.addLayer({
      id: 'operational-area-border',
      type: 'line',
      source: 'operational-area',
      paint: {
        'line-color': '#3498db',
        'line-opacity': 0.6,
        'line-width': 2,
        'line-dasharray': [3, 3]
      }
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

  // Update drone formation type
  const updateFormationType = (type: FormationType) => {
    setFormationType(type);
    generateSwarmFormation(type, droneCount, formationCenter);
  };

  // Update drone count
  const updateDroneCount = (count: number) => {
    setDroneCount(count);
    generateSwarmFormation(formationType, count, formationCenter);
  };

  // Animate drone movement
  useEffect(() => {
    if (!simulationRunning) {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
        animationFrame.current = null;
      }
      return;
    }
    
    let lastTime = 0;
    
    const animateDrones = (timestamp: number) => {
      if (!lastTime) lastTime = timestamp;
      const elapsed = (timestamp - lastTime) * simulationSpeed;
      
      if (elapsed > 16) { // Cap at ~60fps
        lastTime = timestamp;
        
        // Update drone positions with some simple movement patterns
        setDrones(prevDrones => {
          return prevDrones.map(drone => {
            // Calculate new position based on heading and speed
            const headingRad = (drone.heading * Math.PI) / 180;
            const speedFactor = drone.speed * elapsed / 10000; // Convert to degrees based on speed and time
            
            let newLng = drone.position[0] + Math.sin(headingRad) * speedFactor;
            let newLat = drone.position[1] + Math.cos(headingRad) * speedFactor;
            
            // Wrap longitude between -180 and 180 and clamp latitude between -85 and 85 (Mapbox safe range)
            if (newLng > 180) newLng -= 360;
            if (newLng < -180) newLng += 360;
            newLat = Math.max(-85, Math.min(85, newLat));
            
            // Randomly adjust heading occasionally
            const newHeading = drone.heading + (Math.random() > 0.95 ? (Math.random() * 20 - 10) : 0);
            
            return {
              ...drone,
              position: [newLng, newLat],
              heading: newHeading % 360,
              altitude: drone.altitude + (Math.random() * 2 - 1),
            };
          });
        });
      }
      
      animationFrame.current = requestAnimationFrame(animateDrones);
    };
    
    animationFrame.current = requestAnimationFrame(animateDrones);
    
    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [simulationRunning, simulationSpeed]);

  // Toggle simulation on/off
  const toggleSimulation = () => {
    setSimulationRunning(prev => !prev);
  };

  // Update style when user selects new map style
  const changeMapStyle = (style: typeof mapStyle) => {
    setMapStyle(style);
    if (map.current) {
      map.current.setStyle(`mapbox://styles/mapbox/${style}`);
    }
  };

  // Expose imperative API to parent via ref
  useImperativeHandle(ref, () => ({
    updateFormationType,
    updateDroneCount,
    toggleSimulation,
  }), [updateFormationType, updateDroneCount, toggleSimulation]);

  if (!mapboxgl.supported()) {
    return (
      <div className="flex flex-col h-full w-full items-center justify-center">
        <div className="p-6 max-w-md text-center">
          <h3 className="text-lg font-medium mb-2">WebGL Not Supported</h3>
          <p className="text-muted-foreground">
            Your browser or device doesn't support WebGL, which is required for the swarm control map. Please try using a different browser or device.
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
            A Mapbox API token is required to display the swarm control map. Please set the NEXT_PUBLIC_MAPBOX_TOKEN environment variable.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-full flex-col ${className}`}>
      <div className="p-3 border-b flex items-center justify-between bg-gray-800 text-white">
        <div className="flex items-center gap-2">
          <Plane className="h-5 w-5" />
          <h3 className="font-semibold">Swarm Control Interface</h3>
        </div>
        
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <Plane className="h-4 w-4" />
            <span className="text-sm font-medium">{droneCount}</span>
            <input
              type="range"
              min="1"
              max="100"
              step="1"
              value={droneCount}
              onChange={(e) => updateDroneCount(parseInt(e.target.value))}
              className="w-24"
            />
          </div>
          
          <select 
            value={formationType} 
            onChange={(e) => updateFormationType(e.target.value as any)}
            className="px-2 py-1 border rounded h-8"
          >
            <option value="grid">Grid</option>
            <option value="circle">Circle</option>
            <option value="hex">Hexagon</option>
            <option value="custom">Arrow</option>
          </select>
          
          <button 
            className={`px-3 py-1 rounded text-sm ${simulationRunning ? 'bg-red-500 text-white' : 'bg-green-600 text-white'}`}
            onClick={toggleSimulation}
          >
            {simulationRunning ? 'Stop' : 'Simulate'}
          </button>
          
          {simulationRunning && (
            <div className="flex items-center gap-2">
              <span>Speed:</span>
              <input
                type="range"
                min="0.1"
                max="5"
                step="0.1"
                value={simulationSpeed}
                onChange={(e) => setSimulationSpeed(parseFloat(e.target.value))}
                className="w-24"
              />
              <span className="text-sm">{simulationSpeed.toFixed(1)}x</span>
            </div>
          )}
          <select
            value={mapStyle}
            onChange={(e) => changeMapStyle(e.target.value as any)}
            className="px-2 py-1 rounded bg-gray-700 text-white border border-gray-600 h-8"
          >
            <option value="satellite-streets-v12">Satellite</option>
            <option value="streets-v12">Streets</option>
            <option value="outdoors-v12">Outdoors</option>
            <option value="dark-v11">Dark</option>
          </select>
        </div>
      </div>
      
      <div className="flex-1 relative">
        <div ref={mapContainer} className="h-full w-full" />
        
        <div className="absolute top-4 right-4 bg-gray-800/90 text-white p-2 rounded-lg border border-gray-600 shadow-md">
          <div className="grid grid-cols-2 gap-2">
            <button 
              className="px-3 py-1 h-8 bg-blue-500 text-white rounded hover:bg-blue-600"
              onClick={toggle3DView}
            >
              {is3D ? '2D View' : '3D View'}
            </button>
            <button 
              className="px-3 py-1 h-8 bg-blue-500 text-white rounded hover:bg-blue-600"
              onClick={rotateMap}
            >
              Rotate
            </button>
          </div>
        </div>
        
        <div className="absolute bottom-4 left-4 bg-gray-800/90 text-white p-2 rounded-lg border border-gray-600 shadow-md">
          <h4 className="font-semibold text-sm mb-2">Formation Control</h4>
          <div className="grid grid-cols-2 gap-2">
            <button 
              className={`px-2 py-1 text-sm rounded ${formationType === "grid" ? 'bg-blue-500 text-white' : 'bg-gray-600'}`}
              onClick={() => updateFormationType("grid")}
            >
              Grid
            </button>
            <button 
              className={`px-2 py-1 text-sm rounded ${formationType === "circle" ? 'bg-blue-500 text-white' : 'bg-gray-600'}`}
              onClick={() => updateFormationType("circle")}
            >
              Circle
            </button>
            <button 
              className={`px-2 py-1 text-sm rounded ${formationType === "hex" ? 'bg-blue-500 text-white' : 'bg-gray-600'}`}
              onClick={() => updateFormationType("hex")}
            >
              Hexagon
            </button>
            <button 
              className={`px-2 py-1 text-sm rounded ${formationType === "custom" ? 'bg-blue-500 text-white' : 'bg-gray-600'}`}
              onClick={() => updateFormationType("custom")}
            >
              Arrow
            </button>
          </div>
          
          <div className="mt-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Drones:</span>
              <span className="text-sm font-mono">{droneCount}</span>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              step="1"
              value={droneCount}
              onChange={(e) => updateDroneCount(parseInt(e.target.value))}
              className="w-full mt-1"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default forwardRef(SwarmControlInterface);