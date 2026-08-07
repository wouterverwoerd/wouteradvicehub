import React, { useEffect, useRef, useState } from 'react';
import { Job } from '../types';
import { MapPin, Globe, Compass, RefreshCw, Layers } from 'lucide-react';

interface JobsMapProps {
  jobs: Job[];
  selectedArea: string | null;
  onSelectArea: (area: string | null) => void;
}

// Coordinate lookup for known cities and specific sub-areas
const CITY_COORDINATES: Record<string, [number, number]> = {
  // Christchurch & Suburbs
  'christchurch central': [-43.5321, 172.6362],
  'christchurch central, new zealand': [-43.5321, 172.6362],
  'christchurch cbd': [-43.5321, 172.6362],
  'christchurch': [-43.5321, 172.6362],
  'christchurch, new zealand': [-43.5321, 172.6362],
  'riccarton, christchurch': [-43.5309, 172.5936],
  'riccarton, christchurch, nz': [-43.5309, 172.5936],
  'addington, christchurch': [-43.5410, 172.6160],
  'sydenham, christchurch': [-43.5460, 172.6370],
  'papanui, christchurch': [-43.4950, 172.6110],

  // Auckland & Suburbs
  'auckland cbd': [-36.8485, 174.7633],
  'auckland cbd, new zealand': [-36.8485, 174.7633],
  'auckland central': [-36.8485, 174.7633],
  'auckland': [-36.8485, 174.7633],
  'auckland, new zealand': [-36.8485, 174.7633],
  'ponsonby, auckland': [-36.8523, 174.7456],
  'ponsonby, auckland, nz': [-36.8523, 174.7456],
  'newmarket, auckland': [-36.8687, 174.7770],
  'parnell, auckland': [-36.8530, 174.7790],
  'albany, auckland': [-36.7289, 174.7022],
  'manukau, auckland': [-36.9926, 174.8797],

  // Wellington & Suburbs
  'wellington central': [-41.2865, 174.7762],
  'wellington central, new zealand': [-41.2865, 174.7762],
  'wellington cbd': [-41.2865, 174.7762],
  'wellington': [-41.2865, 174.7762],
  'wellington, new zealand': [-41.2865, 174.7762],
  'te aro, wellington': [-41.2924, 174.7787],
  'te aro, wellington, nz': [-41.2924, 174.7787],
  'thorndon, wellington': [-41.2725, 174.7760],
  'lower hutt, wellington': [-41.2160, 174.9080],

  // Hamilton & Suburbs
  'hamilton central': [-37.7870, 175.2793],
  'hamilton central, new zealand': [-37.7870, 175.2793],
  'hamilton': [-37.7870, 175.2793],
  'frankton, hamilton': [-37.7915, 175.2592],
  'frankton, hamilton, nz': [-37.7915, 175.2592],
  'frankton, hamilton, new zealand': [-37.7915, 175.2592],

  // Queenstown & Suburbs
  'queenstown central': [-45.0312, 168.6626],
  'queenstown central, new zealand': [-45.0312, 168.6626],
  'queenstown': [-45.0312, 168.6626],
  'frankton, queenstown': [-45.0210, 168.7360],

  // Other Major NZ Cities
  'tauranga central': [-37.6878, 176.1651],
  'mount maunganui, tauranga': [-37.6330, 176.1850],
  'tauranga': [-37.6878, 176.1651],
  'dunedin central': [-45.8788, 170.5028],
  'dunedin': [-45.8788, 170.5028],
  'palmerston north': [-40.3523, 175.6082],
  'napier': [-39.4928, 176.9120],
  'nelson': [-41.2706, 173.2840],
  'new plymouth': [-39.0556, 174.0752],
  'whangarei': [-35.7275, 174.3166],
  'invercargill': [-46.4132, 168.3538],
  'rotorua': [-38.1368, 176.2497],
  'new zealand': [-40.9006, 172.8860],
  'remote / new zealand': [-40.9006, 172.8860],

  // Global Fallbacks
  'amsterdam': [52.3676, 4.9041],
  'london': [51.5074, -0.1278],
  'san francisco': [37.7749, -122.4194],
  'sydney': [-33.8688, 151.2093],
  'remote': [-40.9006, 172.8860],
  'remote / global': [-40.9006, 172.8860],
  'global': [-40.9006, 172.8860],
};

const MAIN_CITIES: Record<string, [number, number]> = {
  'christchurch': [-43.5321, 172.6362],
  'auckland': [-36.8485, 174.7633],
  'wellington': [-41.2865, 174.7762],
  'hamilton': [-37.7870, 175.2793],
  'queenstown': [-45.0312, 168.6626],
  'dunedin': [-45.8788, 170.5028],
  'tauranga': [-37.6878, 176.1651],
  'palmerston': [-40.3523, 175.6082],
  'napier': [-39.4928, 176.9120],
  'nelson': [-41.2706, 173.2840],
  'invercargill': [-46.4132, 168.3538],
};

// Deterministic coordinate generator for specific city/suburb area names
function getCoordinatesForArea(areaName: string): [number, number] {
  const clean = areaName.trim().toLowerCase();

  // 1. Exact match in dictionary
  if (CITY_COORDINATES[clean]) {
    return CITY_COORDINATES[clean];
  }

  // 2. Direct partial key match
  for (const [key, coords] of Object.entries(CITY_COORDINATES)) {
    if (clean === key || clean.startsWith(key) || key.startsWith(clean)) {
      return coords;
    }
  }

  // 3. Suburb/Area within a major city (e.g. "Christchurch Central, New Zealand" -> Christchurch base + slight offset)
  for (const [cityName, baseCoords] of Object.entries(MAIN_CITIES)) {
    if (clean.includes(cityName)) {
      let hash = 0;
      for (let i = 0; i < clean.length; i++) {
        hash = clean.charCodeAt(i) + ((hash << 5) - hash);
      }
      // Micro offset within ~1-2km of city center
      const offsetLat = (((Math.abs(hash) % 200) - 100) / 10000); // +/- 0.01 deg
      const offsetLng = (((Math.abs(hash * 7) % 200) - 100) / 10000); // +/- 0.01 deg
      return [baseCoords[0] + offsetLat, baseCoords[1] + offsetLng];
    }
  }

  // 4. Hash character string fallback within New Zealand bounding box if unspecified
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = clean.charCodeAt(i) + ((hash << 5) - hash);
  }
  const lat = -46 + ((Math.abs(hash) % 1000) / 100); // -46 to -36 (NZ)
  const lng = 166 + ((Math.abs(hash * 13) % 1200) / 100); // 166 to 178 (NZ)
  return [lat, lng];
}

export const JobsMap: React.FC<JobsMapProps> = ({ jobs, selectedArea, onSelectArea }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Group jobs by normalized area name
  const areaGroups = React.useMemo(() => {
    const groups: Record<string, Job[]> = {};
    jobs.forEach((job) => {
      const area = (job.area || 'Remote / Global').trim();
      if (!groups[area]) {
        groups[area] = [];
      }
      groups[area].push(job);
    });
    return groups;
  }, [jobs]);

  // Helper to ensure window.L is available
  const initMap = () => {
    const L = (window as any).L;
    if (!L || !mapContainerRef.current || mapInstanceRef.current) return;

    // Fix leaflet default image paths
    if (L.Icon && L.Icon.Default && L.Icon.Default.prototype) {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
    }

    const map = L.map(mapContainerRef.current, {
      center: [-40.9006, 172.8860], // Focus directly on New Zealand
      zoom: 6,
      minZoom: 2,
      maxZoom: 18,
      scrollWheelZoom: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const markersGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = markersGroup;
    mapInstanceRef.current = map;
    setMapLoaded(true);
  };

  // Initialize Leaflet map with dynamic script load fallback
  useEffect(() => {
    if ((window as any).L) {
      initMap();
      return;
    }

    // Dynamic Leaflet CSS fallback
    if (!document.getElementById('leaflet-css-fallback')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css-fallback';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Dynamic Leaflet JS fallback
    if (!document.getElementById('leaflet-js-fallback')) {
      const script = document.createElement('script');
      script.id = 'leaflet-js-fallback';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => initMap();
      document.head.appendChild(script);
    } else {
      const interval = setInterval(() => {
        if ((window as any).L) {
          clearInterval(interval);
          initMap();
        }
      }, 100);
      return () => clearInterval(interval);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Render job area markers whenever areaGroups, mapLoaded or selectedArea changes
  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapInstanceRef.current || !markersLayerRef.current) return;

    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    layer.clearLayers();

    const bounds = L.latLngBounds([]);
    let hasPoints = false;

    (Object.entries(areaGroups) as [string, Job[]][]).forEach(([areaName, areaJobs]) => {
      const coords = getCoordinatesForArea(areaName);
      bounds.extend(coords);
      hasPoints = true;

      const isSelected = selectedArea && selectedArea.toLowerCase() === areaName.toLowerCase();
      const count = areaJobs.length;

      // Custom HTML Marker Pin
      const pinBg = isSelected ? '#4f46e5' : '#0284c7';
      const pinBorder = isSelected ? '#312e81' : '#0369a1';

      const customIcon = L.divIcon({
        className: 'job-map-marker',
        html: `
          <div style="
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            background: ${pinBg};
            color: white;
            padding: 6px 12px;
            border-radius: 9999px;
            font-size: 11px;
            font-weight: 700;
            white-space: nowrap;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
            border: 2px solid ${pinBorder};
            cursor: pointer;
            transition: all 0.2s ease;
            transform: ${isSelected ? 'scale(1.15)' : 'scale(1)'};
            z-index: ${isSelected ? 1000 : 1};
          ">
            <span style="margin-right: 5px;">📍</span>
            <span>${areaName}</span>
            <span style="
              margin-left: 6px;
              background: rgba(255, 255, 255, 0.25);
              padding: 1px 6px;
              border-radius: 12px;
              font-size: 10px;
            ">${count}</span>
          </div>
        `,
        iconSize: [120, 36],
        iconAnchor: [60, 18],
      });

      const marker = L.marker(coords, { icon: customIcon });

      // Build Popup Content
      const jobsListHtml = areaJobs
        .slice(0, 4)
        .map(
          (j) => `
          <div style="padding: 4px 0; border-bottom: 1px solid #f1f5f9;">
            <div style="font-weight: 700; color: #0f172a; font-size: 12px;">${j.jobTitle}</div>
            <div style="color: #64748b; font-size: 11px;">${j.company}</div>
          </div>
        `
        )
        .join('');

      const popupContent = `
        <div style="font-family: sans-serif; min-width: 180px;">
          <div style="font-weight: 800; font-size: 13px; color: #4338ca; margin-bottom: 6px;">
            📍 ${areaName} (${count} ${count === 1 ? 'Job' : 'Jobs'})
          </div>
          ${jobsListHtml}
          ${
            areaJobs.length > 4
              ? `<div style="font-size: 10px; color: #64748b; margin-top: 4px;">+ ${areaJobs.length - 4} more</div>`
              : ''
          }
        </div>
      `;

      marker.bindPopup(popupContent);

      marker.on('click', () => {
        onSelectArea(isSelected ? null : areaName);
      });

      marker.addTo(layer);
    });

    // Auto fit bounds if points exist
    if (hasPoints && !selectedArea) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 6 });
    } else if (selectedArea) {
      const selectedCoords = getCoordinatesForArea(selectedArea);
      map.setView(selectedCoords, 10, { animate: true });
    }
  }, [areaGroups, selectedArea, mapLoaded, onSelectArea]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
      {/* Map Header Controls */}
      <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <span>Interactive Job Opportunities Map</span>
            </h3>
            <p className="text-[11px] text-slate-300">
              Select an area marker to filter active job listings by location.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <button
            onClick={() => onSelectArea(null)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              selectedArea === null
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            All Areas ({jobs.length})
          </button>

          {(Object.entries(areaGroups) as [string, Job[]][]).map(([areaName, areaJobs]) => {
            const isSelected = selectedArea && selectedArea.toLowerCase() === areaName.toLowerCase();
            return (
              <button
                key={areaName}
                onClick={() => onSelectArea(isSelected ? null : areaName)}
                className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <MapPin className="w-3 h-3 text-indigo-400 shrink-0" />
                <span>{areaName}</span>
                <span className="ml-1 bg-slate-900/50 px-1.5 py-0.5 rounded-full text-[10px]">
                  {areaJobs.length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Leaflet Canvas Container */}
      <div className="relative w-full h-80 sm:h-96 bg-slate-100">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Selected Area Banner Overlay */}
        {selectedArea && (
          <div className="absolute top-3 left-3 z-[400] bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-xl shadow-lg border border-slate-200/80 flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="text-xs font-bold text-slate-900">
              Filtered Area: <span className="text-indigo-600">{selectedArea}</span>
            </span>
            <button
              onClick={() => onSelectArea(null)}
              className="ml-2 text-slate-400 hover:text-slate-700 text-xs font-medium underline"
            >
              Clear
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
