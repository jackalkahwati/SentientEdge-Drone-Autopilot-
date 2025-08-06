import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import Map, { Marker, Popup, NavigationControl, Source, Layer } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Flag, MapPin, Crosshair, AlertCircle, Plane } from 'lucide-react';
import { useRealtime, useDronePosition } from '@/hooks/use-realtime-optimized';

// Types
interface OptimizedTacticalMapProps {
  initialViewState?: {
    latitude: number;
    longitude: number;
    zoom: number;
  };
  className?: string;
  visibleDroneIds?: string[]; // For marker virtualization
}

interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  type: 'friendly' | 'enemy' | 'objective';
  title: string;
  description?: string;
}

// Memoized marker component to prevent unnecessary re-renders
const DroneMarker = memo(({ 
  droneId, 
  onClick 
}: { 
  droneId: string; 
  onClick: (marker: MapMarker) => void; 
}) => {
  const position = useDronePosition(droneId);
  
  if (!position) return null;

  const handleClick = useCallback((e: any) => {
    e.originalEvent.stopPropagation();
    onClick({
      id: droneId,
      latitude: position.position[1],
      longitude: position.position[0],
      type: position.type as 'friendly' | 'enemy' | 'objective',
      title: position.label || droneId,
      description: `Drone ${droneId}`
    });
  }, [droneId, position, onClick]);

  return (
    <Marker
      longitude={position.position[0]}
      latitude={position.position[1]}
      anchor="bottom"
      onClick={handleClick}
    >
      <div className="cursor-pointer drone-marker-optimized">
        {getMarkerIcon(position.type)}
      </div>
    </Marker>
  );
});

DroneMarker.displayName = 'DroneMarker';

// Virtualized marker list component
const VirtualizedMarkers = memo(({ 
  visibleDroneIds, 
  onMarkerClick 
}: { 
  visibleDroneIds: string[]; 
  onMarkerClick: (marker: MapMarker) => void; 
}) => {
  return (
    <>
      {visibleDroneIds.map(droneId => (
        <DroneMarker 
          key={droneId} 
          droneId={droneId} 
          onClick={onMarkerClick} 
        />
      ))}
    </>
  );
});

VirtualizedMarkers.displayName = 'VirtualizedMarkers';

const OptimizedTacticalMap: React.FC<OptimizedTacticalMapProps> = ({ 
  initialViewState = {
    latitude: 37.795,
    longitude: -122.395,
    zoom: 15
  },
  className,
  visibleDroneIds = []
}) => {
  const mapRef = useRef<any>(null);
  const [viewState, setViewState] = useState(initialViewState);
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
  const animationFrameRef = useRef<number>();

  // Use optimized realtime hook
  const { realtimeData } = useRealtime();

  // Throttled map updates using requestAnimationFrame
  const throttledMapUpdate = useCallback((updateFn: () => void) => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    animationFrameRef.current = requestAnimationFrame(() => {
      updateFn();
      animationFrameRef.current = undefined;
    });
  }, []);

  // Memoized operational zones to prevent recalculation
  const operationalZonesGeoJSON = useMemo(() => ({
    type: 'FeatureCollection',
    features: [
      // Pre-calculated operational zones
      generateCircleData(
        [-122.395, 37.795], 
        0.4,
        { id: 'zone-1', title: 'Primary Operational Zone', type: 'primary' }
      ),
      generateCircleData(
        [-122.395, 37.793], 
        0.3,
        { id: 'zone-2', title: 'Ferry Building Area', type: 'secondary' }
      ),
      generateCircleData(
        [-122.388, 37.798], 
        0.25,
        { id: 'zone-3', title: 'Port Area', type: 'tertiary' }
      )
    ]
  }), []);

  // Memoized layer styles
  const layerStyles = useMemo(() => ({
    primary: {
      id: 'zone-primary',
      type: 'fill' as const,
      filter: ['==', ['get', 'type'], 'primary'],
      paint: {
        'fill-color': '#3182CE',
        'fill-opacity': 0.2,
        'fill-outline-color': '#3182CE'
      }
    },
    secondary: {
      id: 'zone-secondary', 
      type: 'fill' as const,
      filter: ['==', ['get', 'type'], 'secondary'],
      paint: {
        'fill-color': '#38A169',
        'fill-opacity': 0.15,
        'fill-outline-color': '#38A169'
      }
    },
    tertiary: {
      id: 'zone-tertiary',
      type: 'fill' as const,
      filter: ['==', ['get', 'type'], 'tertiary'],
      paint: {
        'fill-color': '#D69E2E',
        'fill-opacity': 0.15,
        'fill-outline-color': '#D69E2E'
      }
    }
  }), []);

  // Optimized marker click handler
  const handleMarkerClick = useCallback((marker: MapMarker) => {
    throttledMapUpdate(() => {
      setSelectedMarker(marker);
    });
  }, [throttledMapUpdate]);

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Memoized map move handler
  const handleMove = useCallback((evt: any) => {
    throttledMapUpdate(() => {
      setViewState(evt.viewState);
    });
  }, [throttledMapUpdate]);

  return (
    <div className={`relative w-full h-full ${className}`}>
      <Map
        ref={mapRef}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        initialViewState={initialViewState}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
        onMove={handleMove}
        getCursor={() => 'default'}
        // Performance optimizations
        reuseMaps
        RTLTextPlugin={false}
        optimizeForTerrain={false}
      >
        {/* Operational zones */}
        <Source id="operational-zones" type="geojson" data={operationalZonesGeoJSON as any}>
          <Layer {...layerStyles.primary as any} />
          <Layer {...layerStyles.secondary as any} />
          <Layer {...layerStyles.tertiary as any} />
        </Source>

        {/* Virtualized drone markers */}
        <VirtualizedMarkers 
          visibleDroneIds={visibleDroneIds}
          onMarkerClick={handleMarkerClick}
        />

        <NavigationControl position="top-right" />

        {/* Optimized popup */}
        {selectedMarker && (
          <Popup
            longitude={selectedMarker.longitude}
            latitude={selectedMarker.latitude}
            anchor="bottom"
            onClose={() => setSelectedMarker(null)}
            closeButton={true}
            closeOnClick={false}
            className="z-10"
          >
            <div className="p-2 max-w-[200px]">
              <h3 className="font-semibold text-sm mb-1">{selectedMarker.title}</h3>
              {selectedMarker.description && (
                <p className="text-xs text-gray-700">{selectedMarker.description}</p>
              )}
              <div className="flex justify-between items-center mt-2">
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  selectedMarker.type === 'friendly' ? 'bg-blue-100 text-blue-800' :
                  selectedMarker.type === 'enemy' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {selectedMarker.type.charAt(0).toUpperCase() + selectedMarker.type.slice(1)}
                </span>
                <span className="text-xs text-gray-500">
                  {selectedMarker.latitude.toFixed(4)}, {selectedMarker.longitude.toFixed(4)}
                </span>
              </div>
            </div>
          </Popup>
        )}
      </Map>
      
      {/* Performance monitoring overlay */}
      <div className="absolute top-4 left-4 bg-white/90 shadow-md rounded-md p-2">
        <div className="flex items-center space-x-1">
          <Crosshair className="h-3.5 w-3.5 text-gray-600" />
          <span className="text-xs text-gray-800">
            {viewState.latitude.toFixed(4)}, {viewState.longitude.toFixed(4)}
          </span>
          <span className="text-xs text-green-600">
            | {visibleDroneIds.length} drones
          </span>
        </div>
      </div>
      
      {/* Optimized CSS for markers */}
      <style jsx global>{`
        .drone-marker-optimized {
          width: 20px;
          height: 20px;
          will-change: transform; /* Enable GPU acceleration */
        }
        
        .drone-marker-optimized svg {
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
          transition: transform 0.1s ease;
        }
        
        .drone-marker-optimized:hover svg {
          transform: scale(1.1);
        }
      `}</style>
    </div>
  );
};

// Helper functions
function getMarkerIcon(type: string) {
  switch(type) {
    case 'friendly':
      return <Plane className="h-6 w-6 text-blue-500" />;
    case 'enemy':
      return <AlertCircle className="h-6 w-6 text-red-500" />;
    case 'objective':
      return <Flag className="h-6 w-6 text-yellow-500" />;
    default:
      return <MapPin className="h-6 w-6 text-gray-500" />;
  }
}

function generateCircleData(center: [number, number], radiusKm: number, properties: any) {
  const points = 32; // Reduced for performance
  const coords = {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[]]
    },
    properties
  };
  
  const earthRadius = 6371;
  const radiusRad = radiusKm / earthRadius;
  const centerLonRad = (center[0] * Math.PI) / 180;
  const centerLatRad = (center[1] * Math.PI) / 180;
  
  for (let i = 0; i <= points; i++) {
    const angle = (i * 2 * Math.PI) / points;
    const latRad = Math.asin(Math.sin(centerLatRad) * Math.cos(radiusRad) + 
                            Math.cos(centerLatRad) * Math.sin(radiusRad) * Math.cos(angle));
    const lonRad = centerLonRad + Math.atan2(Math.sin(angle) * Math.sin(radiusRad) * Math.cos(centerLatRad),
                                          Math.cos(radiusRad) - Math.sin(centerLatRad) * Math.sin(latRad));
    
    const lon = (lonRad * 180) / Math.PI;
    const lat = (latRad * 180) / Math.PI;
    
    coords.geometry.coordinates[0].push([lon, lat]);
  }
  
  return coords;
}

export default memo(OptimizedTacticalMap);