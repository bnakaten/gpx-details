/**
 * @license
 * SPDX-License-Identifier: GPL-3.0-only
 */

import React, { useState } from 'react';
import { AnalysisSummary } from '../types';
import { DailyBreakdown } from './DailyBreakdown';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CompareResultsProps {
  results: { filename: string; summary: AnalysisSummary }[];
}

const FILE_COLORS = ['#2563EB', '#059669', '#D97706', '#7C3AED', '#E11D48'];

function formatDurationMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatDurationHMS(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h}h ${m}m ${s}s`;
}

function formatKm(meters: number): string {
  return `${(meters / 1000).toFixed(1)} km`;
}

function avgSpeedKmh(distanceMeters: number, durationMs: number): number {
  if (durationMs <= 0) return 0;
  return (distanceMeters / 1000) / (durationMs / 3600000);
}

interface MetricDef {
  key: string;
  label: string;
  higherBetter: boolean | null;
  render: (s: AnalysisSummary) => number | string;
}

const METRICS: MetricDef[] = [
  {
    key: 'distance',
    label: 'Distance',
    higherBetter: true,
    render: (s) => s.totalDistanceMeters,
  },
  {
    key: 'elevation',
    label: 'Elevation gain',
    higherBetter: true,
    render: (s) => s.totalElevationGainM,
  },
  {
    key: 'duration',
    label: 'Duration',
    higherBetter: null,
    render: (s) => s.totalTrackDurationMs,
  },
  {
    key: 'movingTime',
    label: 'Moving time',
    higherBetter: null,
    render: (s) => s.totalTrackDurationMs - s.totalStopDurationMs,
  },
  {
    key: 'stopTime',
    label: 'Stop time',
    higherBetter: null,
    render: (s) => s.totalStopDurationMs,
  },
  {
    key: 'avgSpeed',
    label: 'Avg speed',
    higherBetter: true,
    render: (s) => {
      const movingMs = s.totalTrackDurationMs - s.totalStopDurationMs;
      return avgSpeedKmh(s.totalDistanceMeters, movingMs);
    },
  },
  {
    key: 'stopRatio',
    label: 'Stop ratio',
    higherBetter: false,
    render: (s) => s.stopRatioPercent,
  },
  {
    key: 'stops',
    label: 'Stops',
    higherBetter: false,
    render: (s) => s.stopCount,
  },
  {
    key: 'points',
    label: 'Points (filtered/total)',
    higherBetter: null,
    render: (s) => `${s.filteredPointsCount} / ${s.totalPoints}`,
  },
];

function formatMetricValue(metric: MetricDef, value: number | string): string {
  switch (metric.key) {
    case 'distance':
      return `${(Number(value) / 1000).toFixed(1)} km`;
    case 'elevation':
      return `${Math.round(Number(value))} m`;
    case 'duration':
      return formatDurationMs(Number(value));
    case 'movingTime':
    case 'stopTime':
      return formatDurationHMS(Number(value));
    case 'avgSpeed':
      return `${Number(value).toFixed(1)} km/h`;
    case 'stopRatio':
      return `${Number(value).toFixed(1)}%`;
    case 'stops':
      return String(Math.round(Number(value)));
    default:
      return String(value);
  }
}

function formatChartValue(metric: MetricDef, value: number | string): number {
  if (typeof value !== 'number') return 0;
  return value;
}

export function CompareResults({ results }: CompareResultsProps) {
  const getColor = (i: number) => FILE_COLORS[i % FILE_COLORS.length];
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set());

  const anyMultiDay = results.some((r) => r.summary.dailyBreakdown.length > 1);

  const toggleExpand = (idx: number) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const getMetricRange = (metric: MetricDef): { min: number; max: number } => {
    const vals = results
      .map((r) => formatChartValue(metric, metric.render(r.summary)))
      .filter((v) => typeof v === 'number') as number[];
    return {
      min: Math.min(...vals),
      max: Math.max(...vals),
    };
  };

  const getBestIdx = (metric: MetricDef): number | null => {
    if (metric.higherBetter === null) return null;
    const vals = results.map((r) => formatChartValue(metric, metric.render(r.summary)));
    let best = -1;
    let bestVal = metric.higherBetter ? -Infinity : Infinity;
    for (let i = 0; i < vals.length; i++) {
      const v = vals[i] as number;
      if (metric.higherBetter ? v > bestVal : v < bestVal) {
        bestVal = v;
        best = i;
      }
    }
    return best;
  };

  const getWorstIdx = (metric: MetricDef): number | null => {
    if (metric.higherBetter === null) return null;
    const vals = results.map((r) => formatChartValue(metric, metric.render(r.summary)));
    let worst = -1;
    let worstVal = metric.higherBetter ? Infinity : -Infinity;
    for (let i = 0; i < vals.length; i++) {
      const v = vals[i] as number;
      if (metric.higherBetter ? v < worstVal : v > worstVal) {
        worstVal = v;
        worst = i;
      }
    }
    return worst;
  };

  return (
    <div className="space-y-6">
      {anyMultiDay && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E5E7EB]">
                <th className="text-left py-2 px-3 font-bold text-[#111827] bg-[#F9FAFB] sticky left-0 z-10 min-w-[140px]">
                  Daily Averages
                </th>
                {results.map((r, i) => (
                  <th
                    key={r.filename}
                    className="text-center py-2 px-3 font-bold text-white min-w-[100px]"
                    style={{ backgroundColor: getColor(i) }}
                  >
                    {r.filename}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB]">
                <td className="py-2 px-3 font-medium text-[#6B7280] bg-[#F9FAFB] sticky left-0">
                  Days
                </td>
                {results.map((r, i) => (
                  <td key={i} className="py-2 px-3 text-center font-mono text-[#111827]">
                    {r.summary.dailyBreakdown.length}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB]">
                <td className="py-2 px-3 font-medium text-[#6B7280] bg-[#F9FAFB] sticky left-0">
                  &empty; km/day
                </td>
                {results.map((r, i) => {
                  const days = r.summary.dailyBreakdown;
                  const avg = days.length > 0 ? days.reduce((s, d) => s + d.distanceKm, 0) / days.length : 0;
                  return (
                    <td key={i} className="py-2 px-3 text-center font-mono text-[#111827]">
                      {avg.toFixed(1)} km
                    </td>
                  );
                })}
              </tr>
              <tr className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB]">
                <td className="py-2 px-3 font-medium text-[#6B7280] bg-[#F9FAFB] sticky left-0">
                  &empty; m&#x202f;/&thinsp;day
                </td>
                {results.map((r, i) => {
                  const days = r.summary.dailyBreakdown;
                  const avg = days.length > 0 ? days.reduce((s, d) => s + (d.elevationGainM || 0), 0) / days.length : 0;
                  return (
                    <td key={i} className="py-2 px-3 text-center font-mono text-amber-700">
                      {Number.isFinite(avg) ? `${Math.round(avg)} m` : '---'}
                    </td>
                  );
                })}
              </tr>
              <tr className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB]">
                <td className="py-2 px-3 font-medium text-[#6B7280] bg-[#F9FAFB] sticky left-0">
                  &empty; moving/day
                </td>
                {results.map((r, i) => {
                  const days = r.summary.dailyBreakdown;
                  const avg = days.length > 0 ? days.reduce((s, d) => s + d.movingTimeMs, 0) / days.length : 0;
                  return (
                    <td key={i} className="py-2 px-3 text-center font-mono text-emerald-700">
                      {formatDurationMs(avg)}
                    </td>
                  );
                })}
              </tr>
              <tr className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB]">
                <td className="py-2 px-3 font-medium text-[#6B7280] bg-[#F9FAFB] sticky left-0">
                  &empty; paused/day
                </td>
                {results.map((r, i) => {
                  const days = r.summary.dailyBreakdown;
                  const avg = days.length > 0 ? days.reduce((s, d) => s + d.stopTimeMs, 0) / days.length : 0;
                  return (
                    <td key={i} className="py-2 px-3 text-center font-mono text-indigo-600">
                      {formatDurationMs(avg)}
                    </td>
                  );
                })}
              </tr>
              <tr className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB]">
                <td className="py-2 px-3 font-medium text-[#6B7280] bg-[#F9FAFB] sticky left-0">
                  &empty; speed
                </td>
                {results.map((r, i) => {
                  const days = r.summary.dailyBreakdown;
                  const avg = days.length > 0 ? days.reduce((s, d) => s + d.avgSpeedKmh, 0) / days.length : 0;
                  return (
                    <td key={i} className="py-2 px-3 text-center font-mono text-[#111827]">
                      {avg.toFixed(1)} km/h
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#E5E7EB]">
              <th className="text-left py-2 px-3 font-bold text-[#111827] bg-[#F9FAFB] sticky left-0 z-10 min-w-[140px]">
                Metric
              </th>
              {results.map((r, i) => (
                <th
                  key={r.filename}
                  className="text-center py-2 px-3 font-bold text-white min-w-[100px]"
                  style={{ backgroundColor: getColor(i) }}
                >
                  {r.filename}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {METRICS.map((metric) => {
              const bestIdx = getBestIdx(metric);
              const worstIdx = getWorstIdx(metric);
              return (
                <tr key={metric.key} className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB]">
                  <td className="py-2 px-3 font-medium text-[#6B7280] bg-[#F9FAFB] sticky left-0">
                    {metric.label}
                  </td>
                  {results.map((r, i) => {
                    const val = metric.render(r.summary);
                    const isBest = i === bestIdx;
                    const isWorst = i === worstIdx;
                    let cellClass = 'text-[#111827]';
                    if (isBest) cellClass = 'text-emerald-700 font-bold';
                    else if (isWorst) cellClass = 'text-rose-600 font-bold';
                    return (
                      <td key={i} className={`py-2 px-3 text-center ${cellClass}`}>
                        {formatMetricValue(metric, val)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {METRICS.filter((m) => m.key !== 'points').map((metric) => {
          const vals = results.map((r) =>
            formatChartValue(metric, metric.render(r.summary))
          ) as number[];
          const maxVal = Math.max(...vals, 1);

          return (
            <div
              key={metric.key}
              className="bg-white border border-[#E5E7EB] rounded-md p-3"
            >
              <h4 className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-2">
                {metric.label}
              </h4>
              <div className="space-y-1.5">
                {results.map((r, i) => {
                  const val = vals[i];
                  const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <span
                        className="text-[10px] font-semibold w-8 text-right shrink-0"
                        style={{ color: getColor(i) }}
                      >
                        {formatMetricValue(metric, val)}
                      </span>
                      <div className="flex-1 h-4 bg-[#F3F4F6] rounded-sm overflow-hidden">
                        <div
                          className="h-full rounded-sm transition-[width] duration-500"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: getColor(i),
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {anyMultiDay && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">
              Per-Day Details
            </h3>
            <span className="w-6 h-px bg-[#E5E7EB] flex-1" />
          </div>
          {results.map((r, i) => (
            <div key={r.filename} className="bg-white border border-[#E5E7EB] rounded-md overflow-hidden">
              <button
                type="button"
                onClick={() => toggleExpand(i)}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#F9FAFB] transition-colors"
                style={{ borderLeft: `3px solid ${getColor(i)}` }}
              >
                <span className="text-xs font-semibold text-[#111827]">{r.filename}</span>
                <span className="text-[#6B7280]">
                  {expandedDays.has(i) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </span>
              </button>
              {expandedDays.has(i) && (
                <div className="px-4 pb-3">
                  <DailyBreakdown days={r.summary.dailyBreakdown} compact />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
