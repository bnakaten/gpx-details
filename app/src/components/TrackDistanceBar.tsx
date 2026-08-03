/**
 * @license
 * SPDX-License-Identifier: GPL-3.0-only
 */

import React, { useState, useRef, useEffect } from 'react';
import { GPXPoint, GPXStop } from '../types';

interface TrackDistanceBarProps {
  points: GPXPoint[];
  stops: GPXStop[];
  totalDistanceMeters: number;
}

const BAR_HEIGHT = 8;
const MARKER_HEIGHT = 18;
const TICK_HEIGHT = 6;
const SVG_PADDING = 20;
const SVG_HEIGHT = 52;

function computeTicks(totalKm: number): number[] {
  let step: number;
  if (totalKm <= 1) step = 0.1;
  else if (totalKm <= 5) step = 1;
  else if (totalKm <= 20) step = 2;
  else if (totalKm <= 50) step = 5;
  else if (totalKm <= 100) step = 10;
  else if (totalKm <= 200) step = 20;
  else if (totalKm <= 500) step = 50;
  else if (totalKm <= 1000) step = 100;
  else if (totalKm <= 3000) step = 200;
  else step = 500;

  const ticks: number[] = [];
  const startKm = Math.floor(0 / step) * step;
  for (let km = startKm; km <= totalKm + step * 0.01; km += step) {
    ticks.push(km);
  }
  return ticks;
}

export function TrackDistanceBar({ points, stops, totalDistanceMeters }: TrackDistanceBarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgWidth, setSvgWidth] = useState(0);
  const [hoveredStop, setHoveredStop] = useState<GPXStop | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      setSvgWidth(w);
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const totalKm = totalDistanceMeters / 1000;

  if (!totalKm || !stops.length || svgWidth === 0) return null;

  const plotW = svgWidth - SVG_PADDING * 2;
  const ticks = computeTicks(totalKm);

  const maxDurationMs = Math.max(...stops.map((s) => s.durationMs), 60000);
  const maxBreakWidthPx = Math.min(60, plotW * 0.15);

  const distToX = (distM: number) => SVG_PADDING + (distM / totalDistanceMeters) * plotW;

  const getBreakCenter = (stop: GPXStop) => {
    const startDist = points[stop.startIndex]?.cumulativeDistance ?? 0;
    const endDist = points[stop.endIndex]?.cumulativeDistance ?? 0;
    return distToX((startDist + endDist) / 2);
  };

  const getBreakWidth = (stop: GPXStop) => {
    const w = (stop.durationMs / maxDurationMs) * maxBreakWidthPx;
    return Math.max(3, w);
  };

  const handleMouseEnter = (stop: GPXStop, e: React.MouseEvent) => {
    setHoveredStop(stop);
    setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseLeave = () => {
    setHoveredStop(null);
  };

  const barY = 8;

  return (
    <div ref={containerRef} className="w-full select-none">
      {hoveredStop && (() => {
        const startDist = points[hoveredStop.startIndex]?.cumulativeDistance ?? 0;
        return (
          <div
            className="fixed z-[9999] bg-gray-900 text-white text-[10px] leading-relaxed rounded-md px-2.5 py-1.5 shadow-lg pointer-events-none whitespace-nowrap"
            style={{
              left: tooltipPos.x + 12,
              top: tooltipPos.y - 10,
            }}
          >
            <div className="text-[11px] font-bold mb-0.5">
              km {(startDist / 1000).toFixed(1)}
            </div>
            <div className="text-gray-300">
              <span className="text-gray-400">Start:</span>{' '}
              {new Date(hoveredStop.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-gray-300">
              <span className="text-gray-400">Ende:</span>{' '}
              {new Date(hoveredStop.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-gray-300">
              <span className="text-gray-400">Dauer:</span>{' '}
              {hoveredStop.durationFormatted}
            </div>
          </div>
        );
      })()}

      <svg width={svgWidth} height={SVG_HEIGHT} className="block">
        {/* Track bar background */}
        <rect
          x={SVG_PADDING}
          y={barY}
          width={plotW}
          height={BAR_HEIGHT}
          fill="#e5e7eb"
          rx={BAR_HEIGHT / 2}
        />

        {/* Break markers */}
        {stops.map((stop) => {
          const cx = getBreakCenter(stop);
          const bw = getBreakWidth(stop);
          const by = barY - (MARKER_HEIGHT - BAR_HEIGHT) / 2;
          return (
            <rect
              key={stop.id}
              x={cx - bw / 2}
              y={by}
              width={bw}
              height={MARKER_HEIGHT}
              fill="#dc2626"
              rx={3}
              style={{ cursor: 'pointer' }}
              onMouseEnter={(e) => handleMouseEnter(stop, e)}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            />
          );
        })}

        {/* Tick marks */}
        {ticks.map((km, i) => {
          const x = distToX(km * 1000);
          const tickY = barY + BAR_HEIGHT;
          return (
            <g key={i}>
              <line
                x1={x}
                y1={tickY}
                x2={x}
                y2={tickY + TICK_HEIGHT}
                stroke="#9ca3af"
                strokeWidth={1}
              />
              <text
                x={x}
                y={tickY + TICK_HEIGHT + 10}
                textAnchor="middle"
                fontSize={9}
                fill="#6b7280"
                fontFamily="system-ui, sans-serif"
              >
                {km}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
