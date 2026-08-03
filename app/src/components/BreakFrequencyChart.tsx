/**
 * @license
 * SPDX-License-Identifier: GPL-3.0-only
 */

import React from 'react';
import { GPXStop } from '../types';

interface BreakFrequencyChartProps {
  stops: GPXStop[];
}

interface Bin {
  label: string;
  minSec: number;
  maxSec: number;
  count: number;
}

function formatBinDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (sec >= 3600) {
    const h = Math.floor(sec / 3600);
    const rm = Math.floor((sec % 3600) / 60);
    if (rm === 0) return `${h}h`;
    return `${h}h ${rm}m`;
  }
  if (m > 0 && s > 0) return `${m}m ${s}s`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

function computeBins(stops: GPXStop[]): Bin[] {
  const durations = stops.map((s) => s.durationMs / 1000);
  if (durations.length === 0) return [];

  const maxDur = Math.max(...durations);

  if (maxDur <= 120) {
    return [
      { label: '< 30 s', minSec: 0, maxSec: 30, count: 0 },
      { label: '30–60 s', minSec: 30, maxSec: 60, count: 0 },
      { label: '1–2 min', minSec: 60, maxSec: 120, count: 0 },
      { label: '> 2 min', minSec: 120, maxSec: Infinity, count: 0 },
    ];
  }

  if (maxDur <= 600) {
    return [
      { label: '< 1 min', minSec: 0, maxSec: 60, count: 0 },
      { label: '1–3 min', minSec: 60, maxSec: 180, count: 0 },
      { label: '3–5 min', minSec: 180, maxSec: 300, count: 0 },
      { label: '5–10 min', minSec: 300, maxSec: 600, count: 0 },
      { label: '> 10 min', minSec: 600, maxSec: Infinity, count: 0 },
    ];
  }

  if (maxDur <= 3600) {
    return [
      { label: '< 1 min', minSec: 0, maxSec: 60, count: 0 },
      { label: '1–5 min', minSec: 60, maxSec: 300, count: 0 },
      { label: '5–15 min', minSec: 300, maxSec: 900, count: 0 },
      { label: '15–30 min', minSec: 900, maxSec: 1800, count: 0 },
      { label: '30–60 min', minSec: 1800, maxSec: 3600, count: 0 },
      { label: '> 1 h', minSec: 3600, maxSec: Infinity, count: 0 },
    ];
  }

  return [
    { label: '< 1 min', minSec: 0, maxSec: 60, count: 0 },
    { label: '1–5 min', minSec: 60, maxSec: 300, count: 0 },
    { label: '5–15 min', minSec: 300, maxSec: 900, count: 0 },
    { label: '15–30 min', minSec: 900, maxSec: 1800, count: 0 },
    { label: '30–60 min', minSec: 1800, maxSec: 3600, count: 0 },
    { label: '1–2 h', minSec: 3600, maxSec: 7200, count: 0 },
    { label: '> 2 h', minSec: 7200, maxSec: Infinity, count: 0 },
  ];
}

export function BreakFrequencyChart({ stops }: BreakFrequencyChartProps) {
  if (stops.length === 0) return null;

  const bins = computeBins(stops);

  for (const stop of stops) {
    const d = stop.durationMs / 1000;
    for (const bin of bins) {
      if (d >= bin.minSec && d < bin.maxSec) {
        bin.count++;
        break;
      }
      if (bin.maxSec === Infinity && d >= bin.minSec) {
        bin.count++;
        break;
      }
    }
  }

  const maxCount = Math.max(...bins.map((b) => b.count), 1);
  const total = stops.length;

  const binsWithCount = bins.filter((b) => b.count > 0);

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-lg p-3">
      <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-2">Pausendauer-Verteilung</p>
      <div className="space-y-1.5">
        {binsWithCount.map((bin, i) => {
          const pct = (bin.count / maxCount) * 100;
          const labelPct = ((bin.count / total) * 100).toFixed(0);
          return (
            <div key={i} className="flex items-center gap-2 text-[10px]">
              <span className="w-[56px] text-right text-[#6B7280] shrink-0">{bin.label}</span>
              <div className="flex-1 h-3.5 bg-[#F3F4F6] rounded-sm overflow-hidden">
                <div
                  className="h-full bg-[#dc2626] rounded-sm transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-[32px] text-right font-mono text-[#374151] shrink-0">{bin.count}</span>
              <span className="w-[28px] text-right text-[#9CA3AF] shrink-0">{labelPct}%</span>
            </div>
          );
        })}
        <div className="text-[9px] text-[#9CA3AF] pt-1 text-right">
          n = {total}
        </div>
      </div>
    </div>
  );
}
