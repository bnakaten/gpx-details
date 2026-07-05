/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { XMLParser } from 'fast-xml-parser';
import { GPXPoint, GPXStop, AnalysisSettings, AnalysisResponse, AnalysisSummary } from './types';

// Haversine formula to calculate the distance between two GPS coordinates in meters
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Convert trackpoints into formatted display durations
export function formatDuration(durationMs: number): string {
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  const displaySeconds = seconds % 60;
  const displayMinutes = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${displayMinutes}m ${displaySeconds}s`;
  }
  if (displayMinutes > 0) {
    return `${displayMinutes}m ${displaySeconds}s`;
  }
  return `${displaySeconds}s`;
}

// Robust GPX XML parser with fallback Regex
export function parseGPX(xmlContent: string): GPXPoint[] {
  const points: GPXPoint[] = [];

  try {
    // 1. Try with XMLParser
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });
    const result = parser.parse(xmlContent);

    // Deep search helper for trkpt XML structures
    const extractPointsFromObj = (obj: any) => {
      if (!obj) return;
      
      // If we find trkpt directly
      if (obj.trkpt) {
        const pts = Array.isArray(obj.trkpt) ? obj.trkpt : [obj.trkpt];
        for (const pt of pts) {
          const lat = parseFloat(pt['@_lat']);
          const lon = parseFloat(pt['@_lon']);
          const ele = pt.ele ? parseFloat(pt.ele) : undefined;
          const time = pt.time ? String(pt.time).trim() : '';
          
          if (!isNaN(lat) && !isNaN(lon) && time) {
            points.push({
              lat,
              lon,
              ele,
              time,
              timestampMs: new Date(time).getTime(),
            });
          }
        }
        return;
      }

      // Recurse into objects/arrays
      for (const key of Object.keys(obj)) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          extractPointsFromObj(obj[key]);
        }
      }
    };

    extractPointsFromObj(result);
  } catch (err) {
    console.warn("Fast-XML-Parser failed, falling back to regex parser:", err);
  }

  // 2. Fallback to Regex parser if no points were found or parsing failed
  if (points.length === 0) {
    const trkptRegex = /<(?:[a-zA-Z0-9_-]+:)?trkpt\s+([^>]+)>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?trkpt>/g;
    let match;

    while ((match = trkptRegex.exec(xmlContent)) !== null) {
      const attrs = match[1];
      const body = match[2];

      const latMatch = /lat=["'](-?\d+(?:\.\d+)?)["']/i.exec(attrs);
      const lonMatch = /lon=["'](-?\d+(?:\.\d+)?)["']/i.exec(attrs);

      if (latMatch && lonMatch) {
        const lat = parseFloat(latMatch[1]);
        const lon = parseFloat(lonMatch[1]);

        // Elevation
        const eleMatch = /<(?:[a-zA-Z0-9_-]+:)?ele>([-+]?\d+(?:\.\d+)?)<\/(?:[a-zA-Z0-9_-]+:)?ele>/i.exec(body);
        const ele = eleMatch ? parseFloat(eleMatch[1]) : undefined;

        // Time
        const timeMatch = /<(?:[a-zA-Z0-9_-]+:)?time>([^<]+)<\/(?:[a-zA-Z0-9_-]+:)?time>/i.exec(body);
        const time = timeMatch ? timeMatch[1].trim() : '';

        if (!isNaN(lat) && !isNaN(lon) && time) {
          points.push({
            lat,
            lon,
            ele,
            time,
            timestampMs: new Date(time).getTime(),
          });
        }
      }
    }
  }

  // Sort chronologically
  points.sort((a, b) => a.timestampMs - b.timestampMs);
  return points;
}

function densifyPoints(points: GPXPoint[], intervalM: number): GPXPoint[] {
  if (points.length < 2 || intervalM <= 0) return points;

  const result: GPXPoint[] = [points[0]];

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const dist = calculateDistance(prev.lat, prev.lon, curr.lat, curr.lon);

    if (dist <= intervalM) {
      result.push(curr);
      continue;
    }

    const steps = Math.round(dist / intervalM);
    const duration = curr.timestampMs - prev.timestampMs;
    const eleA = prev.ele ?? 0;
    const eleB = curr.ele ?? 0;

    for (let s = 1; s <= steps; s++) {
      const frac = s / steps;
      result.push({
        lat: prev.lat + frac * (curr.lat - prev.lat),
        lon: prev.lon + frac * (curr.lon - prev.lon),
        ele: eleA + frac * (eleB - eleA),
        time: new Date(Math.round(prev.timestampMs + frac * duration)).toISOString(),
        timestampMs: Math.round(prev.timestampMs + frac * duration),
      });
    }
  }

  return result;
}

async function matchPointsToRoad(points: GPXPoint[], apiKey: string): Promise<GPXPoint[]> {
  const BATCH_SIZE = 100;
  const matched: GPXPoint[] = [];

  for (let batchStart = 0; batchStart < points.length; batchStart += BATCH_SIZE) {
    const batch = points.slice(batchStart, batchStart + BATCH_SIZE);
    if (batch.length < 2) {
      for (const p of batch) matched.push({ ...p });
      continue;
    }

    const path = batch.map(p => `${p.lat},${p.lon}`).join('|');
    const url = `https://roads.googleapis.com/v1/snapToRoads?path=${path}&interpolate=true&key=${apiKey}`;

    try {
      console.log(`[Google Roads] batch ${batchStart}-${Math.min(batchStart + BATCH_SIZE, points.length)}: ${batch.length} points`);
      const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) {
        let body = '';
        try { body = await response.text(); } catch { /* ignore */ }
        console.error(`[Google Roads] HTTP ${response.status}:`, body.slice(0, 300));
        throw new Error(`HTTP ${response.status}: ${body.slice(0, 200)}`);
      }
      const rawData = await response.json();
      if (rawData.error) {
        console.error('[Google Roads] API error:', JSON.stringify(rawData.error));
        throw new Error(`API error: ${rawData.error.message || JSON.stringify(rawData.error)}`);
      }
      const data = rawData as { snappedPoints?: Array<{ location: { latitude: number; longitude: number }; originalIndex: number }> };
      console.log(`[Google Roads] batch ${batchStart}: got ${data.snappedPoints?.length || 0} snapped points`);
      if (!data.snappedPoints || data.snappedPoints.length === 0) throw new Error('No snapped points returned');

      const resultPts: Array<{ lat: number; lon: number; originalIndex: number }> = [];
      let currentOi = -1;
      for (const sp of data.snappedPoints) {
        if (sp.originalIndex != null) currentOi = sp.originalIndex;
        if (currentOi < 0) continue;
        resultPts.push({ lat: sp.location.latitude, lon: sp.location.longitude, originalIndex: currentOi });
      }

      const groups = new Map<number, Array<{ lat: number; lon: number }>>();
      for (const pt of resultPts) {
        const arr = groups.get(pt.originalIndex);
        if (arr) arr.push(pt);
        else groups.set(pt.originalIndex, [pt]);
      }

      const sortedIndices = [...groups.keys()].sort((a, b) => a - b);

      for (let gi = 0; gi < sortedIndices.length; gi++) {
        const oi = sortedIndices[gi];
        const groupPts = groups.get(oi)!;
        const nextOi = gi < sortedIndices.length - 1 ? sortedIndices[gi + 1] : -1;

        const prevOi = gi > 0 ? sortedIndices[gi - 1] : -1;
        for (let rawIdx = prevOi + 1; rawIdx < oi; rawIdx++) {
          if (batch[rawIdx]) matched.push({ ...batch[rawIdx] });
        }

        const startInput = batch[oi];
        if (!startInput) {
          for (const pt of groupPts) {
            matched.push({ ...batch[0], lat: pt.lat, lon: pt.lon });
          }
          continue;
        }

        if (nextOi < 0 || !batch[nextOi]) {
          for (const pt of groupPts) {
            matched.push({ ...startInput, lat: pt.lat, lon: pt.lon });
          }
          continue;
        }

        const endInput = batch[nextOi];
        const duration = endInput.timestampMs - startInput.timestampMs;
        const eleA = startInput.ele ?? 0;
        const eleB = endInput.ele ?? 0;

        for (let pi = 0; pi < groupPts.length; pi++) {
          const frac = groupPts.length <= 1 ? 1 : pi / (groupPts.length - 1);
          const ts = Math.round(startInput.timestampMs + frac * duration);
          matched.push({
            lat: groupPts[pi].lat,
            lon: groupPts[pi].lon,
            ele: eleA + frac * (eleB - eleA),
            time: new Date(ts).toISOString(),
            timestampMs: ts,
          });
        }
      }

      const lastOi = sortedIndices.length > 0 ? sortedIndices[sortedIndices.length - 1] : -1;
      for (let rawIdx = lastOi + 1; rawIdx < batch.length; rawIdx++) {
        matched.push({ ...batch[rawIdx] });
      }
    } catch (err) {
      console.warn(`Google snapToRoad batch ${batchStart}-${batchStart + batch.length} failed:`, err);
      for (const p of batch) matched.push({ ...p });
    }
  }

  return matched;
}

export async function analyzeGPXData(xmlContent: string, settings: AnalysisSettings): Promise<AnalysisResponse> {
  try {
    const parsedPoints = parseGPX(xmlContent);
    if (parsedPoints.length === 0) {
      return {
        success: false,
        error: "Keine gültigen Trackpunkte mit Zeitstempel im GPX-Dokument gefunden.",
        points: [],
        stops: [],
        summary: createEmptySummary(),
      };
    }

    // 0. Apply cutoff timestamp to parsed points
    let displayPoints = parsedPoints;
    if (settings.cutoffTimestampMs !== undefined && settings.cutoffTimestampMs > 0) {
      const minTimestamp = settings.cutoffTimestampMs - 60000;
      const filtered = parsedPoints.filter((p) => p.timestampMs >= minTimestamp);
      if (filtered.length === 0) {
        return {
          success: false,
          error: `Keine Punkte nach dem gewählten Zeitstempel (${new Date(settings.cutoffTimestampMs).toLocaleString('de-DE')}) vorhanden.`,
          points: [],
          stops: [],
          summary: createEmptySummary(),
        };
      }
      displayPoints = filtered;
    }

    // 1. Map matching (optional)
    let matchedPoints: GPXPoint[] | undefined;
    if (settings.enableMapMatching && settings.googleApiKey) {
      const densifyInterval = settings.densifyIntervalM ?? 0;
      const inputForMatching = densifyInterval > 0 ? densifyPoints(displayPoints, densifyInterval) : displayPoints;
      matchedPoints = await matchPointsToRoad(inputForMatching, settings.googleApiKey);
    }

    // Analysis runs on matched (Google) points if available, otherwise original
    const analysisInput = matchedPoints ?? displayPoints;

    // If matching was done, displayPoints are the raw GPX for comparison
    const rawPoints = matchedPoints ? displayPoints : undefined;

    // 2. Filter outliers and calculate step differentials
    let points: GPXPoint[] = [];
    let filteredOutliersCount = 0;
    
    // Max human track speed on highways/trains can be high, but let's filter extreme outliers (e.g. > 180 km/h or 50 m/s)
    const MAX_SPEED_LIMIT_MS = 50; // 180 km/h

    for (let i = 0; i < analysisInput.length; i++) {
      const curr = { ...analysisInput[i] };
      
      if (i > 0) {
        const prev = points[points.length - 1] || analysisInput[i - 1];
        const dist = calculateDistance(prev.lat, prev.lon, curr.lat, curr.lon);
        const timeDiff = (curr.timestampMs - prev.timestampMs) / 1000; // seconds

        curr.distanceFromPrev = dist;
        curr.timeDiffFromPrev = timeDiff;

        if (timeDiff > 0) {
          curr.speedFromPrev = dist / timeDiff; // m/s
        } else {
          curr.speedFromPrev = 0;
        }

        // Check for GPS Jump spikes (unrealistic speeds)
        if (settings.gpsFilterOutliers && curr.speedFromPrev > MAX_SPEED_LIMIT_MS && timeDiff < 60) {
          filteredOutliersCount++;
          // Skip adding this point as it's an outlier. This smooths out tracking errors!
          continue;
        }

        curr.cumulativeDistance = (prev.cumulativeDistance || 0) + dist;
      } else {
        curr.distanceFromPrev = 0;
        curr.timeDiffFromPrev = 0;
        curr.speedFromPrev = 0;
        curr.cumulativeDistance = 0;
      }

      points.push(curr);
    }

    // Check if points are still available after outlier filtering
    if (points.length === 0) {
      points = [...analysisInput]; // fallback to analysis input
    }

    // Adjust first point cumulative if we skipped some
    if (points.length > 0) {
      points[0].cumulativeDistance = 0;
      for (let i = 1; i < points.length; i++) {
        const dist = calculateDistance(points[i - 1].lat, points[i - 1].lon, points[i].lat, points[i].lon);
        points[i].distanceFromPrev = dist;
        points[i].timeDiffFromPrev = (points[i].timestampMs - points[i - 1].timestampMs) / 1000;
        points[i].speedFromPrev = points[i].timeDiffFromPrev ? dist / points[i].timeDiffFromPrev : 0;
        points[i].cumulativeDistance = (points[i - 1].cumulativeDistance || 0) + dist;
      }
    }

    // 3. Perform Stop Detection
    const stops: GPXStop[] = [];
    const minDurationMs = settings.minDurationMinutes * 60 * 1000;
    const maxRadius = settings.maxRadiusMeters;

    let idx = 0;
    while (idx < points.length) {
      let stopFound = false;
      let stopEndIdx = idx;
      let stopPointsAccumulated: GPXPoint[] = [];

      if (settings.detectionMethod === 'distance') {
        // --- DISTANCE METHOD ---
        // A stop is a cluster of points that fit within a maximum radius over standard duration
        let startPt = points[idx];
        let j = idx;
        
        let centroidLat = startPt.lat;
        let centroidLon = startPt.lon;
        let count = 1;
        
        let excursionStartIdx: number | null = null;
        let tempStopPoints = [startPt];

        while (j + 1 < points.length) {
          const nextPt = points[j + 1];
          const distToCentroid = calculateDistance(centroidLat, centroidLon, nextPt.lat, nextPt.lon);

          if (distToCentroid <= maxRadius) {
            // Point is inside the stop radius
            tempStopPoints.push(nextPt);
            j++;
            // Update centroid
            count++;
            centroidLat = ((count - 1) * centroidLat + nextPt.lat) / count;
            centroidLon = ((count - 1) * centroidLon + nextPt.lon) / count;
            excursionStartIdx = null; // reset excursion if any
          } else if (settings.tolerateShortMovements) {
            // Tolerate short movements/jitter outside the radius
            if (excursionStartIdx === null) {
              excursionStartIdx = j + 1;
            }

            // How long has the user been in excursion?
            const excursionDurationMs = nextPt.timestampMs - points[excursionStartIdx].timestampMs;
            
            // Limit excursion to max 90 seconds OR max distance of 3x radius (to prevent huge drifts)
            if (excursionDurationMs <= 90000 && distToCentroid <= maxRadius * 3) {
              tempStopPoints.push(nextPt);
              j++; // absorb point
            } else {
              // Excursion exceeded limits; stop ends before excursion
              j = excursionStartIdx - 1;
              break;
            }
          } else {
            // No tolerance, stop scanning
            break;
          }
        }

        const durationMs = points[j].timestampMs - startPt.timestampMs;
        if (durationMs >= minDurationMs && j > idx) {
          stopFound = true;
          stopEndIdx = j;
          stopPointsAccumulated = tempStopPoints.slice(0, j - idx + 1);
        }

      } else if (settings.detectionMethod === 'speed') {
        // --- SPEED METHOD ---
        // Speed threshold: point speed under this limit is stationary
        // Standard walking speed is ~1.2 m/s. A threshold of 0.3 m/s (approx 1 km/h) is perfect for GPS accuracy.
        const speedThreshold = 0.3; // m/s
        let startPt = points[idx];
        let j = idx;

        let excursionStartIdx: number | null = null;
        let tempStopPoints = [startPt];

        while (j + 1 < points.length) {
          const nextPt = points[j + 1];
          
          if (nextPt.speedFromPrev !== undefined && nextPt.speedFromPrev <= speedThreshold) {
            tempStopPoints.push(nextPt);
            j++;
            excursionStartIdx = null;
          } else if (settings.tolerateShortMovements) {
            // Tolerate short bursts of speed (e.g., GPS spike or momentary step)
            if (excursionStartIdx === null) {
              excursionStartIdx = j + 1;
            }

            const excursionDurationMs = nextPt.timestampMs - points[excursionStartIdx].timestampMs;
            const distToStart = calculateDistance(startPt.lat, startPt.lon, nextPt.lat, nextPt.lon);

            // Limit excursion speed bursts to <= 90 seconds and <= 2.5x maxRadius in drift
            if (excursionDurationMs <= 90000 && distToStart <= maxRadius * 2.5) {
              tempStopPoints.push(nextPt);
              j++;
            } else {
              j = excursionStartIdx - 1;
              break;
            }
          } else {
            break;
          }
        }

        const durationMs = points[j].timestampMs - startPt.timestampMs;
        if (durationMs >= minDurationMs && j > idx) {
          stopFound = true;
          stopEndIdx = j;
          stopPointsAccumulated = tempStopPoints.slice(0, j - idx + 1);
        }

      } else {
        // --- HYBRID METHOD (Default / Combined) ---
        // Starts if speed is slow AND subsequently stays within the maxRadius from centroid
        const speedThreshold = 0.35; // slightly higher speed permitted initially
        let startPt = points[idx];
        let j = idx;

        let centroidLat = startPt.lat;
        let centroidLon = startPt.lon;
        let count = 1;

        let excursionStartIdx: number | null = null;
        let tempStopPoints = [startPt];

        while (j + 1 < points.length) {
          const nextPt = points[j + 1];
          const distToCentroid = calculateDistance(centroidLat, centroidLon, nextPt.lat, nextPt.lon);
          const speedOk = nextPt.speedFromPrev !== undefined && nextPt.speedFromPrev <= speedThreshold;
          const radiusOk = distToCentroid <= maxRadius;

          // In hybrid, we are highly stable if BOTH speed is low OR position satisfies radius
          if (radiusOk || speedOk) {
            tempStopPoints.push(nextPt);
            j++;
            count++;
            // Update centroid
            centroidLat = ((count - 1) * centroidLat + nextPt.lat) / count;
            centroidLon = ((count - 1) * centroidLon + nextPt.lon) / count;
            excursionStartIdx = null;
          } else if (settings.tolerateShortMovements) {
            if (excursionStartIdx === null) {
              excursionStartIdx = j + 1;
            }

            const excursionDurationMs = nextPt.timestampMs - points[excursionStartIdx].timestampMs;
            if (excursionDurationMs <= 90000 && distToCentroid <= maxRadius * 3) {
              tempStopPoints.push(nextPt);
              j++;
            } else {
              j = excursionStartIdx - 1;
              break;
            }
          } else {
            break;
          }
        }

        const durationMs = points[j].timestampMs - startPt.timestampMs;
        if (durationMs >= minDurationMs && j > idx) {
          stopFound = true;
          stopEndIdx = j;
          stopPointsAccumulated = tempStopPoints.slice(0, j - idx + 1);
        }
      }

      if (stopFound) {
        // Build GPXStop record
        const startPt = points[idx];
        const endPt = points[stopEndIdx];
        const durationMs = endPt.timestampMs - startPt.timestampMs;

        // Compute exact average center coordinates for the stop display (smoothing jitter)
        let latSum = 0;
        let lonSum = 0;
        let eleSum = 0;
        let eleCount = 0;

        for (const pt of stopPointsAccumulated) {
          latSum += pt.lat;
          lonSum += pt.lon;
          if (pt.ele !== undefined) {
            eleSum += pt.ele;
            eleCount++;
          }
        }

        const centerLat = latSum / stopPointsAccumulated.length;
        const centerLon = lonSum / stopPointsAccumulated.length;
        const avgEle = eleCount > 0 ? eleSum / eleCount : undefined;

        // Find max delta from the computed center
        let maxDelta = 0;
        for (const pt of stopPointsAccumulated) {
          const d = calculateDistance(centerLat, centerLon, pt.lat, pt.lon);
          if (d > maxDelta) maxDelta = d;
        }

        stops.push({
          id: `stop_${idx}_${stopEndIdx}_${startPt.timestampMs}`,
          startIndex: idx,
          endIndex: stopEndIdx,
          startTime: startPt.time,
          endTime: endPt.time,
          durationMs,
          durationFormatted: formatDuration(durationMs),
          lat: parseFloat(centerLat.toFixed(6)),
          lon: parseFloat(centerLon.toFixed(6)),
          avgEle: avgEle ? parseFloat(avgEle.toFixed(1)) : undefined,
          maxDistanceDelta: parseFloat(maxDelta.toFixed(1)),
          pointCount: stopPointsAccumulated.length,
        });

        // Fast-forward pointer to the end of the stop
        idx = stopEndIdx + 1;
      } else {
        idx++;
      }
    }

    // 4. Compile statistics
    let totalStopMs = 0;
    for (const stop of stops) {
      totalStopMs += stop.durationMs;
    }

    const firstPt = points[0];
    const lastPt = points[points.length - 1];
    const totalTrackDurationMs = lastPt.timestampMs - firstPt.timestampMs;
    const totalDistance = lastPt.cumulativeDistance || 0;

    let totalElevationGain = 0;
    for (let i = 1; i < points.length; i++) {
      const prevEle = points[i - 1].ele;
      const currEle = points[i].ele;
      if (prevEle !== undefined && currEle !== undefined && currEle > prevEle) {
        totalElevationGain += currEle - prevEle;
      }
    }

    const summary: AnalysisSummary = {
      totalStopDurationMs: totalStopMs,
      totalStopDurationFormatted: formatDuration(totalStopMs),
      totalTrackDurationMs,
      totalPoints: analysisInput.length,
      filteredPointsCount: filteredOutliersCount,
      totalDistanceMeters: Math.round(totalDistance),
      totalElevationGainM: Math.round(totalElevationGain),
      stopCount: stops.length,
      stopRatioPercent: totalTrackDurationMs > 0 ? Math.round((totalStopMs / totalTrackDurationMs) * 100) : 0,
    };

    return {
      success: true,
      points,
      rawPoints,
      stops,
      summary,
    };

  } catch (error: any) {
    return {
      success: false,
      error: `Analyse-Fehler: ${error.message || error}`,
      points: [],
      stops: [],
      summary: createEmptySummary(),
    };
  }
}

function createEmptySummary(): AnalysisSummary {
  return {
    totalStopDurationMs: 0,
    totalStopDurationFormatted: "0s",
    totalTrackDurationMs: 0,
    totalPoints: 0,
    filteredPointsCount: 0,
    totalDistanceMeters: 0,
    totalElevationGainM: 0,
    stopCount: 0,
    stopRatioPercent: 0,
  };
}
