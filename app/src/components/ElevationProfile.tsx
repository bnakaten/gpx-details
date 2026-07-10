import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GPXPoint } from '../types';
import { TrendingUp, ChevronDown, ChevronRight, RotateCcw } from 'lucide-react';

interface ElevationProfileProps {
  points: GPXPoint[];
  totalDistanceMeters: number;
  onZoomChange?: (range: { minDist: number; maxDist: number } | null) => void;
  onHoverChange?: (point: GPXPoint | null) => void;
  highlightPoint?: GPXPoint | null;
}

interface HoverState {
  svgX: number;
  svgY: number;
  distM: number;
  ele: number;
}

interface DragState {
  startSvgX: number;
  currentSvgX: number;
}

interface ZoomRange {
  minDist: number;
  maxDist: number;
}

const pad = { top: 20, right: 20, bottom: 28, left: 40 };
const W = 800;
const H = 200;
const plotW = W - pad.left - pad.right;
const plotH = H - pad.top - pad.bottom;

function computeXTicks(minDist: number, maxDist: number): { label: string; distM: number }[] {
  const range = maxDist - minDist;
  const totalKm = range / 1000;
  let step: number;
  if (totalKm <= 0.5) step = 0.05;
  else if (totalKm <= 1) step = 0.1;
  else if (totalKm <= 5) step = 1;
  else if (totalKm <= 20) step = 2;
  else if (totalKm <= 50) step = 5;
  else if (totalKm <= 100) step = 10;
  else if (totalKm <= 200) step = 20;
  else if (totalKm <= 500) step = 50;
  else if (totalKm <= 1000) step = 100;
  else if (totalKm <= 3000) step = 200;
  else step = 500;

  const ticks: { label: string; distM: number }[] = [];
  const startKm = Math.floor(minDist / 1000 / step) * step;
  for (let km = startKm; km <= (maxDist / 1000) + step * 0.01; km += step) {
    ticks.push({ label: String(+km.toFixed(2)), distM: km * 1000 });
  }
  return ticks;
}

function svgXToDist(svgX: number, totalDistM: number, zoom?: ZoomRange): number {
  const min = zoom?.minDist ?? 0;
  const max = zoom?.maxDist ?? totalDistM;
  const frac = (svgX - pad.left) / plotW;
  return Math.max(0, Math.min(totalDistM, min + frac * (max - min)));
}

function distToSvgX(dist: number, totalDistM: number, zoom?: ZoomRange): number {
  const min = zoom?.minDist ?? 0;
  const max = zoom?.maxDist ?? totalDistM;
  const range = max - min || 1;
  return pad.left + ((dist - min) / range) * plotW;
}

function eleToSvgY(ele: number, minEle: number, eleRange: number): number {
  return pad.top + (1 - (ele - minEle) / (eleRange || 1)) * plotH;
}

export const ElevationProfile: React.FC<ElevationProfileProps> = ({ points, totalDistanceMeters, onZoomChange, onHoverChange, highlightPoint }) => {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState<HoverState | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [zoom, setZoom] = useState<ZoomRange | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const onHoverChangeRef = useRef(onHoverChange);
  useEffect(() => { onHoverChangeRef.current = onHoverChange; });

  useEffect(() => {
    onZoomChange?.(zoom);
  }, [zoom, onZoomChange]);

  useEffect(() => {
    if (points.length > 0) setOpen(true);
  }, [points]);  const withElevation = points.filter(p => p.ele !== undefined && p.ele !== null);
  if (withElevation.length < 2 || totalDistanceMeters <= 0) return null;

  const visible = zoom
    ? withElevation.filter(p => {
        const d = p.cumulativeDistance ?? 0;
        return d >= zoom.minDist && d <= zoom.maxDist;
      })
    : withElevation;
  if (visible.length < 2) return null;

  let minEle = Infinity;
  let maxEle = -Infinity;
  for (let i = 0; i < visible.length; i++) {
    const e = visible[i].ele!;
    if (e < minEle) minEle = e;
    if (e > maxEle) maxEle = e;
  }
  const eleRange = maxEle - minEle || 1;

  const linePoints = visible
    .map(p => `${distToSvgX(p.cumulativeDistance!, totalDistanceMeters, zoom ?? undefined)},${eleToSvgY(p.ele!, minEle, eleRange)}`)
    .join(' ');
  const zoomMax = zoom?.maxDist ?? totalDistanceMeters;
  const areaPoints = `M${pad.left},${pad.top + plotH} ${linePoints} L${distToSvgX(zoomMax, totalDistanceMeters, zoom ?? undefined)},${pad.top + plotH}Z`;

  const yTickCount = 5;
  const yTicks = Array.from({ length: yTickCount }, (_, i) => {
    const val = minEle + (eleRange * i) / (yTickCount - 1);
    return { label: String(Math.round(val)), y: eleToSvgY(val, minEle, eleRange) };
  });

  const xTicks = computeXTicks(zoom?.minDist ?? 0, zoom?.maxDist ?? totalDistanceMeters);

  const firstVisible = visible[0];
  const lastVisible = visible[visible.length - 1];
  const visibleDist = (lastVisible.cumulativeDistance ?? 0) - (firstVisible.cumulativeDistance ?? 0);
  const visibleTimeMs = lastVisible.timestampMs - firstVisible.timestampMs;
  const avgSpeedKmh = visibleTimeMs > 0 ? (visibleDist / 1000) / (visibleTimeMs / 3600000) : 0;

  const findNearest = (dist: number) => {
    let nearest = withElevation[0];
    let best = Infinity;
    for (const p of withElevation) {
      const d = Math.abs(p.cumulativeDistance! - dist);
      if (d < best) { best = d; nearest = p; }
    }
    return nearest;
  };

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    const svgY = ((e.clientY - rect.top) / rect.height) * H;

    if (drag) {
      setDrag({ startSvgX: drag.startSvgX, currentSvgX: svgX });
      return;
    }

    if (svgX < pad.left || svgX > pad.left + plotW) {
      setHover(null);
      onHoverChangeRef.current?.(null);
      return;
    }

    const dist = Math.max(0, Math.min(totalDistanceMeters, svgXToDist(svgX, totalDistanceMeters, zoom ?? undefined)));
    const nearest = findNearest(dist);

    setHover({
      svgX: distToSvgX(nearest.cumulativeDistance!, totalDistanceMeters, zoom ?? undefined),
      svgY: eleToSvgY(nearest.ele!, minEle, eleRange),
      distM: nearest.cumulativeDistance!,
      ele: nearest.ele!,
    });
    onHoverChangeRef.current?.(nearest);
  }, [drag, zoom, totalDistanceMeters, withElevation, minEle, eleRange]);

  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    if (svgX < pad.left || svgX > pad.left + plotW) return;
    setDrag({ startSvgX: svgX, currentSvgX: svgX });
  }, []);

  const handleMouseUp = useCallback(() => {
    if (!drag) return;
    const x1 = Math.min(drag.startSvgX, drag.currentSvgX);
    const x2 = Math.max(drag.startSvgX, drag.currentSvgX);

    if (Math.abs(x2 - x1) < 5) {
      setDrag(null);
      return;
    }

    const d1 = svgXToDist(x1, totalDistanceMeters, zoom ?? undefined);
    const d2 = svgXToDist(x2, totalDistanceMeters, zoom ?? undefined);
    const minD = Math.max(0, d1);
    const maxD = Math.min(totalDistanceMeters, d2);

    if (maxD - minD < 50) {
      setDrag(null);
      return;
    }

    setZoom({ minDist: minD, maxDist: maxD });
    setDrag(null);
    setHover(null);
    onHoverChangeRef.current?.(null);
  }, [drag, zoom, totalDistanceMeters]);

  const handleMouseLeave = useCallback(() => {
    setHover(null);
    setDrag(null);
    onHoverChangeRef.current?.(null);
  }, []);

  const resetZoom = useCallback(() => {
    setZoom(null);
    setHover(null);
    onHoverChangeRef.current?.(null);
  }, []);

  const handleDoubleClick = useCallback(() => {
    resetZoom();
  }, [resetZoom]);

  const tooltipLabel = hover
    ? `${(hover.distM / 1000).toFixed(2)} km · ${Math.round(hover.ele)} m`
    : '';

  const tooltipTextWidth = tooltipLabel.length * 5.5 + 12;
  const tooltipBoxX = Math.min(Math.max(pad.left + 4, hover?.svgX ?? 0 - tooltipTextWidth / 2), pad.left + plotW - tooltipTextWidth - 4);

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center gap-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <TrendingUp size={14} className="text-[#2563EB]" />
        Elevation Profile
        <span className="text-[10px] text-[#6B7280] font-normal ml-auto">
          {minEle.toFixed(0)} – {maxEle.toFixed(0)} m &middot; {(totalDistanceMeters / 1000).toFixed(1)} km
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-[#6B7280]">Drag to zoom &middot; Double-click to reset</span>
            {zoom && (
              <button
                onClick={resetZoom}
                className="inline-flex items-center gap-1 text-[10px] text-[#2563EB] hover:text-blue-700 font-medium cursor-pointer"
              >
                <RotateCcw size={10} />
                Reset
              </button>
            )}
          </div>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-auto cursor-crosshair"
            preserveAspectRatio="xMidYMid meet"
            onMouseMove={handleMouseMove}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onDoubleClick={handleDoubleClick}
          >
            <defs>
              <linearGradient id="elevGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563EB" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#2563EB" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {yTicks.map((t, i) => (
              <g key={`y-${i}`}>
                <line x1={pad.left} y1={t.y} x2={pad.left + plotW} y2={t.y} stroke="#E5E7EB" strokeWidth="0.5" />
                <text x={pad.left - 6} y={t.y + 3} textAnchor="end" fontSize="9" fill="#9CA3AF">{t.label}</text>
              </g>
            ))}

            <text x={4} y={pad.top + plotH / 2} textAnchor="middle" fontSize="8" fill="#9CA3AF" transform={`rotate(-90, 4, ${pad.top + plotH / 2})`}>m</text>

            {xTicks.map((t, i) => (
              <g key={`x-${i}`}>
                <line x1={distToSvgX(t.distM, totalDistanceMeters, zoom ?? undefined)} y1={pad.top} x2={distToSvgX(t.distM, totalDistanceMeters, zoom ?? undefined)} y2={pad.top + plotH} stroke="#E5E7EB" strokeWidth="0.5" />
                <text x={distToSvgX(t.distM, totalDistanceMeters, zoom ?? undefined)} y={pad.top + plotH + 12} textAnchor="middle" fontSize="9" fill="#9CA3AF">{t.label}</text>
              </g>
            ))}

            <text x={pad.left + plotW / 2} y={pad.top + plotH + 24} textAnchor="middle" fontSize="8" fill="#9CA3AF">km</text>

            <path d={areaPoints} fill="url(#elevGradient)" />
            <polyline
              points={linePoints}
              fill="none"
              stroke="#2563EB"
              strokeWidth="1.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {drag && (
              <rect
                x={Math.min(drag.startSvgX, drag.currentSvgX)}
                y={pad.top}
                width={Math.abs(drag.currentSvgX - drag.startSvgX)}
                height={plotH}
                fill="rgba(37, 99, 235, 0.1)"
                stroke="#2563EB"
                strokeWidth="0.5"
                strokeDasharray="3 2"
              />
            )}

            {highlightPoint && highlightPoint.cumulativeDistance !== undefined && highlightPoint.ele !== undefined && (() => {
              const minD = zoom?.minDist ?? 0;
              const maxD = zoom?.maxDist ?? totalDistanceMeters;
              if (highlightPoint.cumulativeDistance < minD || highlightPoint.cumulativeDistance > maxD) return null;
              const hlSvgX = distToSvgX(highlightPoint.cumulativeDistance, totalDistanceMeters, zoom ?? undefined);
              const hlSvgY = eleToSvgY(highlightPoint.ele, minEle, eleRange);
              return (
                <>
                  <line x1={hlSvgX} y1={pad.top} x2={hlSvgX} y2={pad.top + plotH} stroke="#F59E0B" strokeWidth="1" strokeDasharray="4 3" />
                  <circle cx={hlSvgX} cy={hlSvgY} r="3" fill="#F59E0B" stroke="white" strokeWidth="1.5" />
                </>
              );
            })()}

            {hover && !drag && (
              <>
                <line
                  x1={hover.svgX} y1={pad.top}
                  x2={hover.svgX} y2={pad.top + plotH}
                  stroke="#94A3B8" strokeWidth="0.5" strokeDasharray="3 2"
                />
                <circle cx={hover.svgX} cy={hover.svgY} r="3" fill="#2563EB" stroke="white" strokeWidth="1.5" />
                <rect
                  x={tooltipBoxX}
                  y={pad.top - 18}
                  width={tooltipTextWidth}
                  height="14"
                  rx="3"
                  fill="rgba(17, 24, 39, 0.85)"
                />
                <text
                  x={tooltipBoxX + tooltipTextWidth / 2}
                  y={pad.top - 8}
                  textAnchor="middle"
                  fontSize="9"
                  fill="white"
                  fontFamily="monospace"
                >
                  {tooltipLabel}
                </text>
              </>
            )}
          </svg>

          <div className="flex gap-3 mt-2 text-[10px] text-slate-500">
            <span>Min: <strong className="text-slate-700">{minEle.toFixed(0)} m</strong></span>
            <span>Max: <strong className="text-slate-700">{maxEle.toFixed(0)} m</strong></span>
            <span>Δ: <strong className="text-slate-700">{(maxEle - minEle).toFixed(0)} m</strong></span>
            {zoom && (
              <span>∅: <strong className="text-slate-700">{avgSpeedKmh.toFixed(1)} km/h</strong></span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
