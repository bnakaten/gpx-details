/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { GPXPoint, GPXStop, TrackSegment, SegmentType } from '../types';
import { MapPin, Clock, ArrowUpDown, Timer, Gauge, Moon, Bike } from 'lucide-react';

interface StopListProps {
  points: GPXPoint[];
  stops: GPXStop[];
  selectedStop: GPXStop | null;
  onStopSelect: (stop: GPXStop | null) => void;
}

type SortField = 'index' | 'startTime' | 'durationMs' | 'maxDistanceDelta' | 'pointCount';
type SortOrder = 'asc' | 'desc';

export function StopList({ points, stops, selectedStop, onStopSelect }: StopListProps) {
  const [sortField, setSortField] = useState<SortField>('startTime');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const segments = useMemo<TrackSegment[]>(() => {
    const list: TrackSegment[] = [];
    const sorted = [...stops].sort((a, b) => a.startIndex - b.startIndex);

    let cursor = 0;

    for (const stop of sorted) {
      if (stop.startIndex > cursor) {
        const seg = buildMovementSegment(points, cursor, stop.startIndex - 1, list.length);
        if (seg) list.push(seg);
      }
      list.push({
        type: 'stop',
        id: stop.id,
        startTime: stop.startTime,
        endTime: stop.endTime,
        durationMs: stop.durationMs,
        durationFormatted: stop.durationFormatted,
        pointCount: stop.pointCount,
        startIndex: stop.startIndex,
        endIndex: stop.endIndex,
        stopData: stop,
      });
      cursor = stop.endIndex + 1;
    }

    if (cursor < points.length - 1) {
      const seg = buildMovementSegment(points, cursor, points.length - 1, list.length);
      if (seg) list.push(seg);
    }

    return list;
  }, [points, stops]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedSegments = useMemo(() => {
    const list = [...segments];
    return list.sort((a, b) => {
      let valA: any;
      let valB: any;

      if (sortField === 'index') {
        valA = segments.indexOf(a);
        valB = segments.indexOf(b);
      } else if (sortField === 'durationMs' || sortField === 'pointCount') {
        valA = a[sortField];
        valB = b[sortField];
      } else if (sortField === 'maxDistanceDelta') {
        valA = a.stopData?.maxDistanceDelta ?? 0;
        valB = b.stopData?.maxDistanceDelta ?? 0;
      } else {
        valA = a.startTime;
        valB = b.startTime;
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
      return 0;
    });
  }, [segments, sortField, sortOrder]);

  const displayTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const displayDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  if (segments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-white border border-[#E5E7EB] rounded-lg">
        <div className="w-9 h-9 rounded bg-[#F9FAFB] flex items-center justify-center text-slate-400 mb-2 border border-[#E5E7EB]">
          <Clock size={16} />
        </div>
        <p className="text-xs font-semibold text-slate-800">Keine Segmente erkannt</p>
        <p className="text-[11px] text-[#6B7280] max-w-xs mt-1 leading-relaxed">
          Passe die Parameter an oder lade eine andere GPX-Spur hoch.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden flex flex-col h-full">
      <div className="px-5 py-3 border-b border-[#E5E7EB] flex items-center justify-between bg-[#F9FAFB]">
        <h3 className="text-xs font-bold text-[#111827] uppercase tracking-wider flex items-center gap-2">
          <MapPin size={14} className="text-[#2563EB]" />
          Segmente & Details ({segments.length})
        </h3>
        <span className="text-[10px] text-[#6B7280]">
          Zeile anklicken zum Fokussieren
        </span>
      </div>

      {/* Responsive Scrollable Container */}
      <div className="overflow-x-auto grow">
        <table className="w-full text-left border-collapse min-w-[500px]">
          <thead>
            <tr className="border-b border-[#E5E7EB] text-[#6B7280] text-[10px] font-bold uppercase tracking-wider bg-[#F9FAFB] select-none">
              <th 
                className="py-3 px-4 cursor-pointer hover:bg-slate-50 hover:text-slate-800 transition"
                onClick={() => handleSort('index')}
              >
                <div className="flex items-center gap-1">
                  Nr. <ArrowUpDown size={10} />
                </div>
              </th>

              <th 
                className="py-3 px-4 cursor-pointer hover:bg-slate-50 hover:text-slate-800 transition"
                onClick={() => handleSort('startTime')}
              >
                <div className="flex items-center gap-1">
                  Startzeit <ArrowUpDown size={10} />
                </div>
              </th>

              <th className="py-3 px-4 text-[#6B7280]">Endzeit</th>

              <th 
                className="py-3 px-4 cursor-pointer hover:bg-slate-50 hover:text-slate-800 transition"
                onClick={() => handleSort('durationMs')}
              >
                <div className="flex items-center gap-1">
                  Dauer <ArrowUpDown size={10} />
                </div>
              </th>

              <th 
                className="py-3 px-4 cursor-pointer hover:bg-slate-50 hover:text-slate-800 transition"
                onClick={() => handleSort('maxDistanceDelta')}
              >
                <div className="flex items-center gap-1">
                  Details <ArrowUpDown size={10} />
                </div>
              </th>

              <th className="py-3 px-4 text-[#6B7280]">
                <div className="flex items-center gap-1">
                  Höhenm.
                </div>
              </th>

              <th 
                className="py-3 px-4 cursor-pointer hover:bg-slate-50 hover:text-slate-800 transition"
                onClick={() => handleSort('pointCount')}
              >
                <div className="flex items-center gap-1">
                  Punkte <ArrowUpDown size={10} />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB] text-xs">
            {sortedSegments.map((seg) => {
              const isStop = seg.type === 'stop';
              const originalIndex = segments.indexOf(seg);
              const isActive = isStop && selectedStop?.id === seg.id;

              return (
                <tr
                  key={seg.id}
                  onClick={() => isStop ? onStopSelect(isActive ? null : seg.stopData!) : undefined}
                  className={`transition-colors duration-150 group ${
                    isStop 
                      ? 'cursor-pointer'
                      : 'cursor-default bg-slate-50/30'
                  } ${
                    isActive 
                      ? 'bg-blue-50/80 hover:bg-blue-50 text-blue-950 font-medium' 
                      : isStop
                        ? 'hover:bg-slate-50/70 text-slate-750'
                        : 'text-slate-700'
                  }`}
                >
                  <td className="py-3.5 px-4 font-mono">
                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold ${
                      isActive 
                        ? 'bg-[#2563EB] text-white' 
                        : isStop
                          ? 'bg-[#F9FAFB] text-[#6B7280] border border-[#E5E7EB]'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}>
                      {originalIndex + 1}
                    </span>
                  </td>
                  
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5">
                      {isStop ? (
                        <Moon size={12} className="text-blue-500 shrink-0" />
                      ) : (
                        <Bike size={12} className="text-emerald-600 shrink-0" />
                      )}
                      <span className="font-semibold text-[#111827]">
                        {displayTime(seg.startTime)}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 ml-[18px]">{displayDate(seg.startTime)}</div>
                  </td>

                  <td className="py-3.5 px-4 text-slate-600">
                    <div className="font-semibold text-slate-800">{displayTime(seg.endTime)}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{displayDate(seg.endTime)}</div>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 font-mono text-[10px] font-semibold rounded ${
                      isActive 
                        ? 'bg-blue-100 text-blue-800' 
                        : isStop
                          ? 'bg-[#F9FAFB] text-slate-700 border border-[#E5E7EB]'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}>
                      <Timer size={11} />
                      {seg.durationFormatted}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-slate-500 font-mono">
                    {isStop ? (
                      <span>&le; {seg.stopData!.maxDistanceDelta} m</span>
                    ) : (
                      <span className="text-emerald-700">
                        {((seg.distanceMeters ?? 0) / 1000).toFixed(2)} km
                        <span className="text-[10px] text-slate-400 block">
                          <Gauge size={10} className="inline mr-0.5" />
                          {(seg.avgSpeedKmh ?? 0).toFixed(1)} km/h
                        </span>
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-slate-500 font-mono">
                    {isStop ? (
                      <span className="text-slate-300">—</span>
                    ) : seg.elevationGainM != null ? (
                      <span className="text-amber-700">{seg.elevationGainM} m</span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-slate-500 font-mono">
                    {seg.pointCount}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatSegmentDuration(durationMs: number): string {
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const displaySeconds = seconds % 60;
  const displayMinutes = minutes % 60;
  if (hours > 0) return `${hours}h ${displayMinutes}m ${displaySeconds}s`;
  if (displayMinutes > 0) return `${displayMinutes}m ${displaySeconds}s`;
  return `${displaySeconds}s`;
}

function buildMovementSegment(
  points: GPXPoint[],
  startIdx: number,
  endIdx: number,
  index: number,
): TrackSegment | null {
  if (startIdx >= endIdx || startIdx >= points.length) return null;
  const first = points[startIdx];
  const last = points[endIdx];
  const durationMs = last.timestampMs - first.timestampMs;
  if (durationMs <= 0) return null;

  let distanceMeters = 0;
  let elevationGain = 0;
  for (let i = startIdx; i < endIdx; i++) {
    const d = points[i].distanceFromPrev ?? 0;
    if (i > startIdx) distanceMeters += d;
    const pe = points[i].ele;
    const ce = points[i + 1]?.ele;
    if (pe !== undefined && ce !== undefined && ce > pe) {
      elevationGain += ce - pe;
    }
  }
  if (points[endIdx].distanceFromPrev && endIdx > startIdx) {
    distanceMeters += points[endIdx].distanceFromPrev;
  }

  const avgSpeedKmh = (distanceMeters / (durationMs / 1000)) * 3.6;

  return {
    type: 'movement',
    id: `movement_${startIdx}_${endIdx}`,
    startTime: first.time,
    endTime: last.time,
    durationMs,
    durationFormatted: formatSegmentDuration(durationMs),
    pointCount: endIdx - startIdx + 1,
    startIndex: startIdx,
    endIndex: endIdx,
    distanceMeters: Math.round(distanceMeters),
    avgSpeedKmh: Math.round(avgSpeedKmh * 10) / 10,
    elevationGainM: Math.round(elevationGain),
  };
}
