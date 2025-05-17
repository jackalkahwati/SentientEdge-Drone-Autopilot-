"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from 'mapbox-gl';
import type { Feature, FeatureCollection, Point } from 'geojson';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ZoomIn,
  ZoomOut,
  Move,
  Layers,
  MapIcon,
  Mountain,
  Wind,
  Cloud,
  Sun,
  Moon,
  DrillIcon as Drone,
  Target,
  Building,
  Trees,
  RouteIcon as Road,
  AlertTriangle,
  Sliders,
  RefreshCw,
  PlayCircle,
  PauseCircle,
  Volume2,
  Waves,
  Timer,
  Download,
} from "lucide-react";

// Set the Mapbox access token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

// Simulation entity types
interface SimulationDrone {
  id: string;
  position: [number, number]; // [lng, lat]
  altitude: number;
  heading: number;
  speed: number;
  batteryLevel: number;
  type: 'quad' | 'fixed-wing' | 'vtol' | 'ground';
  state: 'active' | 'idle' | 'returning' | 'error';
}

interface SimulationTarget {
  id: string;
  position: [number, number]; // [lng, lat]
  type: 'primary' | 'secondary' | 'interest';
  name: string;
}

interface SimulationObstacle {
  id: string;
  position: [number, number]; // [lng, lat]
  radius: number; // in meters
  height: number; // in meters
  type: 'building' | 'terrain' | 'nofly' | 'weather';
  name: string;
}

export function SimulationEnvironment() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markerRefs = useRef<{
    drones: Record<string, mapboxgl.Marker>;
    targets: Record<string, mapboxgl.Marker>;
  }>({
    drones: {},
    targets: {},
  });
  
  const [mapLoaded, setMapLoaded] = useState(false);
  const [is3D, setIs3D] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState<"day" | "night" | "dawn">("day");
  const [weather, setWeather] = useState<"clear" | "rain" | "fog">("clear");
  const [terrainType, setTerrainType] = useState<"urban" | "rural" | "mountain" | "desert">("urban");
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [simulationTime, setSimulationTime] = useState<string>("00:00:00");
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  
  const [showLayers, setShowLayers] = useState({
    terrain: true,
    buildings: true,
    vegetation: true,
    roads: true,
    drones: true,
    objectives: true,
    threats: true,
    weather: true,
    paths: true,
  });
  
  const animationFrame = useRef<number | null>(null);
  const startTime = useRef<number>(Date.now());
  const elapsedSimTime = useRef<number>(0);
  
  // Simulation entities
  const [drones, setDrones] = useState<SimulationDrone[]>([]);
  const [targets, setTargets] = useState<SimulationTarget[]>([]);
  const [obstacles, setObstacles] = useState<SimulationObstacle[]>([]);
  
  // Initialize map when component mounts
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    try {
      // Create map instance
      const mapInstance = new mapboxgl.Map({
        container: mapContainer.current,
        style: getMapStyle(timeOfDay),
        center: [-122.4194, 37.7749], // San Francisco
        zoom: 13,
        pitch: is3D ? 60 : 0,
        bearing: 0,
        terrain: is3D ? { source: 'mapbox-dem', exaggeration: 1.5 } : undefined,
      });

      // Add navigation controls
      mapInstance.addControl(new mapboxgl.NavigationControl(), 'top-left');
      mapInstance.addControl(new mapboxgl.ScaleControl(), 'bottom-left');
      
      // Save the map instance to the ref
      map.current = mapInstance;

      // Set up initial data after map loads
      mapInstance.on('load', () => {
        setMapLoaded(true);
        
        // Add terrain if 3D mode is enabled
        if (is3D) {
          addTerrainToMap(mapInstance);
        }
        
        // Generate initial simulation data
        generateInitialSimulationData();
        
        // Add simulation layers
        if (terrainType === 'urban') {
          addUrbanEnvironment(mapInstance);
        } else if (terrainType === 'rural') {
          addRuralEnvironment(mapInstance);
        } else if (terrainType === 'mountain') {
          addMountainEnvironment(mapInstance);
        } else if (terrainType === 'desert') {
          addDesertEnvironment(mapInstance);
        }
        
        // Add weather effects if enabled
        if (weather !== 'clear') {
          addWeatherEffects(mapInstance, weather);
        }
        
        // Add simulation time display
        updateSimulationTime(0);
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
  
  // Update map style when time of day changes
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    
    map.current.setStyle(getMapStyle(timeOfDay));
    
    // Re-add custom layers after style change
    map.current.once('style.load', () => {
      if (is3D) {
        addTerrainToMap(map.current!);
      }
      
      if (terrainType === 'urban') {
        addUrbanEnvironment(map.current!);
      } else if (terrainType === 'rural') {
        addRuralEnvironment(map.current!);
      } else if (terrainType === 'mountain') {
        addMountainEnvironment(map.current!);
      } else if (terrainType === 'desert') {
        addDesertEnvironment(map.current!);
      }
      
      if (weather !== 'clear') {
        addWeatherEffects(map.current!, weather);
      }
    });
  }, [timeOfDay, mapLoaded]);
  
  // Toggle 3D terrain
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    
    map.current.easeTo({
      pitch: is3D ? 60 : 0,
      duration: 1000
    });
    
    if (is3D) {
      addTerrainToMap(map.current);
    } else {
      // Remove terrain if it exists
      if (map.current.getSource('mapbox-dem')) {
        map.current.setTerrain(null);
      }
    }
  }, [is3D, mapLoaded]);
  
  // Update weather effects when changed
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    
    // Remove existing weather effects
    if (map.current.getLayer('rain-layer')) {
      map.current.removeLayer('rain-layer');
    }
    if (map.current.getLayer('fog-layer')) {
      map.current.removeLayer('fog-layer');
    }
    
    // Add new weather effects if needed
    if (weather !== 'clear') {
      addWeatherEffects(map.current, weather);
    }
  }, [weather, mapLoaded]);
  
  // Update terrain type
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    
    // Remove existing environment layers
    removeEnvironmentLayers(map.current);
    
    // Add new environment
    if (terrainType === 'urban') {
      addUrbanEnvironment(map.current);
    } else if (terrainType === 'rural') {
      addRuralEnvironment(map.current);
    } else if (terrainType === 'mountain') {
      addMountainEnvironment(map.current);
    } else if (terrainType === 'desert') {
      addDesertEnvironment(map.current);
    }
  }, [terrainType, mapLoaded]);
  
  // Update drone and target markers when they change
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    
    // Update drone markers
    updateDroneMarkers(map.current, drones);
    
    // Update target markers
    updateTargetMarkers(map.current, targets);
    
    // Update obstacle visualizations
    updateObstacleVisualizations(map.current, obstacles);
    
  }, [drones, targets, obstacles, mapLoaded]);
  
  // Run simulation animation
  useEffect(() => {
    if (!isSimulationRunning) {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
        animationFrame.current = null;
      }
      return;
    }
    
    let lastFrameTime = 0;
    
    const animateSimulation = (timestamp: number) => {
      if (!lastFrameTime) lastFrameTime = timestamp;
      
      const deltaTime = timestamp - lastFrameTime;
      const simDeltaTime = deltaTime * simulationSpeed;
      
      if (deltaTime > 16) { // Cap at ~60fps
        lastFrameTime = timestamp;
        
        // Update simulation time
        elapsedSimTime.current += simDeltaTime;
        updateSimulationTime(elapsedSimTime.current);
        
        // Update drone positions
        updateDronePositions(simDeltaTime / 1000);
      }
      
      animationFrame.current = requestAnimationFrame(animateSimulation);
    };
    
    startTime.current = Date.now();
    animationFrame.current = requestAnimationFrame(animateSimulation);
    
    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [isSimulationRunning, simulationSpeed]);
  
  // Helper: Get map style based on time of day
  const getMapStyle = (time: string) => {
    switch (time) {
      case 'day':
        return 'mapbox://styles/mapbox/satellite-streets-v12';
      case 'night':
        return 'mapbox://styles/mapbox/navigation-night-v1';
      case 'dawn':
        return 'mapbox://styles/mapbox/cjaudgl840gn32rnrepcb9b9g';
      default:
        return 'mapbox://styles/mapbox/satellite-streets-v12';
    }
  };
  
  // Helper: Add 3D terrain to map
  const addTerrainToMap = (mapInstance: mapboxgl.Map) => {
    // Add a DEM source for terrain
    if (!mapInstance.getSource('mapbox-dem')) {
      mapInstance.addSource('mapbox-dem', {
        'type': 'raster-dem',
        'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
        'tileSize': 512,
        'maxzoom': 14
      });
    }
    
    // Add sky layer for better 3D visuals
    if (!mapInstance.getLayer('sky')) {
      mapInstance.addLayer({
        'id': 'sky',
        'type': 'sky',
        'paint': {
          'sky-type': 'atmosphere',
          'sky-atmosphere-sun': [0.0, 0.0],
          'sky-atmosphere-sun-intensity': 15
        }
      });
    }
    
    // Set terrain property
    mapInstance.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 });
  };
  
  // Helper: Generate initial simulation data
  const generateInitialSimulationData = () => {
    // San Francisco coordinates
    const baseLocation: [number, number] = [-122.4194, 37.7749];
    
    // Generate drones
    const newDrones: SimulationDrone[] = [];
    for (let i = 0; i < 12; i++) {
      // Create drones in a spread pattern around the base location
      const angle = (i / 12) * Math.PI * 2;
      const distance = 0.01 + (Math.random() * 0.005);
      const position: [number, number] = [
        baseLocation[0] + Math.cos(angle) * distance,
        baseLocation[1] + Math.sin(angle) * distance
      ];
      
      // Determine drone type
      const droneTypes: Array<'quad' | 'fixed-wing' | 'vtol' | 'ground'> = ['quad', 'fixed-wing', 'vtol', 'ground'];
      const type = droneTypes[Math.floor(Math.random() * 3)]; // Use mostly air drones
      
      newDrones.push({
        id: `drone-${i}`,
        position,
        altitude: 100 + Math.random() * 200,
        heading: Math.random() * 360,
        speed: 5 + Math.random() * 15,
        batteryLevel: 70 + Math.random() * 30,
        type,
        state: 'active'
      });
    }
    setDrones(newDrones);
    
    // Generate targets
    const newTargets: SimulationTarget[] = [];
    const targetTypes: Array<'primary' | 'secondary' | 'interest'> = ['primary', 'secondary', 'interest'];
    
    for (let i = 0; i < 5; i++) {
      // Create targets at various locations
      const position: [number, number] = [
        baseLocation[0] + (Math.random() * 0.05) - 0.025,
        baseLocation[1] + (Math.random() * 0.05) - 0.025
      ];
      
      newTargets.push({
        id: `target-${i}`,
        position,
        type: targetTypes[Math.floor(Math.random() * targetTypes.length)],
        name: `Target ${i+1}`
      });
    }
    setTargets(newTargets);
    
    // Generate obstacles
    const newObstacles: SimulationObstacle[] = [];
    const obstacleTypes: Array<'building' | 'terrain' | 'nofly' | 'weather'> = ['building', 'terrain', 'nofly', 'weather'];
    
    for (let i = 0; i < 8; i++) {
      // Create obstacles at various locations
      const position: [number, number] = [
        baseLocation[0] + (Math.random() * 0.06) - 0.03,
        baseLocation[1] + (Math.random() * 0.06) - 0.03
      ];
      
      newObstacles.push({
        id: `obstacle-${i}`,
        position,
        radius: 50 + Math.random() * 200, // 50m to 250m
        height: 50 + Math.random() * 150, // 50m to 200m
        type: obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)],
        name: `Obstacle ${i+1}`
      });
    }
    setObstacles(newObstacles);
  };
  
  // Helper: Update drone positions during simulation
  const updateDronePositions = (deltaTimeSeconds: number) => {
    setDrones(prevDrones => {
      return prevDrones.map(drone => {
        // Calculate new position based on heading and speed
        const headingRad = (drone.heading * Math.PI) / 180;
        const speedFactor = (drone.speed * deltaTimeSeconds) / 111000; // Convert m/s to degrees
        
        // Calculate new position
        const newLng = drone.position[0] + Math.sin(headingRad) * speedFactor;
        const newLat = drone.position[1] + Math.cos(headingRad) * speedFactor;
        
        // Randomly adjust heading occasionally for more realistic movement
        const newHeading = drone.heading + (Math.random() > 0.95 ? (Math.random() * 20 - 10) : 0);
        
        // Randomly adjust altitude slightly
        const newAltitude = drone.altitude + (Math.random() * 5 - 2.5);
        
        // Gradually decrease battery level
        const newBatteryLevel = drone.batteryLevel - (deltaTimeSeconds * 0.05);
        
        // Update state if battery gets too low
        let newState = drone.state;
        if (newBatteryLevel < 20 && drone.state === 'active') {
          newState = 'returning';
        } else if (newBatteryLevel < 5) {
          newState = 'error';
        }
        
        return {
          ...drone,
          position: [newLng, newLat],
          heading: newHeading % 360,
          altitude: newAltitude,
          batteryLevel: Math.max(0, newBatteryLevel),
          state: newState
        };
      });
    });
  };
  
  // Helper: Update simulation time display
  const updateSimulationTime = (elapsedMs: number) => {
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    setSimulationTime(timeString);
  };
  
  // Helper: Update drone markers on the map
  const updateDroneMarkers = (mapInstance: mapboxgl.Map, drones: SimulationDrone[]) => {
    if (!showLayers.drones) {
      // Remove all drone markers if drones layer is disabled
      Object.keys(markerRefs.current.drones).forEach(id => {
        markerRefs.current.drones[id].remove();
        delete markerRefs.current.drones[id];
      });
      return;
    }
    
    // Remove markers for drones that no longer exist
    Object.keys(markerRefs.current.drones).forEach(id => {
      if (!drones.find(drone => drone.id === id)) {
        markerRefs.current.drones[id].remove();
        delete markerRefs.current.drones[id];
      }
    });
    
    // Update or create markers for each drone
    drones.forEach(drone => {
      const existingMarker = markerRefs.current.drones[drone.id];
      
      if (existingMarker) {
        // Update existing marker position
        existingMarker.setLngLat(drone.position);
        
        // Update marker element to reflect drone state
        const el = existingMarker.getElement();
        updateDroneMarkerAppearance(el, drone);
        
        // Update popup content
        const popup = existingMarker.getPopup();
        if (popup) {
          popup.setHTML(createDronePopupContent(drone));
        }
      } else {
        // Create a new marker element
        const el = document.createElement('div');
        el.className = 'drone-marker';
        el.style.width = '16px';
        el.style.height = '16px';
        el.style.borderRadius = '50%';
        el.style.border = '2px solid white';
        el.style.boxShadow = '0 0 5px rgba(0,0,0,0.5)';
        el.style.position = 'relative';
        
        // Set initial appearance based on drone state
        updateDroneMarkerAppearance(el, drone);
        
        // Create popup with drone info
        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
          createDronePopupContent(drone)
        );
        
        // Create and add marker
        const marker = new mapboxgl.Marker(el)
          .setLngLat(drone.position)
          .setPopup(popup)
          .addTo(mapInstance);
          
        // Store marker reference
        markerRefs.current.drones[drone.id] = marker;
      }
    });
  };
  
  // Helper: Update target markers on the map
  const updateTargetMarkers = (mapInstance: mapboxgl.Map, targets: SimulationTarget[]) => {
    if (!showLayers.objectives) {
      // Remove all target markers if objectives layer is disabled
      Object.keys(markerRefs.current.targets).forEach(id => {
        markerRefs.current.targets[id].remove();
        delete markerRefs.current.targets[id];
      });
      return;
    }
    
    // Remove markers for targets that no longer exist
    Object.keys(markerRefs.current.targets).forEach(id => {
      if (!targets.find(target => target.id === id)) {
        markerRefs.current.targets[id].remove();
        delete markerRefs.current.targets[id];
      }
    });
    
    // Update or create markers for each target
    targets.forEach(target => {
      const existingMarker = markerRefs.current.targets[target.id];
      
      if (existingMarker) {
        // Update existing marker position
        existingMarker.setLngLat(target.position);
      } else {
        // Create a new marker element
        const el = document.createElement('div');
        
        // Style based on target type
        el.className = 'target-marker';
        
        if (target.type === 'primary') {
          el.style.width = '24px';
          el.style.height = '24px';
          el.style.background = 'rgba(255, 0, 0, 0.7)';
          el.style.border = '2px solid white';
          el.style.borderRadius = '50%';
        } else if (target.type === 'secondary') {
          el.style.width = '20px';
          el.style.height = '20px';
          el.style.background = 'rgba(255, 165, 0, 0.7)';
          el.style.border = '2px solid white';
          el.style.borderRadius = '50%';
        } else {
          el.style.width = '16px';
          el.style.height = '16px';
          el.style.background = 'rgba(255, 255, 0, 0.7)';
          el.style.border = '2px solid white';
          el.style.borderRadius = '50%';
        }
        
        // Add pulsing effect
        el.style.boxShadow = `0 0 0 rgba(255, 255, 255, 0.4)`;
        el.style.animation = 'pulse 2s infinite';
        
        // Create popup
        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div class="p-2">
            <div class="font-bold">${target.name}</div>
            <div>Type: ${target.type}</div>
            <div>Lat: ${target.position[1].toFixed(5)}</div>
            <div>Lng: ${target.position[0].toFixed(5)}</div>
          </div>
        `);
        
        // Create and add marker
        const marker = new mapboxgl.Marker(el)
          .setLngLat(target.position)
          .setPopup(popup)
          .addTo(mapInstance);
          
        // Store marker reference
        markerRefs.current.targets[target.id] = marker;
      }
    });
  };
  
  // Helper: Update obstacle visualizations
  const updateObstacleVisualizations = (mapInstance: mapboxgl.Map, obstacles: SimulationObstacle[]) => {
    if (!showLayers.threats) {
      // Remove obstacle layers if threats layer is disabled
      if (mapInstance.getLayer('obstacles-fill')) {
        mapInstance.removeLayer('obstacles-fill');
      }
      if (mapInstance.getLayer('obstacles-line')) {
        mapInstance.removeLayer('obstacles-line');
      }
      if (mapInstance.getSource('obstacles')) {
        mapInstance.removeSource('obstacles');
      }
      return;
    }
    
    // Create GeoJSON features for obstacles
    const features: Feature[] = obstacles.map(obstacle => {
      // Create a circle for each obstacle
      const points = 64;
      const coords: [number, number][] = [];
      
      // Convert radius from meters to degrees
      const radiusLng = obstacle.radius / (111320 * Math.cos(obstacle.position[1] * Math.PI / 180));
      const radiusLat = obstacle.radius / 111320;
      
      for (let i = 0; i < points; i++) {
        const angle = (i / points) * (2 * Math.PI);
        const lng = obstacle.position[0] + radiusLng * Math.cos(angle);
        const lat = obstacle.position[1] + radiusLat * Math.sin(angle);
        coords.push([lng, lat]);
      }
      
      // Close the circle
      coords.push(coords[0]);
      
      // Create GeoJSON feature
      return {
        type: 'Feature',
        properties: {
          id: obstacle.id,
          name: obstacle.name,
          type: obstacle.type,
          height: obstacle.height,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [coords]
        }
      };
    });
    
    // Update or create obstacles source
    if (mapInstance.getSource('obstacles')) {
      (mapInstance.getSource('obstacles') as mapboxgl.GeoJSONSource).setData({
        type: 'FeatureCollection',
        features
      });
    } else {
      // Create source
      mapInstance.addSource('obstacles', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features
        }
      });
      
      // Add fill layer
      mapInstance.addLayer({
        id: 'obstacles-fill',
        type: 'fill',
        source: 'obstacles',
        paint: {
          'fill-color': [
            'match',
            ['get', 'type'],
            'building', 'rgba(100, 100, 100, 0.3)',
            'terrain', 'rgba(100, 150, 100, 0.3)',
            'nofly', 'rgba(255, 50, 50, 0.3)',
            'weather', 'rgba(100, 100, 255, 0.3)',
            'rgba(100, 100, 100, 0.3)'
          ],
          'fill-opacity': 0.5
        }
      });
      
      // Add border layer
      mapInstance.addLayer({
        id: 'obstacles-line',
        type: 'line',
        source: 'obstacles',
        paint: {
          'line-color': [
            'match',
            ['get', 'type'],
            'building', 'rgba(100, 100, 100, 1)',
            'terrain', 'rgba(100, 150, 100, 1)',
            'nofly', 'rgba(255, 50, 50, 1)',
            'weather', 'rgba(100, 100, 255, 1)',
            'rgba(100, 100, 100, 1)'
          ],
          'line-width': 2,
          'line-dasharray': [2, 2]
        }
      });
    }
  };
  
  // Helper: Update drone marker appearance based on its state
  const updateDroneMarkerAppearance = (element: HTMLElement, drone: SimulationDrone) => {
    // Set color based on drone state and type
    let color = 'rgba(64, 196, 255, 1)'; // Default active drone color
    
    if (drone.state === 'returning') {
      color = 'rgba(255, 165, 0, 1)'; // Orange for returning
    } else if (drone.state === 'error') {
      color = 'rgba(255, 0, 0, 1)'; // Red for error
    } else if (drone.state === 'idle') {
      color = 'rgba(100, 255, 100, 1)'; // Green for idle
    }
    
    element.style.background = color;
    
    // Add pulsing effect for drones with error state
    if (drone.state === 'error') {
      element.style.animation = 'pulse 1s infinite';
    } else {
      element.style.animation = 'none';
    }
    
    // Add rotate transform to show heading
    element.style.transform = `rotate(${drone.heading}deg)`;
    
    // Add inner element to show drone type
    element.innerHTML = '';
    const innerEl = document.createElement('div');
    innerEl.style.position = 'absolute';
    innerEl.style.top = '50%';
    innerEl.style.left = '50%';
    innerEl.style.transform = 'translate(-50%, -50%)';
    innerEl.style.width = '6px';
    innerEl.style.height = '6px';
    
    // Different shapes for different drone types
    if (drone.type === 'quad') {
      innerEl.style.borderRadius = '50%';
      innerEl.style.background = 'white';
    } else if (drone.type === 'fixed-wing') {
      innerEl.style.width = '8px';
      innerEl.style.height = '4px';
      innerEl.style.background = 'white';
    } else if (drone.type === 'vtol') {
      innerEl.style.width = '8px';
      innerEl.style.height = '8px';
      innerEl.style.background = 'white';
      innerEl.style.clipPath = 'polygon(50% 0%, 100% 100%, 0% 100%)';
    } else if (drone.type === 'ground') {
      innerEl.style.width = '6px';
      innerEl.style.height = '6px';
      innerEl.style.background = 'white';
      innerEl.style.borderRadius = '0%';
    }
    
    element.appendChild(innerEl);
  };
  
  // Helper: Create HTML content for drone popup
  const createDronePopupContent = (drone: SimulationDrone) => {
    const batteryColor = drone.batteryLevel > 50 ? 'green' : 
                          drone.batteryLevel > 20 ? 'orange' : 'red';
    
    return `
      <div class="p-2">
        <div class="font-bold">${drone.id}</div>
        <div>Type: ${drone.type}</div>
        <div>State: ${drone.state}</div>
        <div>Altitude: ${drone.altitude.toFixed(0)}m</div>
        <div>Speed: ${drone.speed.toFixed(1)}m/s</div>
        <div>Heading: ${drone.heading.toFixed(0)}°</div>
        <div>
          Battery: 
          <span style="color: ${batteryColor}">
            ${drone.batteryLevel.toFixed(0)}%
          </span>
        </div>
      </div>
    `;
  };
  
  // Helper: Add urban environment to the map
  const addUrbanEnvironment = (mapInstance: mapboxgl.Map) => {
    // This method would add 3D buildings and other urban features
    // Real implementation would use Mapbox's 3D building layer or custom 3D models
    
    // Simple implementation: add a 3D buildings layer
    if (!mapInstance.getLayer('3d-buildings') && mapInstance.getSource('composite')) {
      mapInstance.addLayer({
        'id': '3d-buildings',
        'source': 'composite',
        'source-layer': 'building',
        'filter': ['==', 'extrude', 'true'],
        'type': 'fill-extrusion',
        'minzoom': 12,
        'paint': {
          'fill-extrusion-color': '#aaa',
          'fill-extrusion-height': [
            'interpolate', ['linear'], ['zoom'],
            15, 0,
            16, ['get', 'height']
          ],
          'fill-extrusion-base': [
            'interpolate', ['linear'], ['zoom'],
            15, 0,
            16, ['get', 'min_height']
          ],
          'fill-extrusion-opacity': 0.6
        }
      });
    }
  };
  
  // Helper: Add rural environment to the map
  const addRuralEnvironment = (mapInstance: mapboxgl.Map) => {
    // This would add rural features like fields, farms, etc.
    // For now, we'll just change the center location to a more rural area
    mapInstance.flyTo({
      center: [-122.0, 37.9], // More rural area outside San Francisco
      zoom: 12,
      duration: 2000
    });
  };
  
  // Helper: Add mountain environment to the map
  const addMountainEnvironment = (mapInstance: mapboxgl.Map) => {
    // Change to a mountainous region and exaggerate terrain
    mapInstance.flyTo({
      center: [-119.5, 37.7], // Yosemite area
      zoom: 12,
      duration: 2000
    });
    
    if (mapInstance.getTerrain()) {
      mapInstance.setTerrain({ 
        'source': 'mapbox-dem', 
        'exaggeration': 1.5 
      });
    }
  };
  
  // Helper: Add desert environment to the map
  const addDesertEnvironment = (mapInstance: mapboxgl.Map) => {
    // Change to a desert region
    mapInstance.flyTo({
      center: [-115.8, 35.0], // Mojave Desert
      zoom: 12,
      duration: 2000
    });
  };
  
  // Helper: Remove environment layers
  const removeEnvironmentLayers = (mapInstance: mapboxgl.Map) => {
    // Remove 3D buildings layer if it exists
    if (mapInstance.getLayer('3d-buildings')) {
      mapInstance.removeLayer('3d-buildings');
    }
  };
  
  // Helper: Add weather effects to the map
  const addWeatherEffects = (mapInstance: mapboxgl.Map, weatherType: string) => {
    if (weatherType === 'rain') {
      // Add rain particles (visual-only layer)
      if (!mapInstance.getLayer('rain-layer')) {
        mapInstance.addLayer({
          id: 'rain-layer',
          type: 'circle',
          source: {
            type: 'geojson',
            data: generateRainParticles()
          },
          paint: {
            'circle-radius': 1,
            'circle-color': 'rgba(200, 200, 255, 0.5)',
            'circle-opacity': 0.7
          }
        });
        
        // Animate rain particles
        animateRain(mapInstance);
      }
    } else if (weatherType === 'fog') {
      // Add fog layer (a semi-transparent fill)
      if (!mapInstance.getLayer('fog-layer')) {
        mapInstance.addLayer({
          id: 'fog-layer',
          type: 'fill',
          source: {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'Polygon',
                coordinates: [[
                  [-180, -90],
                  [180, -90],
                  [180, 90],
                  [-180, 90],
                  [-180, -90]
                ]]
              }
            }
          },
          paint: {
            'fill-color': 'white',
            'fill-opacity': 0.3
          }
        });
      }
    }
  };
  
  // Helper: Generate rain particle data
  const generateRainParticles = () => {
    const features: Feature[] = [];
    const bounds = map.current?.getBounds();
    
    if (!bounds) return { type: 'FeatureCollection', features };
    
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    
    // Create 200 rain particles
    for (let i = 0; i < 200; i++) {
      const lng = sw.lng + (Math.random() * (ne.lng - sw.lng));
      const lat = sw.lat + (Math.random() * (ne.lat - sw.lat));
      
      features.push({
        type: 'Feature',
        properties: {
          id: `rain-${i}`,
          speed: 0.0001 + (Math.random() * 0.0002)  // Varying fall speeds
        },
        geometry: {
          type: 'Point',
          coordinates: [lng, lat]
        }
      });
    }
    
    return {
      type: 'FeatureCollection',
      features
    };
  };
  
  // Helper: Animate rain particles
  const animateRain = (mapInstance: mapboxgl.Map) => {
    if (!mapInstance.getSource('rain-layer')) return;
    
    const source = mapInstance.getSource('rain-layer') as mapboxgl.GeoJSONSource;
    const data = source._data as FeatureCollection;
    
    if (!data || !data.features) return;
    
    // Boundsary checking for particles
    const bounds = mapInstance.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    
    // Update each rain particle position
    const updatedFeatures = data.features.map(feature => {
      if (feature.geometry.type !== 'Point') return feature;
      
      const coords = feature.geometry.coordinates as [number, number];
      const speed = feature.properties?.speed || 0.0001;
      
      // Move rain downward
      coords[1] -= speed;
      
      // Reset particles that go out of bounds
      if (coords[1] < sw.lat) {
        coords[1] = ne.lat;
        coords[0] = sw.lng + (Math.random() * (ne.lng - sw.lng));
      }
      
      return feature;
    });
    
    // Update source with new particle positions
    source.setData({
      type: 'FeatureCollection',
      features: updatedFeatures
    });
    
    // Continue animation
    requestAnimationFrame(() => animateRain(mapInstance));
  };
  
  // Toggle simulation running state
  const toggleSimulation = () => {
    setIsSimulationRunning(prev => !prev);
    
    // Reset simulation time if stopped
    if (isSimulationRunning) {
      elapsedSimTime.current = 0;
      updateSimulationTime(0);
    }
  };
  
  // Reset simulation
  const resetSimulation = () => {
    setIsSimulationRunning(false);
    elapsedSimTime.current = 0;
    updateSimulationTime(0);
    generateInitialSimulationData();
  };
  
  // Toggle 3D view
  const toggle3DView = () => {
    setIs3D(prev => !prev);
  };
  
  // Update time of day
  const handleTimeOfDayChange = (time: "day" | "night" | "dawn") => {
    setTimeOfDay(time);
  };
  
  // Update weather conditions
  const handleWeatherChange = (condition: "clear" | "rain" | "fog") => {
    setWeather(condition);
  };
  
  // Update terrain type
  const handleTerrainTypeChange = (terrain: "urban" | "rural" | "mountain" | "desert") => {
    setTerrainType(terrain);
  };
  
  // Toggle layer visibility
  const toggleLayer = (layer: keyof typeof showLayers) => {
    setShowLayers(prev => ({
      ...prev,
      [layer]: !prev[layer]
    }));
  };

  if (!mapboxgl.supported()) {
    return (
      <div className="flex flex-col h-full w-full items-center justify-center">
        <div className="p-6 max-w-md text-center">
          <h3 className="text-lg font-medium mb-2">WebGL Not Supported</h3>
          <p className="text-muted-foreground">
            Your browser or device doesn't support WebGL, which is required for the simulation environment. Please try using a different browser or device.
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
            A Mapbox API token is required to display the simulation environment. Please set the NEXT_PUBLIC_MAPBOX_TOKEN environment variable.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="p-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mountain className="h-5 w-5" />
          <h3 className="font-semibold">Simulation Environment</h3>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4" />
            <span className="font-mono text-sm">{simulationTime}</span>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant={isSimulationRunning ? "destructive" : "default"} 
              size="sm"
              onClick={toggleSimulation}
            >
              {isSimulationRunning ? (
                <> <PauseCircle className="h-4 w-4 mr-1" /> Stop </>
              ) : (
                <> <PlayCircle className="h-4 w-4 mr-1" /> Run </>
              )}
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={resetSimulation}
            >
              <RefreshCw className="h-4 w-4 mr-1" /> Reset
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              disabled={!isSimulationRunning}
            >
              <Download className="h-4 w-4 mr-1" /> Export
            </Button>
          </div>
        </div>
      </div>
      
      <div className="flex-1 relative">
        <div ref={mapContainer} className="h-full w-full" />
        
        {/* Simulation Controls Overlay - Top Right */}
        <Card className="absolute top-4 right-4 bg-background/80 backdrop-blur-sm p-2 rounded-lg border">
          <Tabs defaultValue="view">
            <TabsList className="grid grid-cols-3 h-8">
              <TabsTrigger value="view">View</TabsTrigger>
              <TabsTrigger value="environment">Environment</TabsTrigger>
              <TabsTrigger value="entities">Entities</TabsTrigger>
            </TabsList>
            
            <TabsContent value="view" className="mt-2">
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant={is3D ? "default" : "outline"} 
                  size="sm"
                  onClick={toggle3DView}
                >
                  <Mountain className="h-4 w-4 mr-1" />
                  3D View
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    if (map.current) {
                      map.current.easeTo({
                        bearing: (map.current.getBearing() + 45) % 360,
                        duration: 500
                      });
                    }
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Rotate
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    if (map.current) {
                      map.current.zoomIn();
                    }
                  }}
                >
                  <ZoomIn className="h-4 w-4 mr-1" />
                  Zoom In
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    if (map.current) {
                      map.current.zoomOut();
                    }
                  }}
                >
                  <ZoomOut className="h-4 w-4 mr-1" />
                  Zoom Out
                </Button>
                
                <div className="col-span-2 flex items-center gap-2 mt-2">
                  <Sliders className="h-4 w-4" />
                  <span className="text-xs">Simulation Speed:</span>
                  <input 
                    type="range" 
                    min="0.1" 
                    max="5" 
                    step="0.1" 
                    value={simulationSpeed}
                    onChange={(e) => setSimulationSpeed(parseFloat(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-xs font-mono w-8">{simulationSpeed.toFixed(1)}x</span>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="environment" className="mt-2">
              <h4 className="text-xs font-medium mb-1">Time of Day</h4>
              <div className="grid grid-cols-3 gap-2 mb-2">
                <Button 
                  variant={timeOfDay === "day" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => handleTimeOfDayChange("day")}
                >
                  <Sun className="h-4 w-4 mr-1" />
                  Day
                </Button>
                
                <Button 
                  variant={timeOfDay === "night" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => handleTimeOfDayChange("night")}
                >
                  <Moon className="h-4 w-4 mr-1" />
                  Night
                </Button>
                
                <Button 
                  variant={timeOfDay === "dawn" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => handleTimeOfDayChange("dawn")}
                >
                  <Sun className="h-4 w-4 mr-1" />
                  Dawn
                </Button>
              </div>
              
              <h4 className="text-xs font-medium mb-1">Weather</h4>
              <div className="grid grid-cols-3 gap-2 mb-2">
                <Button 
                  variant={weather === "clear" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => handleWeatherChange("clear")}
                >
                  <Sun className="h-4 w-4 mr-1" />
                  Clear
                </Button>
                
                <Button 
                  variant={weather === "rain" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => handleWeatherChange("rain")}
                >
                  <Cloud className="h-4 w-4 mr-1" />
                  Rain
                </Button>
                
                <Button 
                  variant={weather === "fog" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => handleWeatherChange("fog")}
                >
                  <Wind className="h-4 w-4 mr-1" />
                  Fog
                </Button>
              </div>
              
              <h4 className="text-xs font-medium mb-1">Terrain</h4>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant={terrainType === "urban" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => handleTerrainTypeChange("urban")}
                >
                  <Building className="h-4 w-4 mr-1" />
                  Urban
                </Button>
                
                <Button 
                  variant={terrainType === "rural" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => handleTerrainTypeChange("rural")}
                >
                  <Trees className="h-4 w-4 mr-1" />
                  Rural
                </Button>
                
                <Button 
                  variant={terrainType === "mountain" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => handleTerrainTypeChange("mountain")}
                >
                  <Mountain className="h-4 w-4 mr-1" />
                  Mountain
                </Button>
                
                <Button 
                  variant={terrainType === "desert" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => handleTerrainTypeChange("desert")}
                >
                  <Waves className="h-4 w-4 mr-1" />
                  Desert
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="entities" className="mt-2">
              <h4 className="text-xs font-medium mb-1">Entities</h4>
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs flex items-center">
                    <Drone className="h-3 w-3 mr-1" />
                    Drones
                  </Label>
                  <Switch 
                    checked={showLayers.drones} 
                    onCheckedChange={() => toggleLayer('drones')}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label className="text-xs flex items-center">
                    <Target className="h-3 w-3 mr-1" />
                    Objectives
                  </Label>
                  <Switch 
                    checked={showLayers.objectives} 
                    onCheckedChange={() => toggleLayer('objectives')}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label className="text-xs flex items-center">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Threats
                  </Label>
                  <Switch 
                    checked={showLayers.threats} 
                    onCheckedChange={() => toggleLayer('threats')}
                  />
                </div>
                
                <Separator className="my-1" />
                
                <div className="flex items-center justify-between">
                  <Label className="text-xs flex items-center">
                    <Building className="h-3 w-3 mr-1" />
                    Buildings
                  </Label>
                  <Switch 
                    checked={showLayers.buildings} 
                    onCheckedChange={() => toggleLayer('buildings')}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label className="text-xs flex items-center">
                    <Trees className="h-3 w-3 mr-1" />
                    Vegetation
                  </Label>
                  <Switch 
                    checked={showLayers.vegetation} 
                    onCheckedChange={() => toggleLayer('vegetation')}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label className="text-xs flex items-center">
                    <Road className="h-3 w-3 mr-1" />
                    Roads
                  </Label>
                  <Switch 
                    checked={showLayers.roads} 
                    onCheckedChange={() => toggleLayer('roads')}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label className="text-xs flex items-center">
                    <Cloud className="h-3 w-3 mr-1" />
                    Weather
                  </Label>
                  <Switch 
                    checked={showLayers.weather} 
                    onCheckedChange={() => toggleLayer('weather')}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label className="text-xs flex items-center">
                    <Volume2 className="h-3 w-3 mr-1" />
                    Audio Effects
                  </Label>
                  <Switch />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
        
        {/* Status Bar */}
        <div className="absolute bottom-4 left-4 bg-background/80 backdrop-blur-sm p-2 rounded-lg border">
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <Drone className="h-4 w-4" />
              <span>{drones.length} drones</span>
              <Badge variant="outline" className="ml-1 h-5 text-[10px]">
                {drones.filter(d => d.state === 'active').length} active
              </Badge>
            </div>
            
            <div className="flex items-center gap-1">
              <Target className="h-4 w-4" />
              <span>{targets.length} targets</span>
            </div>
            
            <Badge variant={isSimulationRunning ? "default" : "outline"} className="h-5">
              {isSimulationRunning ? "RUNNING" : "STOPPED"}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}