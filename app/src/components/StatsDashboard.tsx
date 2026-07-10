/**
 * @license
 * SPDX-License-Identifier: GPL-3.0-only
 */

import React from 'react';
import { AnalysisSummary, GPXStop } from '../types';
import { Clock, Navigation, Bike, Moon, ShieldAlert } from 'lucide-react';
import { DailyBreakdown } from './DailyBreakdown';

interface StatsDashboardProps {
  summary: AnalysisSummary;
  stops: GPXStop[];
}

export function StatsDashboard({ summary, stops }: StatsDashboardProps) {
  // Convert meters to km
  const distanceKm = (summary.totalDistanceMeters / 1000).toFixed(2);
  
  // Compute movement time and avg speed
  const movementTimeMs = summary.totalTrackDurationMs - summary.totalStopDurationMs;
  const movementTimeSec = movementTimeMs / 1000;
  const avgSpeedKmh = movementTimeSec > 0 ? (summary.totalDistanceMeters / movementTimeSec) * 3.6 : 0;
  const movementSegmentCount = stops.length + 1;
  const movementPercent = summary.totalTrackDurationMs > 0
    ? (movementTimeMs / summary.totalTrackDurationMs) * 100
    : 0;

  const formatMovementDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    const displaySeconds = seconds % 60;
    const displayMinutes = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${displayMinutes}m ${displaySeconds}s`;
    }
    if (minutes > 0) {
      return `${displayMinutes}m ${displaySeconds}s`;
    }
    return `${displaySeconds}s`;
  };
  const formatTrackDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    const displaySeconds = seconds % 60;
    const displayMinutes = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${displayMinutes}m`;
    }
    return `${displayMinutes}m ${displaySeconds}s`;
  };

  return (
    <div className="grid grid-cols-1 gap-4">
      {/* 1. Movement & Standing Time */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 flex items-start gap-3.5">
        <div className="p-2.5 bg-slate-50 rounded text-slate-600 flex-shrink-0">
          <Clock size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <table className="w-full text-xs">
            <tbody>
              <tr>
                <td className="w-5 pb-1.5 align-middle">
                  <Bike size={12} className="text-emerald-600" />
                </td>
                <td className="w-[100px] pb-1.5 align-middle">
                  <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">In Motion</span>
                </td>
                <td className="w-[80px] pb-1.5 align-middle">
                  <span className="text-[10px] text-[#6B7280]">{movementSegmentCount} Segments</span>
                </td>
                <td className="w-[45px] pb-1.5 align-middle">
                  <span className="text-[10px] text-[#6B7280]">{movementPercent.toFixed(0)}%</span>
                </td>
                <td className="relative text-center pb-1.5 align-middle">
                  <span className="text-sm font-bold font-mono text-[#111827]">{formatMovementDuration(movementTimeMs)}</span>
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 text-sm font-bold font-mono text-rose-600">&empty; {avgSpeedKmh.toFixed(1)} km/h</span>
                </td>
              </tr>
              <tr className="border-t border-[#E5E7EB]">
                <td className="w-5 pt-1.5 align-middle">
                  <Moon size={12} className="text-indigo-500" />
                </td>
                <td className="w-[100px] pt-1.5 align-middle">
                  <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Standing</span>
                </td>
                <td className="w-[80px] pt-1.5 align-middle">
                  <span className="text-[10px] text-[#6B7280]">{summary.stopCount} Stops</span>
                </td>
                <td className="w-[45px] pt-1.5 align-middle">
                  <span className="text-[10px] text-[#6B7280]">{summary.stopRatioPercent}%</span>
                </td>
                <td className="text-center pt-1.5 align-middle">
                  <span className="text-sm font-bold font-mono text-[#111827]">{summary.totalStopDurationFormatted}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Route Details (Distance & Duration) */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 flex items-start gap-3.5">
        <div className="p-2.5 bg-slate-50 rounded text-slate-600 flex-shrink-0">
          <Navigation size={18} />
        </div>
        <div className="min-w-0 w-full">
          <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Route Details</p>
          <div className="flex gap-x-4 mt-1.5 text-xs">
            <div>
              <p className="text-[10px] text-[#6B7280]">Distance:</p>
              <p className="font-bold text-slate-800 font-mono mt-0.5 text-sm">{distanceKm} km</p>
            </div>
            <div>
              <p className="text-[10px] text-[#6B7280]">Elevation:</p>
              <p className="font-bold text-slate-800 font-mono mt-0.5 text-sm">{summary.totalElevationGainM} m</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-[10px] text-[#6B7280]">Duration:</p>
              <p className="font-semibold text-slate-800 font-mono mt-0.5" title={formatTrackDuration(summary.totalTrackDurationMs)}>
                {formatTrackDuration(summary.totalTrackDurationMs)}
              </p>
            </div>
          </div>
          {summary.filteredPointsCount > 0 && (
            <div className="mt-2 flex items-center gap-1 text-[9px] font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded w-fit">
              <ShieldAlert size={9} />
              <span>{summary.filteredPointsCount} outliers filtered</span>
            </div>
          )}
        </div>
      </div>

      {/* 3. Daily Breakdown */}
      <DailyBreakdown days={summary.dailyBreakdown} />
    </div>
  );
}
