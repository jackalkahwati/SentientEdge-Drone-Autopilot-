import React, { useState, useRef, useEffect } from 'react';
import Map, { Marker, Popup, NavigationControl, Source, Layer } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Flag, MapPin, Crosshair, AlertCircle, Plane } from 'lucide-react';

// Types
interface TacticalMapProps {
  initialViewState?: {
    latitude: number;
    longitude: number;
    zoom: number;
  };
  className?: string;
}

interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  type: 'friendly' | 'enemy' | 'objective';
  title: string;
  description?: string;
}

interface OperationalZone {
  id: string;
  latitude: number;
  longitude: number;
  radiusKm: number; 
  title: string;
  type: 'primary' | 'secondary' | 'tertiary';
}

const MapboxTacticalMap: React.FC<TacticalMapProps> = ({ 
  initialViewState = {
    latitude: 37.795,
    longitude: -122.395,
    zoom: 15
  },
  className
}) => {
  const mapRef = useRef<any>(null);
  const [viewState, setViewState] = useState(initialViewState);
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [mapStyle, setMapStyle] = useState('satellite-streets-v12'); // satellite-streets-v12, outdoors-v12, dark-v11

  // Sample markers
  const markers: MapMarker[] = [
    {
      id: 'friendly-1',
      latitude: 37.796,
      longitude: -122.393,
      type: 'friendly',
      title: 'Alpha Team',
      description: 'Quadcopter drone unit performing surveillance'
    },
    {
      id: 'friendly-2',
      latitude: 37.794,
      longitude: -122.397,
      type: 'friendly',
      title: 'Bravo Team',
      description: 'Fixed-wing drone patrol'
    },
    {
      id: 'friendly-3',
      latitude: 37.792,
      longitude: -122.394,
      type: 'friendly',
      title: 'Command Unit',
      description: 'Mobile command center'
    },
    {
      id: 'enemy-1',
      latitude: 37.798,
      longitude: -122.391,
      type: 'enemy',
      title: 'Unknown Vehicle',
      description: 'Suspicious vehicle spotted in restricted area'
    },
    {
      id: 'enemy-2',
      latitude: 37.797,
      longitude: -122.389,
      type: 'enemy',
      title: 'Unauthorized Drone',
      description: 'Small quadcopter of unknown origin'
    },
    {
      id: 'objective-1',
      latitude: 37.795,
      longitude: -122.391,
      type: 'objective',
      title: 'Primary Target',
      description: 'High-value reconnaissance objective'
    }
  ];

  // Operational zones (circular areas)
  const operationalZones: OperationalZone[] = [
    {
      id: 'zone-1',
      latitude: 37.795,
      longitude: -122.395,
      radiusKm: 0.4,
      title: 'Primary Operational Zone',
      type: 'primary'
    },
    {
      id: 'zone-2',
      latitude: 37.793,
      longitude: -122.395,
      radiusKm: 0.3,
      title: 'Ferry Building Area',
      type: 'secondary'
    },
    {
      id: 'zone-3',
      latitude: 37.798,
      longitude: -122.388,
      radiusKm: 0.25,
      title: 'Port Area',
      type: 'tertiary'
    }
  ];

  // Generate GeoJSON for the operational zones
  const generateCircleData = (center: [number, number], radiusKm: number, properties: any) => {
    const points = 64;
    const coords = {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[]]
      },
      properties
    };
    
    // Earth's radius in km
    const earthRadius = 6371;
    
    // Calculate the radius in radians
    const radiusRad = radiusKm / earthRadius;
    
    // Convert center to radians
    const centerLonRad = (center[0] * Math.PI) / 180;
    const centerLatRad = (center[1] * Math.PI) / 180;
    
    // Generate points around the circle
    for (let i = 0; i <= points; i++) {
      const angle = (i * 2 * Math.PI) / points;
      const latRad = Math.asin(Math.sin(centerLatRad) * Math.cos(radiusRad) + 
                              Math.cos(centerLatRad) * Math.sin(radiusRad) * Math.cos(angle));
      const lonRad = centerLonRad + Math.atan2(Math.sin(angle) * Math.sin(radiusRad) * Math.cos(centerLatRad),
                                            Math.cos(radiusRad) - Math.sin(centerLatRad) * Math.sin(latRad));
      
      // Convert back to degrees
      const lon = (lonRad * 180) / Math.PI;
      const lat = (latRad * 180) / Math.PI;
      
      coords.geometry.coordinates[0].push([lon, lat]);
    }
    
    return coords;
  };

  // Create GeoJSON for all operational zones
  const operationalZonesGeoJSON = {
    type: 'FeatureCollection',
    features: operationalZones.map(zone => 
      generateCircleData(
        [zone.longitude, zone.latitude], 
        zone.radiusKm,
        { id: zone.id, title: zone.title, type: zone.type }
      )
    )
  };

  // Layer styles for the operational zones
  const primaryZoneLayer = {
    id: 'zone-primary',
    type: 'fill',
    filter: ['==', ['get', 'type'], 'primary'],
    paint: {
      'fill-color': '#3182CE',
      'fill-opacity': 0.2,
      'fill-outline-color': '#3182CE'
    }
  };

  const secondaryZoneLayer = {
    id: 'zone-secondary',
    type: 'fill',
    filter: ['==', ['get', 'type'], 'secondary'],
    paint: {
      'fill-color': '#38A169',
      'fill-opacity': 0.15,
      'fill-outline-color': '#38A169'
    }
  };

  const tertiaryZoneLayer = {
    id: 'zone-tertiary',
    type: 'fill',
    filter: ['==', ['get', 'type'], 'tertiary'],
    paint: {
      'fill-color': '#D69E2E',
      'fill-opacity': 0.15,
      'fill-outline-color': '#D69E2E'
    }
  };

  // Handle marker click
  const handleMarkerClick = (marker: MapMarker) => {
    setSelectedMarker(marker);
  };

  // Get appropriate icon for marker type
  const getMarkerIcon = (type: string) => {
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
  };

  // Handle map style change
  const handleMapStyleChange = (style: string) => {
    setMapStyle(style);
  };

  return (
    <div className={`relative w-full h-full ${className}`}>
      <Map
        ref={mapRef}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        initialViewState={initialViewState}
        style={{ width: '100%', height: '100%' }}
        mapStyle={`mapbox://styles/mapbox/${mapStyle}`}
        onMove={evt => setViewState(evt.viewState)}
        getCursor={() => 'default'}
      >
        {/* Add operational zones */}
        <Source id="operational-zones" type="geojson" data={operationalZonesGeoJSON as any}>
          <Layer {...primaryZoneLayer as any} />
          <Layer {...secondaryZoneLayer as any} />
          <Layer {...tertiaryZoneLayer as any} />
        </Source>

        {/* Add markers */}
        {markers.map(marker => (
          <Marker
            key={marker.id}
            longitude={marker.longitude}
            latitude={marker.latitude}
            anchor="bottom"
            onClick={e => {
              e.originalEvent.stopPropagation();
              handleMarkerClick(marker);
            }}
          >
            <div className="cursor-pointer">
              {getMarkerIcon(marker.type)}
            </div>
          </Marker>
        ))}

        {/* Navigation controls */}
        {showControls && (
          <NavigationControl position="top-right" />
        )}

        {/* Selected marker popup */}
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
      
      {/* Map controls overlay */}
      <div className="absolute bottom-4 left-4 flex flex-col space-y-2">
        <div className="bg-white/90 shadow-md rounded-md p-2">
          <div className="flex space-x-1">
            <button 
              onClick={() => handleMapStyleChange('satellite-streets-v12')}
              className={`p-1.5 text-xs rounded ${mapStyle === 'satellite-streets-v12' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}
            >
              Satellite
            </button>
            <button 
              onClick={() => handleMapStyleChange('outdoors-v12')}
              className={`p-1.5 text-xs rounded ${mapStyle === 'outdoors-v12' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}
            >
              Terrain
            </button>
            <button 
              onClick={() => handleMapStyleChange('dark-v11')}
              className={`p-1.5 text-xs rounded ${mapStyle === 'dark-v11' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}
            >
              Dark
            </button>
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white/90 shadow-md rounded-md p-2 space-y-1.5">
        <div className="flex items-center space-x-2">
          <Plane className="h-4 w-4 text-blue-500" />
          <span className="text-xs text-gray-800">Friendly Unit</span>
        </div>
        <div className="flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <span className="text-xs text-gray-800">Enemy Unit</span>
        </div>
        <div className="flex items-center space-x-2">
          <Flag className="h-4 w-4 text-yellow-500" />
          <span className="text-xs text-gray-800">Objective</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="h-3 w-3 bg-blue-500/50 rounded-full border border-blue-500"></div>
          <span className="text-xs text-gray-800">Operational Zone</span>
        </div>
      </div>
      
      {/* Coordinates */}
      <div className="absolute top-4 left-4 bg-white/90 shadow-md rounded-md p-2">
        <div className="flex items-center space-x-1">
          <Crosshair className="h-3.5 w-3.5 text-gray-600" />
          <span className="text-xs text-gray-800">
            {viewState.latitude.toFixed(4)}, {viewState.longitude.toFixed(4)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MapboxTacticalMap;