import React, { useEffect, useState } from 'react';
import { Drone } from '@/lib/types';
import { useMAVLink, MAVMode } from '@/lib/mavlink';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, 
  Battery, 
  Signal, 
  MapPin, 
  Navigation, 
  Plane, 
  RotateCw, 
  XCircle,
  Home,
  Thermometer,
  Wind,
  CloudRainWind
} from 'lucide-react';

import MapboxGL from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Prevent Mapbox GL JS from failing with "failed to initialize WebGL"
MapboxGL.workerCount = 2;
MapboxGL.workerUrl = "https://api.mapbox.com/mapbox-gl-js/v2.6.1/mapbox-gl-worker.js";

interface DroneControlDashboardProps {
  onConnect?: () => void;
  onDisconnect?: () => void;
}

const DroneControlDashboard: React.FC<DroneControlDashboardProps> = ({
  onConnect,
  onDisconnect
}) => {
  const [selectedDroneId, setSelectedDroneId] = useState<string | null>(null);
  const [altitude, setAltitude] = useState<number>(10);
  const [targetPosition, setTargetPosition] = useState<[number, number] | null>(null);
  const [map, setMap] = useState<MapboxGL.Map | null>(null);
  const [marker, setMarker] = useState<MapboxGL.Marker | null>(null);
  const [droneMarkers, setDroneMarkers] = useState<Map<string, MapboxGL.Marker>>(new Map());
  const [connected, setConnected] = useState(false);
  
  const { 
    connect, 
    disconnect, 
    isConnected, 
    getDrones, 
    armDisarm, 
    takeoff, 
    land, 
    returnToLaunch, 
    setMode,
    gotoPosition,
    addListener
  } = useMAVLink();
  
  const [drones, setDrones] = useState<Drone[]>([]);
  
  useEffect(() => {
    // Subscribe to drone updates
    const unsubscribe = addListener((updatedDrones) => {
      setDrones(updatedDrones);
    });
    
    return () => {
      unsubscribe();
    };
  }, [addListener]);
  
  useEffect(() => {
    // Initialize map
    if (!map && typeof window !== 'undefined') {
      const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      
      if (!mapboxToken) {
        console.error('Mapbox token not found. Set NEXT_PUBLIC_MAPBOX_TOKEN in .env.local');
        return;
      }
      
      MapboxGL.accessToken = mapboxToken;
      
      const newMap = new MapboxGL.Map({
        container: 'drone-control-map',
        style: 'mapbox://styles/mapbox/satellite-streets-v11',
        center: [-117.1611, 32.7157], // Default to San Diego
        zoom: 13,
        pitch: 45, // Add pitch for 3D view
        bearing: -17.6,
        antialias: true
      });
      
      newMap.on('load', () => {
        console.log('Map loaded');
        
        // Add 3D terrain
        newMap.addSource('mapbox-dem', {
          'type': 'raster-dem',
          'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
          'tileSize': 512,
          'maxzoom': 14
        });
        
        // Add the DEM source as a terrain layer with exaggerated height
        newMap.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 });
        
        // Add a sky layer that will show when the map is highly pitched
        newMap.addLayer({
          'id': 'sky',
          'type': 'sky',
          'paint': {
            'sky-type': 'atmosphere',
            'sky-atmosphere-sun': [0.0, 0.0],
            'sky-atmosphere-sun-intensity': 15
          }
        });
        
        // Add flight path layer if needed
        newMap.addSource('flightPath', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: []
            }
          }
        });
        
        newMap.addLayer({
          id: 'flightPathLine',
          type: 'line',
          source: 'flightPath',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#10b981',
            'line-width': 3,
            'line-dasharray': [2, 1]
          }
        });
        
        // Add navigation controls
        const nav = new MapboxGL.NavigationControl();
        newMap.addControl(nav, 'top-right');
        
        // Add scale
        const scale = new MapboxGL.ScaleControl({
          maxWidth: 100,
          unit: 'metric'
        });
        newMap.addControl(scale, 'bottom-left');
      });
      
      newMap.on('click', (e) => {
        const { lng, lat } = e.lngLat;
        setTargetPosition([lng, lat]);
        
        // Update or create marker
        if (marker) {
          marker.setLngLat([lng, lat]);
        } else {
          // Create a custom HTML marker for the target
          const el = document.createElement('div');
          el.className = 'target-marker';
          el.innerHTML = `<div class="target-marker-icon"></div>`;
          
          const newMarker = new MapboxGL.Marker(el)
            .setLngLat([lng, lat])
            .addTo(newMap);
            
          // Add popup
          newMarker.setPopup(
            new MapboxGL.Popup({ offset: 25 })
              .setHTML(`
                <h3>Target Position</h3>
                <p>Lat: ${lat.toFixed(6)}</p>
                <p>Lng: ${lng.toFixed(6)}</p>
                <p><small>Click 'Go to Position' to send drone here</small></p>
              `)
          );
          
          setMarker(newMarker);
        }
        
        // Update flight path if we have a selected drone
        if (selectedDroneId) {
          const drone = drones.find(d => d.id === selectedDroneId);
          if (drone && drone.location) {
            const source = newMap.getSource('flightPath');
            if (source) {
              source.setData({
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'LineString',
                  coordinates: [
                    drone.location,
                    [lng, lat]
                  ]
                }
              });
            }
          }
        }
      });
      
      setMap(newMap);
    }
    
    return () => {
      // Clean up map on unmount
      if (map) {
        map.remove();
      }
    };
  }, [map, marker, selectedDroneId, drones]);
  
  // Update drone markers on the map
  useEffect(() => {
    if (!map) return;
    
    // Create/update markers for each drone
    const newMarkers = new Map(droneMarkers);
    
    drones.forEach(drone => {
      if (drone.location) {
        const [lng, lat] = drone.location;
        
        if (newMarkers.has(drone.id)) {
          // Update existing marker
          newMarkers.get(drone.id)?.setLngLat([lng, lat]);
        } else {
          // Create new marker
          const el = document.createElement('div');
          el.className = 'drone-marker';
          el.innerHTML = `<div class="drone-marker-icon ${drone.status}"></div>`;
          
          const newMarker = new MapboxGL.Marker(el)
            .setLngLat([lng, lat])
            .addTo(map);
            
          newMarkers.set(drone.id, newMarker);
          
          // Add popup
          newMarker.setPopup(
            new MapboxGL.Popup({ offset: 25 })
              .setHTML(`
                <h3>${drone.name}</h3>
                <p>Status: ${drone.status}</p>
                <p>Battery: ${drone.battery}%</p>
                <p>Altitude: ${drone.altitude ? `${drone.altitude.toFixed(1)}m` : 'N/A'}</p>
              `)
          );
        }
      }
    });
    
    // Remove markers for drones that no longer exist
    droneMarkers.forEach((marker, id) => {
      if (!drones.some(drone => drone.id === id)) {
        marker.remove();
        newMarkers.delete(id);
      }
    });
    
    setDroneMarkers(newMarkers);
  }, [drones, map, droneMarkers]);

  // Handle connection to MAVLink
  const handleConnect = () => {
    connect();
    setConnected(true);
    onConnect?.();
  };
  
  const handleDisconnect = () => {
    disconnect();
    setConnected(false);
    onDisconnect?.();
  };
  
  // Get the selected drone
  const selectedDrone = selectedDroneId ? drones.find(d => d.id === selectedDroneId) : null;
  
  // Handle drone commands
  const handleArm = async () => {
    if (!selectedDroneId) return;
    try {
      await armDisarm(selectedDroneId, true);
    } catch (error) {
      console.error('Failed to arm drone:', error);
    }
  };
  
  const handleDisarm = async () => {
    if (!selectedDroneId) return;
    try {
      await armDisarm(selectedDroneId, false);
    } catch (error) {
      console.error('Failed to disarm drone:', error);
    }
  };
  
  const handleTakeoff = async () => {
    if (!selectedDroneId) return;
    try {
      await takeoff(selectedDroneId, altitude);
    } catch (error) {
      console.error('Failed to takeoff:', error);
    }
  };
  
  const handleLand = async () => {
    if (!selectedDroneId) return;
    try {
      await land(selectedDroneId);
    } catch (error) {
      console.error('Failed to land:', error);
    }
  };
  
  const handleRTL = async () => {
    if (!selectedDroneId) return;
    try {
      await returnToLaunch(selectedDroneId);
    } catch (error) {
      console.error('Failed to return to launch:', error);
    }
  };
  
  const handleGoto = async () => {
    if (!selectedDroneId || !targetPosition) return;
    try {
      const [lng, lat] = targetPosition;
      await gotoPosition(selectedDroneId, lat, lng, altitude);
    } catch (error) {
      console.error('Failed to go to position:', error);
    }
  };
  
  return (
    <div className="flex flex-col space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>ArduPilot Drone Control Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            <div className="flex space-x-2">
              <Button 
                variant={connected ? "outline" : "default"} 
                onClick={handleConnect}
                disabled={connected}
              >
                Connect to MAVLink
              </Button>
              <Button 
                variant={connected ? "default" : "outline"} 
                onClick={handleDisconnect}
                disabled={!connected}
              >
                Disconnect
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Drone Fleet</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {drones.length === 0 ? (
                      <p>No drones connected. Connect to MAVLink to see available drones.</p>
                    ) : (
                      <div className="space-y-2">
                        {drones.map(drone => (
                          <div 
                            key={drone.id} 
                            className={`p-3 rounded border cursor-pointer ${
                              selectedDroneId === drone.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted'
                            }`}
                            onClick={() => setSelectedDroneId(drone.id)}
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <h3 className="font-semibold">{drone.name}</h3>
                                <div className="text-sm text-muted-foreground">{drone.model}</div>
                              </div>
                              <Badge variant={
                                drone.status === 'active' ? 'default' : 
                                drone.status === 'idle' ? 'secondary' : 
                                drone.status === 'maintenance' ? 'destructive' : 
                                'outline'
                              }>
                                {drone.status}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-3 gap-2 mt-2">
                              <div className="flex items-center space-x-1 text-sm">
                                <Battery className="w-4 h-4" />
                                <span>{drone.battery}%</span>
                              </div>
                              <div className="flex items-center space-x-1 text-sm">
                                <Signal className="w-4 h-4" />
                                <span>{drone.signal}%</span>
                              </div>
                              <div className="flex items-center space-x-1 text-sm">
                                <Plane className="w-4 h-4" />
                                <span>{drone.type}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                {selectedDrone && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Drone Controls</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Tabs defaultValue="basic">
                        <TabsList className="grid grid-cols-2">
                          <TabsTrigger value="basic">Basic</TabsTrigger>
                          <TabsTrigger value="advanced">Advanced</TabsTrigger>
                        </TabsList>
                        <TabsContent value="basic" className="space-y-4">
                          <div className="flex flex-col space-y-2">
                            <label className="text-sm font-medium">Takeoff Altitude</label>
                            <div className="flex items-center space-x-2">
                              <Slider 
                                value={[altitude]} 
                                onValueChange={(values) => setAltitude(values[0])}
                                min={2}
                                max={100}
                                step={1}
                              />
                              <span className="w-12 text-right">{altitude}m</span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2">
                            <Button onClick={handleArm} variant="outline">
                              Arm
                            </Button>
                            <Button onClick={handleDisarm} variant="outline">
                              Disarm
                            </Button>
                            <Button onClick={handleTakeoff}>
                              Takeoff
                            </Button>
                            <Button onClick={handleLand}>
                              Land
                            </Button>
                            <Button onClick={handleRTL} className="col-span-2">
                              <Home className="mr-2 h-4 w-4" />
                              Return to Launch
                            </Button>
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="advanced" className="space-y-4">
                          <div className="grid grid-cols-2 gap-2">
                            <Button onClick={() => setMode(selectedDroneId, MAVMode.LOITER)} variant="outline">
                              Loiter Mode
                            </Button>
                            <Button onClick={() => setMode(selectedDroneId, MAVMode.STABILIZE)} variant="outline">
                              Stabilize Mode
                            </Button>
                            <Button onClick={() => setMode(selectedDroneId, MAVMode.AUTO)} variant="outline">
                              Auto Mode
                            </Button>
                            <Button onClick={() => setMode(selectedDroneId, MAVMode.GUIDED)} variant="outline">
                              Guided Mode
                            </Button>
                          </div>
                          
                          <div className="flex flex-col space-y-2">
                            <label className="text-sm font-medium">Target Position</label>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm">Click on map to set target</span>
                            </div>
                            {targetPosition && (
                              <div className="text-sm">
                                <div>Longitude: {targetPosition[0].toFixed(6)}</div>
                                <div>Latitude: {targetPosition[1].toFixed(6)}</div>
                              </div>
                            )}
                            <Button onClick={handleGoto} disabled={!targetPosition}>
                              <MapPin className="mr-2 h-4 w-4" />
                              Go to Position
                            </Button>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                )}
              </div>
              
              <div className="flex flex-col space-y-4">
                <Card className="overflow-hidden">
                  <CardHeader className="p-4 pb-0">
                    <div className="flex items-center justify-between">
                      <CardTitle>Drone Map</CardTitle>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">
                          <Signal className="w-3 h-3 mr-1" />
                          {drones.filter(d => d.status === 'active').length} Active
                        </Badge>
                        <Badge variant="outline">
                          <MapPin className="w-3 h-3 mr-1" />
                          {targetPosition ? 'Target Set' : 'No Target'}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div id="drone-control-map" className="w-full h-[500px]"></div>
                  </CardContent>
                </Card>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {selectedDrone && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Telemetry</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <MapPin className="w-4 h-4 mr-2" />
                                <span className="text-sm font-medium">Position</span>
                              </div>
                              <span className="text-sm">
                                {selectedDrone.location 
                                  ? `${selectedDrone.location[1].toFixed(6)}, ${selectedDrone.location[0].toFixed(6)}` 
                                  : 'N/A'}
                              </span>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <Navigation className="w-4 h-4 mr-2" />
                                <span className="text-sm font-medium">Heading</span>
                              </div>
                              <span className="text-sm">
                                {selectedDrone.heading ? `${selectedDrone.heading.toFixed(1)}°` : 'N/A'}
                              </span>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <RotateCw className="w-4 h-4 mr-2" />
                                <span className="text-sm font-medium">Speed</span>
                              </div>
                              <span className="text-sm">
                                {selectedDrone.speed ? `${selectedDrone.speed.toFixed(1)} m/s` : 'N/A'}
                              </span>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <Thermometer className="w-4 h-4 mr-2" />
                                <span className="text-sm font-medium">Altitude</span>
                              </div>
                              <span className="text-sm">
                                {selectedDrone.altitude ? `${selectedDrone.altitude.toFixed(1)} m` : 'N/A'}
                              </span>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <Battery className="w-4 h-4 mr-2" />
                                <span className="text-sm font-medium">Battery</span>
                              </div>
                              <span className="text-sm">
                                {`${selectedDrone.battery}%`}
                              </span>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <Signal className="w-4 h-4 mr-2" />
                                <span className="text-sm font-medium">Signal</span>
                              </div>
                              <span className="text-sm">
                                {`${selectedDrone.signal}%`}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Simulation Environment</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="flex flex-col items-center">
                          <Wind className="w-8 h-8 mb-2" />
                          <span className="text-sm font-medium">Wind</span>
                          <span className="text-xs">5 m/s NE</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <CloudRainWind className="w-8 h-8 mb-2" />
                          <span className="text-sm font-medium">Weather</span>
                          <span className="text-xs">Clear</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <Thermometer className="w-8 h-8 mb-2" />
                          <span className="text-sm font-medium">Temperature</span>
                          <span className="text-xs">22°C</span>
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t">
                        <h4 className="text-sm font-medium mb-2">Map Layers</h4>
                        <div className="grid grid-cols-2 gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="justify-start"
                            onClick={() => {
                              if (map) {
                                const terrainEnabled = map.getTerrain() !== null;
                                if (terrainEnabled) {
                                  map.setTerrain(null);
                                } else {
                                  map.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 });
                                }
                              }
                            }}
                          >
                            <MapPin className="mr-2 h-4 w-4" />
                            Toggle 3D Terrain
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="justify-start"
                            onClick={() => {
                              if (map) {
                                // Toggle map style between satellite and street
                                const currentStyle = map.getStyle().name;
                                if (currentStyle.includes('Satellite')) {
                                  map.setStyle('mapbox://styles/mapbox/streets-v11');
                                } else {
                                  map.setStyle('mapbox://styles/mapbox/satellite-streets-v11');
                                }
                              }
                            }}
                          >
                            <Wind className="mr-2 h-4 w-4" />
                            Toggle Satellite
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="justify-start"
                            onClick={() => {
                              if (map) {
                                // Reset the view
                                map.flyTo({
                                  center: [-117.1611, 32.7157],
                                  zoom: 13,
                                  pitch: 45,
                                  bearing: -17.6,
                                  duration: 2000
                                });
                              }
                            }}
                          >
                            <Signal className="mr-2 h-4 w-4" />
                            Reset View
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="justify-start"
                            onClick={() => {
                              if (map && selectedDroneId) {
                                const drone = drones.find(d => d.id === selectedDroneId);
                                if (drone && drone.location) {
                                  // Fly to selected drone
                                  map.flyTo({
                                    center: drone.location,
                                    zoom: 15,
                                    pitch: 60,
                                    bearing: 0,
                                    duration: 2000
                                  });
                                }
                              }
                            }}
                          >
                            <BarChart className="mr-2 h-4 w-4" />
                            Focus Drone
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <style jsx global>{`
        .drone-marker {
          width: 20px;
          height: 20px;
        }
        
        .drone-marker-icon {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background-color: #0ea5e9;
          border: 2px solid white;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
          position: relative;
        }
        
        .drone-marker-icon.active {
          background-color: #10b981;
          animation: pulse 1.5s infinite;
        }
        
        .drone-marker-icon.idle {
          background-color: #f59e0b;
        }
        
        .drone-marker-icon.maintenance,
        .drone-marker-icon.offline {
          background-color: #ef4444;
        }
        
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(16, 185, 129, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
          }
        }
      `}</style>
    </div>
  );
};

export default DroneControlDashboard;