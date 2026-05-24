import React, { useState, useMemo } from 'react';
import { scaleLinear } from 'd3';
import { SUBURB_COORDINATES, getJobDistance } from '../App';
import { MapPin, ZoomIn, ZoomOut, Compass, Info, Locate } from 'lucide-react';

interface SuburbProximityMapProps {
  userSuburbKey: string;
  setUserSuburbKey: (key: string) => void;
  maxDistance: number;
  setMaxDistance: (dist: number) => void;
  triggerToast: (msg: string) => void;
}

// Group coordinates for better grouping
interface SuburbNode {
  key: string;
  lat: number;
  lng: number;
  label: string;
  city: 'Harare' | 'Bulawayo' | 'Chitungwiza';
}

export default function SuburbProximityMap({
  userSuburbKey,
  setUserSuburbKey,
  maxDistance,
  setMaxDistance,
  triggerToast,
}: SuburbProximityMapProps) {
  // Map View Mode: 'ZW' (All Zimbabwe), 'Harare', or 'Bulawayo'
  const [viewMode, setViewMode] = useState<'ZW' | 'Harare' | 'Bulawayo'>(() => {
    if (userSuburbKey === 'all') return 'ZW';
    const sub = SUBURB_COORDINATES[userSuburbKey];
    if (!sub) return 'ZW';
    return sub.city === 'Bulawayo' ? 'Bulawayo' : 'Harare';
  });

  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Auto-align view mode with selected suburb state if it shifts outside
  React.useEffect(() => {
    if (userSuburbKey !== 'all') {
      const sub = SUBURB_COORDINATES[userSuburbKey];
      if (sub) {
        setViewMode(sub.city === 'Bulawayo' ? 'Bulawayo' : 'Harare');
      }
    }
  }, [userSuburbKey]);

  // Width and Height of the bounding canvas
  const width = 310;
  const height = 185;

  // Static highway coords representing major connection Harare <=> Bulawayo (very beautiful visual connection!)
  // Geolocation points of Gweru and Gweru East, Kadoma, Kwekwe on the highway path
  const highwayPoints = useMemo(() => [
    { name: 'Bulawayo', lat: -20.1500, lng: 28.5833 },
    { name: 'Gweru', lat: -19.4500, lng: 29.8167 },
    { name: 'Kwekwe', lat: -18.9167, lng: 29.8167 },
    { name: 'Kadoma', lat: -18.2667, lng: 29.9167 },
    { name: 'Harare', lat: -17.8292, lng: 31.0522 }
  ], []);

  // Determine current map boundary boxes
  const projectionScales = useMemo(() => {
    if (viewMode === 'Harare') {
      // Harare Area Zoom Range
      const latDomain = [-18.06, -17.71]; // South to North
      const lngDomain = [31.00, 31.26];   // West to East
      
      const xScale = scaleLinear().domain(lngDomain).range([15, width - 15]);
      const yScale = scaleLinear().domain(latDomain).range([height - 20, 15]); // Invert latitude to match SVG
      
      // Horizontal distance scale reference: ~27.5 km horizontally.
      // So 27.5km fits into (width - 30) pixels (280px)
      // Conversion factor: ~10.18 pixels per kilometer
      const pixelsPerKm = (width - 30) / (27.5 * 0.952); // adjusted roughly
      
      return { xScale, yScale, pixelsPerKm, label: 'Harare & Surrounding Hubs' };
    } else if (viewMode === 'Bulawayo') {
      // Bulawayo Area Zoom Range
      const latDomain = [-20.21, -20.11];
      const lngDomain = [28.54, 28.64];
      
      const xScale = scaleLinear().domain(lngDomain).range([30, width - 30]);
      const yScale = scaleLinear().domain(latDomain).range([height - 25, 15]);
      
      // Horizontal distance scale reference: ~10.4 km horizontally.
      // Maps to 250px. Conversion factor: ~24.0 pixels per kilometer
      const pixelsPerKm = (width - 60) / 10.4;
      
      return { xScale, yScale, pixelsPerKm, label: 'Bulawayo Metro Hub' };
    } else {
      // All Zimbabwe Macro View
      const latDomain = [-22.3, -15.6];
      const lngDomain = [25.0, 33.0];
      
      const xScale = scaleLinear().domain(lngDomain).range([30, width - 30]);
      const yScale = scaleLinear().domain(latDomain).range([height - 25, 15]);
      
      // Zimbabwe is ~850 km wide. Maps to 250px.
      // 0.29 pixels per kilometer
      const pixelsPerKm = (width - 60) / 850;
      
      return { xScale, yScale, pixelsPerKm, label: 'Zimbabwe Country Outlook' };
    }
  }, [viewMode, width, height]);

  const { xScale, yScale, pixelsPerKm } = projectionScales;

  // Format all active suburbs coordinates
  const suburbs: SuburbNode[] = useMemo(() => {
    return Object.entries(SUBURB_COORDINATES).map(([key, data]) => ({
      key,
      lat: data.lat,
      lng: data.lng,
      label: data.label,
      city: data.city as 'Harare' | 'Bulawayo' | 'Chitungwiza',
    }));
  }, []);

  // Filter suburbs shown depending on the current zoom view Mode
  const visibleSuburbs = useMemo(() => {
    if (viewMode === 'Harare') {
      return suburbs.filter(s => s.city === 'Harare' || s.city === 'Chitungwiza');
    }
    if (viewMode === 'Bulawayo') {
      return suburbs.filter(s => s.city === 'Bulawayo');
    }
    // ZW view lists main regional anchor hubs (Harare CBD & Bulawayo CBD)
    return suburbs.filter(s => s.key === 'cbd_harare' || s.key === 'cbd_byo');
  }, [viewMode, suburbs]);

  // Handle clicking on a suburb node
  const handleNodeClick = (node: SuburbNode) => {
    setUserSuburbKey(node.key);
    triggerToast(`📍 Set distance filter origin to ${node.label.split(',')[0]}!`);
  };

  // Find currently active node coordinates
  const activeNodeCoords = useMemo(() => {
    if (userSuburbKey === 'all') return null;
    const s = SUBURB_COORDINATES[userSuburbKey];
    if (!s) return null;
    return {
      x: xScale(s.lng),
      y: yScale(s.lat),
      sub: s,
    };
  }, [userSuburbKey, xScale, yScale]);

  // Radius in pixels for dynamic Proximity slider feedback
  const proximityRadiusPx = useMemo(() => {
    if (!activeNodeCoords || userSuburbKey === 'all') return 0;
    return maxDistance * pixelsPerKm;
  }, [activeNodeCoords, maxDistance, pixelsPerKm, userSuburbKey]);

  // Determine if view is navigated away from the active selected suburb's city view mode
  const needsRecenter = useMemo(() => {
    if (userSuburbKey === 'all') return false;
    const sub = SUBURB_COORDINATES[userSuburbKey];
    if (!sub) return false;
    const targetViewMode = sub.city === 'Bulawayo' ? 'Bulawayo' : 'Harare';
    return viewMode !== targetViewMode;
  }, [userSuburbKey, viewMode]);

  return (
    <div className="bg-black/20 p-3 rounded-2xl border border-white/5 space-y-3">
      {/* Map Control Actions Header */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest flex items-center gap-1">
          <Compass className="w-3.5 h-3.5 text-emerald-400 animate-spin-slow" />
          <span>{projectionScales.label}</span>
        </span>

        {/* Dynamic Zoom Map Options */}
        <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-lg border border-white/5 text-[9.5px]">
          <button
            type="button"
            onClick={() => {
              setViewMode('ZW');
              setUserSuburbKey('all');
              triggerToast('🗺️ Zoomed out to entire Zimbabwe view.');
            }}
            className={`px-2 py-0.5 rounded-md font-bold transition ${
              viewMode === 'ZW'
                ? 'bg-emerald-400 text-indigo-950 shadow-xs'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            ZW
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode('Harare');
              if (userSuburbKey === 'all' || SUBURB_COORDINATES[userSuburbKey]?.city === 'Bulawayo') {
                setUserSuburbKey('cbd_harare');
              }
              triggerToast('📍 Focused Harare Region Map.');
            }}
            className={`px-2 py-0.5 rounded-md font-bold transition flex items-center gap-0.5 ${
              viewMode === 'Harare'
                ? 'bg-emerald-400 text-indigo-950 shadow-xs'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            Harare
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode('Bulawayo');
              if (userSuburbKey === 'all' || SUBURB_COORDINATES[userSuburbKey]?.city !== 'Bulawayo') {
                setUserSuburbKey('cbd_byo');
              }
              triggerToast('📍 Focused Bulawayo Region Map.');
            }}
            className={`px-2 py-0.5 rounded-md font-bold transition flex items-center gap-0.5 ${
              viewMode === 'Bulawayo'
                ? 'bg-emerald-400 text-indigo-950 shadow-xs'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            BYO
          </button>
        </div>
      </div>

      {/* Styled SVG Map Overlay Container */}
      <div className="relative w-full overflow-hidden bg-slate-950/90 rounded-xl border border-white/10 p-1 flex items-center justify-center">
        {/* Subtle grid background coordinate design */}
        <div className="absolute inset-0 grid grid-cols-6 grid-rows-4 pointer-events-none opacity-10">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="border-r border-b border-dashed border-emerald-400" />
          ))}
        </div>

        <svg
          width={width}
          height={height}
          className="relative z-10 overflow-visible text-white select-none"
        >
          {/* Legend Coordinates scale */}
          <text x="12" y="20" className="fill-white/30 text-[8px] font-mono tracking-wider">
            GPS: WGS84
          </text>
          
          {/* Compass layout inside the SVG corner */}
          <g transform={`translate(${width - 20}, 22)`} className="opacity-40">
            <circle r="8" fill="none" stroke="#34d399" strokeWidth="0.8" strokeDasharray="2 1" />
            <line x1="0" y1="-10" x2="0" y2="10" stroke="#34d399" strokeWidth="0.8" />
            <line x1="-10" y1="0" x2="10" y2="0" stroke="#34d399" strokeWidth="0.8" />
            <text x="-2" y="-12" className="fill-emerald-400 text-[6px] font-black font-mono">N</text>
          </g>

          {/* D3 Render national highway routes if Zimbabwe macro view is selected */}
          {viewMode === 'ZW' && (
            <g className="opacity-40">
              {/* Main Highway Bulawayo <=> Gweru <=> Harare line pathway */}
              <path
                d={`M ${highwayPoints.map(p => `${xScale(p.lng)},${yScale(p.lat)}`).join(' L ')}`}
                fill="none"
                stroke="#10B981"
                strokeWidth="1.2"
                strokeDasharray="4,4"
              />
              {highwayPoints.map((p, i) => (
                <circle
                  key={`highway-${i}`}
                  cx={xScale(p.lng)}
                  cy={yScale(p.lat)}
                  r="2"
                  fill="#ffffff"
                  opacity={i > 0 && i < 4 ? 0.6 : 0}
                />
              ))}
              <text x={xScale(29.8167) - 15} y={yScale(-19.4500) + 12} className="fill-white/40 text-[7px] font-mono">
                A5 Highway
              </text>
            </g>
          )}

          {/* Dynamic Distance Radius Proximity Pulselink Area Circle around Selected Suburb */}
          {activeNodeCoords && (
            <g>
              {/* Base Proximity Ring */}
              <circle
                cx={activeNodeCoords.x}
                cy={activeNodeCoords.y}
                r={proximityRadiusPx}
                fill="none"
                stroke="#10b981"
                strokeWidth="1.2"
                strokeDasharray="4 2"
                className="opacity-40 transition-all duration-300"
              />
              
              {/* Outer pulsing animated ring representing range ripple */}
              <circle
                cx={activeNodeCoords.x}
                cy={activeNodeCoords.y}
                r={proximityRadiusPx}
                fill="rgba(16, 185, 129, 0.03)"
                stroke="#10b981"
                strokeWidth="0.5"
                className="opacity-25 transition-all duration-300 animate-ping"
                style={{ transformOrigin: `${activeNodeCoords.x}px ${activeNodeCoords.y}px`, animationDuration: '3.5s' }}
              />

              {/* Radial crosshairs */}
              <line x1={activeNodeCoords.x - 4} y1={activeNodeCoords.y} x2={activeNodeCoords.x + 4} y2={activeNodeCoords.y} stroke="#10b981" strokeWidth="1" />
              <line x1={activeNodeCoords.x} y1={activeNodeCoords.y - 4} x2={activeNodeCoords.x} y2={activeNodeCoords.y + 4} stroke="#10b981" strokeWidth="1" />
            </g>
          )}

          {/* Render Cluster Suburb Node Circles with high interaction indicators */}
          {visibleSuburbs.map((node) => {
            const x = xScale(node.lng);
            const y = yScale(node.lat);
            const isSelected = userSuburbKey === node.key;
            const isHovered = hoveredNode === node.key;

            return (
              <g
                key={node.key}
                transform={`translate(${x}, ${y})`}
                className="cursor-pointer"
                onClick={() => handleNodeClick(node)}
                onMouseEnter={() => setHoveredNode(node.key)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                {/* Large responsive touch area behind the tiny marker */}
                <circle r="14" fill="transparent" />

                {/* Animated aura ring */}
                <circle
                  r={isSelected ? 6.5 : isHovered ? 5.5 : 3.5}
                  fill={isSelected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)'}
                  stroke={isSelected ? '#10b981' : isHovered ? '#6ee7b7' : 'rgba(255,255,255,0.3)'}
                  strokeWidth={isSelected ? 1.5 : 1}
                  className="transition-all duration-200"
                />

                {/* Center Core dot pin */}
                <circle
                  r={isSelected ? 2.5 : 2}
                  fill={isSelected ? '#34d399' : isHovered ? '#10b981' : '#a1a1aa'}
                  className="transition-all duration-200"
                />

                {/* Micro clean text caption inside layout map */}
                <text
                  y={isSelected ? -10 : -8}
                  textAnchor="middle"
                  className={`text-[8px] font-sans pointer-events-none transition-all duration-200 ${
                    isSelected
                      ? 'fill-emerald-400 font-bold drop-shadow-md'
                      : isHovered
                      ? 'fill-white font-medium'
                      : 'fill-stone-400 opacity-60'
                  }`}
                >
                  {node.label.split(',')[0]}
                </text>
              </g>
            );
          })}

          {/* Interactive Dynamic Map Tooltip Overlay Render */}
          {hoveredNode && (() => {
            const hNode = visibleSuburbs.find(s => s.key === hoveredNode);
            if (!hNode) return null;
            const tx = xScale(hNode.lng);
            const ty = yScale(hNode.lat);
            const labelClean = hNode.label;
            
            return (
              <g transform={`translate(${tx > width - 85 ? tx - 85 : tx < 80 ? tx - 5 : tx - 45}, ${ty + 15})`} className="pointer-events-none">
                <rect
                  width="95"
                  height="26"
                  rx="6"
                  fill="rgba(2, 6, 23, 0.95)"
                  stroke="rgba(16, 185, 129, 0.4)"
                  strokeWidth="1"
                />
                <text x="6" y="11" className="fill-white text-[8px] font-bold">
                  {labelClean.split(',')[0]}
                </text>
                <text x="6" y="20" className="fill-white/50 text-[6.5px] font-mono">
                  Lat: {hNode.lat.toFixed(4)}
                </text>
                {userSuburbKey !== 'all' && userSuburbKey !== hNode.key && (() => {
                  const dist = getJobDistance(hNode.label, userSuburbKey);
                  if (dist !== null) {
                    return (
                      <text x="90" y="20" textAnchor="end" className="fill-emerald-400 text-[7px] font-mono font-black">
                        ~{dist.toFixed(0)}km
                      </text>
                    );
                  }
                  return null;
                })()}
              </g>
            );
          })()}

          {/* Stylized scale reference representation line */}
          <g transform={`translate(15, ${height - 18})`}>
            {/* Draw scale visual bar */}
            <line x1="0" y1="0" x2="40" y2="0" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
            <line x1="0" y1="-3" x2="0" y2="3" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
            <line x1="40" y1="-3" x2="40" y2="3" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
            <text x="46" y="3" className="fill-white/50 text-[7px] font-mono font-bold uppercase">
              {viewMode === 'ZW' ? '135 km' : viewMode === 'Harare' ? '4.0 km' : '1.5 km'}
            </text>
          </g>
        </svg>

        {/* Informative overlay layout details */}
        {userSuburbKey === 'all' && (
          <div className="absolute inset-x-0 bottom-2 text-center pointer-events-none z-20">
            <span className="inline-flex items-center gap-1 bg-indigo-950/90 text-white/90 text-[8.5px] font-black tracking-wide border border-white/10 px-2.5 py-1 rounded-full px-2">
              <Info className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>Click any suburb node dot above to zoom & lock radius search limits!</span>
            </span>
          </div>
        )}

        {/* Dynamic Floating Recenter Icon Button Overlay */}
        {userSuburbKey !== 'all' && needsRecenter && (
          <button
            type="button"
            onClick={() => {
              const sub = SUBURB_COORDINATES[userSuburbKey];
              if (sub) {
                const targetViewMode = sub.city === 'Bulawayo' ? 'Bulawayo' : 'Harare';
                setViewMode(targetViewMode);
                triggerToast(`🎯 Snapped map back to ${sub.city} focus area!`);
              }
            }}
            className="absolute bottom-3 right-3 z-30 flex items-center gap-1.5 bg-emerald-400 hover:bg-emerald-300 text-indigo-950 px-2.5 py-1.5 rounded-lg text-[10px] font-black shadow-md hover:scale-105 active:scale-95 transition cursor-pointer font-sans"
            title="Recenter selection on Map"
          >
            <Locate className="w-3.5 h-3.5 shrink-0" />
            <span>Recenter view</span>
          </button>
        )}
      </div>

      {/* Responsive visual detail when filter context is active */}
      {userSuburbKey !== 'all' && (
        <div className="flex items-center justify-between text-[11px] bg-emerald-400/5 border border-emerald-400/10 p-2.5 rounded-xl text-emerald-300">
          <div className="flex items-center gap-1.5 font-sans font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>Origin: <strong className="text-white">{SUBURB_COORDINATES[userSuburbKey]?.label.split(',')[0]}</strong></span>
          </div>
          <button
            type="button"
            onClick={() => {
              setUserSuburbKey('all');
              triggerToast('🌐 Map filter reset to whole nation.');
            }}
            className="text-[9.5px] font-black text-emerald-400 hover:underline hover:text-white uppercase font-mono cursor-pointer"
          >
            Reset filter
          </button>
        </div>
      )}
    </div>
  );
}
