/**
 * @license
 * SPDX-License-Identifier: GPL-3.0-only
 */

import React from 'react';
import { DaySummary } from '../types';
import { CalendarDays } from 'lucide-react';

interface DailyBreakdownProps {
  days: DaySummary[];
  compact?: boolean;
}

function formatHM(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function DailyBreakdown({ days, compact }: DailyBreakdownProps) {
  if (days.length < 2) return null;

  const avgKmPerDay = days.reduce((s, d) => s + d.distanceKm, 0) / days.length;
  const avgElevationDay = days.length > 0
    ? days.reduce((s, d) => s + (d.elevationGainM || 0), 0) / days.length
    : 0;
  const avgMovingMs = days.reduce((s, d) => s + d.movingTimeMs, 0) / days.length;
  const avgStopMs = days.reduce((s, d) => s + d.stopTimeMs, 0) / days.length;
  const avgSpeedOverall = days.length > 0
    ? days.reduce((s, d) => s + d.avgSpeedKmh, 0) / days.length
    : 0;

  const inner = (
    <>
      <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-3">
        Daily Breakdown ({days.length} days)
      </p>
      <div className="grid grid-cols-5 gap-2 mb-3">
        <div className="bg-amber-50 border border-amber-100 rounded-lg p-2.5 text-center">
          <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-0.5">&empty; km/day</p>
          <p className="text-sm font-bold text-[#111827]">{avgKmPerDay.toFixed(1)}</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-lg p-2.5 text-center">
          <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-0.5">&empty; m/day</p>
          <p className="text-sm font-bold text-[#111827]">{Number.isFinite(avgElevationDay) ? Math.round(avgElevationDay).toLocaleString() : '—'}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2.5 text-center">
          <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide mb-0.5">&empty; speed</p>
          <p className="text-sm font-bold text-[#111827]">{avgSpeedOverall.toFixed(1)} km/h</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2.5 text-center">
          <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide mb-0.5">&empty; moving</p>
          <p className="text-sm font-bold text-[#111827]">{formatHM(avgMovingMs)}</p>
        </div>
        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-2.5 text-center">
          <p className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wide mb-0.5">&empty; paused</p>
          <p className="text-sm font-bold text-[#111827]">{formatHM(avgStopMs)}</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[#E5E7EB]">
              <th className="text-left py-1.5 pr-3 text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">Day</th>
              <th className="text-right py-1.5 px-2 text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">Distance</th>
              <th className="text-right py-1.5 px-2 text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">Elevation</th>
              <th className="text-right py-1.5 px-2 text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">Moving</th>
              <th className="text-right py-1.5 px-2 text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">Paused</th>
              <th className="text-right py-1.5 px-2 text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">Avg Speed</th>
              <th className="text-right py-1.5 pl-2 text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">Stops</th>
            </tr>
          </thead>
          <tbody>
            {days.map((day, idx) => {
              const isLast = idx === days.length - 1;
              return (
                <tr key={day.date} className={isLast ? '' : 'border-b border-[#F3F4F6]'}>
                  <td className="py-1.5 pr-3 font-mono text-[11px] text-[#111827]">
                    {new Date(day.date + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                  </td>
                  <td className="py-1.5 px-2 text-right font-mono text-[11px] text-[#111827]">
                    {day.distanceKm.toFixed(1)} km
                  </td>
                  <td className="py-1.5 px-2 text-right font-mono text-[11px] text-amber-700">
                    {Number.isFinite(day.elevationGainM) ? `${Math.round(day.elevationGainM)} m` : '---'}
                  </td>
                  <td className="py-1.5 px-2 text-right font-mono text-[11px] text-emerald-700">
                    {formatHM(day.movingTimeMs)}
                  </td>
                  <td className="py-1.5 px-2 text-right font-mono text-[11px] text-indigo-600">
                    {formatHM(day.stopTimeMs)}
                  </td>
                  <td className="py-1.5 px-2 text-right font-mono text-[11px] text-[#111827]">
                    {day.avgSpeedKmh.toFixed(1)}
                  </td>
                  <td className="py-1.5 pl-2 text-right font-mono text-[11px] text-[#6B7280]">
                    {day.stopCount}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );

  if (compact) return <div className="min-w-0 flex-1">{inner}</div>;

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 flex items-start gap-3.5">
      <div className="p-2.5 bg-amber-50 rounded text-amber-600 flex-shrink-0">
        <CalendarDays size={18} />
      </div>
      <div className="min-w-0 flex-1">{inner}</div>
    </div>
  );
}
