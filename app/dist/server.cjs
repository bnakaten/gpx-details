var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/auth/db.ts
var db_exports = {};
__export(db_exports, {
  deleteUser: () => deleteUser,
  findUserByAthleteId: () => findUserByAthleteId,
  findUserById: () => findUserById,
  getStravaConfig: () => getStravaConfig,
  setStravaConfig: () => setStravaConfig,
  updateTokens: () => updateTokens,
  upsertUser: () => upsertUser
});
async function initDb() {
  if (db) return db;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const SQL = await (0, import_sql.default)();
    const dir = import_path.default.dirname(DB_PATH);
    if (!import_fs.default.existsSync(dir)) {
      import_fs.default.mkdirSync(dir, { recursive: true });
    }
    if (import_fs.default.existsSync(DB_PATH)) {
      const buffer = import_fs.default.readFileSync(DB_PATH);
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
    }
    db.run("PRAGMA journal_mode = WAL");
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        strava_athlete_id INTEGER NOT NULL UNIQUE,
        firstname TEXT NOT NULL,
        lastname TEXT NOT NULL,
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    db.run(`
      CREATE TABLE IF NOT EXISTS strava_config (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        client_id TEXT NOT NULL,
        client_secret TEXT NOT NULL,
        redirect_uri TEXT NOT NULL DEFAULT '',
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    try {
      db.run(`ALTER TABLE strava_config ADD COLUMN redirect_uri TEXT NOT NULL DEFAULT ''`);
    } catch {
    }
    return db;
  })();
  return initPromise;
}
function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  import_fs.default.writeFileSync(DB_PATH, buffer);
}
async function upsertUser(stravaAthleteId, firstname, lastname, accessToken, refreshToken, expiresAt) {
  const d = await initDb();
  const existing = d.exec("SELECT id FROM users WHERE strava_athlete_id = ?", [stravaAthleteId]);
  if (existing.length > 0 && existing[0].values.length > 0) {
    d.run(
      `UPDATE users SET
        firstname = ?,
        lastname = ?,
        access_token = ?,
        refresh_token = ?,
        expires_at = ?,
        updated_at = datetime('now')
      WHERE strava_athlete_id = ?`,
      [firstname, lastname, accessToken, refreshToken, expiresAt, stravaAthleteId]
    );
  } else {
    d.run(
      `INSERT INTO users (strava_athlete_id, firstname, lastname, access_token, refresh_token, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [stravaAthleteId, firstname, lastname, accessToken, refreshToken, expiresAt]
    );
  }
  saveDb();
  const result = d.exec("SELECT * FROM users WHERE strava_athlete_id = ?", [stravaAthleteId]);
  if (result.length === 0 || result[0].values.length === 0) {
    throw new Error("Failed to retrieve user after upsert");
  }
  return rowToUser(result[0]);
}
async function findUserByAthleteId(stravaAthleteId) {
  const d = await initDb();
  const result = d.exec("SELECT * FROM users WHERE strava_athlete_id = ?", [stravaAthleteId]);
  if (result.length === 0 || result[0].values.length === 0) return void 0;
  return rowToUser(result[0]);
}
async function findUserById(id) {
  const d = await initDb();
  const result = d.exec("SELECT * FROM users WHERE id = ?", [id]);
  if (result.length === 0 || result[0].values.length === 0) return void 0;
  return rowToUser(result[0]);
}
async function deleteUser(id) {
  const d = await initDb();
  d.run("DELETE FROM users WHERE id = ?", [id]);
  saveDb();
}
async function updateTokens(userId, accessToken, refreshToken, expiresAt) {
  const d = await initDb();
  d.run(
    `UPDATE users SET access_token = ?, refresh_token = ?, expires_at = ?, updated_at = datetime('now') WHERE id = ?`,
    [accessToken, refreshToken, expiresAt, userId]
  );
  saveDb();
}
async function getStravaConfig() {
  const d = await initDb();
  const result = d.exec("SELECT * FROM strava_config WHERE id = 1");
  if (result.length === 0 || result[0].values.length === 0) return void 0;
  return rowToStravaConfig(result[0]);
}
async function setStravaConfig(clientId, clientSecret, redirectUri) {
  const d = await initDb();
  const existing = await getStravaConfig();
  const finalClientId = clientId || existing?.client_id || "";
  const finalClientSecret = clientSecret || existing?.client_secret || "";
  const finalRedirectUri = redirectUri !== void 0 ? redirectUri : existing?.redirect_uri || "";
  d.run(
    `INSERT INTO strava_config (id, client_id, client_secret, redirect_uri, updated_at)
     VALUES (1, ?, ?, ?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       client_id = excluded.client_id,
       client_secret = excluded.client_secret,
       redirect_uri = excluded.redirect_uri,
       updated_at = datetime('now')`,
    [finalClientId, finalClientSecret, finalRedirectUri]
  );
  saveDb();
}
function rowToStravaConfig(row) {
  const cols = row.columns;
  const vals = row.values[0];
  return {
    id: vals[cols.indexOf("id")],
    client_id: vals[cols.indexOf("client_id")],
    client_secret: vals[cols.indexOf("client_secret")],
    redirect_uri: vals[cols.indexOf("redirect_uri")] || "",
    updated_at: vals[cols.indexOf("updated_at")]
  };
}
function rowToUser(row) {
  const cols = row.columns;
  const vals = row.values[0];
  return {
    id: vals[cols.indexOf("id")],
    strava_athlete_id: vals[cols.indexOf("strava_athlete_id")],
    firstname: vals[cols.indexOf("firstname")],
    lastname: vals[cols.indexOf("lastname")],
    access_token: vals[cols.indexOf("access_token")],
    refresh_token: vals[cols.indexOf("refresh_token")],
    expires_at: vals[cols.indexOf("expires_at")],
    created_at: vals[cols.indexOf("created_at")],
    updated_at: vals[cols.indexOf("updated_at")]
  };
}
var import_sql, import_fs, import_path, DB_PATH, db, initPromise;
var init_db = __esm({
  "src/auth/db.ts"() {
    import_sql = __toESM(require("sql.js"), 1);
    import_fs = __toESM(require("fs"), 1);
    import_path = __toESM(require("path"), 1);
    DB_PATH = process.env.DB_PATH || import_path.default.join(process.cwd(), "data", "app.db");
  }
});

// server.ts
var import_config = require("dotenv/config");
var import_express2 = __toESM(require("express"), 1);
var import_cookie_parser = __toESM(require("cookie-parser"), 1);
var import_path2 = __toESM(require("path"), 1);
var import_vite = require("vite");

// src/gpxAnalyzer.ts
var import_fast_xml_parser = require("fast-xml-parser");
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
function formatDuration(durationMs) {
  const seconds = Math.floor(durationMs / 1e3);
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
function parseGPX(xmlContent) {
  const points = [];
  try {
    const parser = new import_fast_xml_parser.XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_"
    });
    const result = parser.parse(xmlContent);
    const extractPointsFromObj = (obj) => {
      if (!obj) return;
      if (obj.trkpt) {
        const pts = Array.isArray(obj.trkpt) ? obj.trkpt : [obj.trkpt];
        for (const pt of pts) {
          const lat = parseFloat(pt["@_lat"]);
          const lon = parseFloat(pt["@_lon"]);
          const ele = pt.ele ? parseFloat(pt.ele) : void 0;
          const time = pt.time ? String(pt.time).trim() : "";
          if (!isNaN(lat) && !isNaN(lon) && time) {
            points.push({
              lat,
              lon,
              ele,
              time,
              timestampMs: new Date(time).getTime()
            });
          }
        }
        return;
      }
      for (const key of Object.keys(obj)) {
        if (typeof obj[key] === "object" && obj[key] !== null) {
          extractPointsFromObj(obj[key]);
        }
      }
    };
    extractPointsFromObj(result);
  } catch (err) {
    console.warn("Fast-XML-Parser failed, falling back to regex parser:", err);
  }
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
        const eleMatch = /<(?:[a-zA-Z0-9_-]+:)?ele>([-+]?\d+(?:\.\d+)?)<\/(?:[a-zA-Z0-9_-]+:)?ele>/i.exec(body);
        const ele = eleMatch ? parseFloat(eleMatch[1]) : void 0;
        const timeMatch = /<(?:[a-zA-Z0-9_-]+:)?time>([^<]+)<\/(?:[a-zA-Z0-9_-]+:)?time>/i.exec(body);
        const time = timeMatch ? timeMatch[1].trim() : "";
        if (!isNaN(lat) && !isNaN(lon) && time) {
          points.push({
            lat,
            lon,
            ele,
            time,
            timestampMs: new Date(time).getTime()
          });
        }
      }
    }
  }
  points.sort((a, b) => a.timestampMs - b.timestampMs);
  return points;
}
function densifyPoints(points, intervalM) {
  if (points.length < 2 || intervalM <= 0) return points;
  const result = [points[0]];
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
        timestampMs: Math.round(prev.timestampMs + frac * duration)
      });
    }
  }
  return result;
}
async function matchPointsToRoad(points, apiKey) {
  const BATCH_SIZE = 100;
  const matched = [];
  for (let batchStart = 0; batchStart < points.length; batchStart += BATCH_SIZE) {
    const batch = points.slice(batchStart, batchStart + BATCH_SIZE);
    if (batch.length < 2) {
      for (const p of batch) matched.push({ ...p });
      continue;
    }
    const path3 = batch.map((p) => `${p.lat},${p.lon}`).join("|");
    const url = `https://roads.googleapis.com/v1/snapToRoads?path=${path3}&interpolate=true&key=${apiKey}`;
    try {
      console.log(`[Google Roads] batch ${batchStart}-${Math.min(batchStart + BATCH_SIZE, points.length)}: ${batch.length} points`);
      const response = await fetch(url, { signal: AbortSignal.timeout(3e4) });
      if (!response.ok) {
        let body = "";
        try {
          body = await response.text();
        } catch {
        }
        console.error(`[Google Roads] HTTP ${response.status}:`, body.slice(0, 300));
        throw new Error(`HTTP ${response.status}: ${body.slice(0, 200)}`);
      }
      const rawData = await response.json();
      if (rawData.error) {
        console.error("[Google Roads] API error:", JSON.stringify(rawData.error));
        throw new Error(`API error: ${rawData.error.message || JSON.stringify(rawData.error)}`);
      }
      const data = rawData;
      console.log(`[Google Roads] batch ${batchStart}: got ${data.snappedPoints?.length || 0} snapped points`);
      if (!data.snappedPoints || data.snappedPoints.length === 0) throw new Error("No snapped points returned");
      const resultPts = [];
      let currentOi = -1;
      for (const sp of data.snappedPoints) {
        if (sp.originalIndex != null) currentOi = sp.originalIndex;
        if (currentOi < 0) continue;
        resultPts.push({ lat: sp.location.latitude, lon: sp.location.longitude, originalIndex: currentOi });
      }
      const groups = /* @__PURE__ */ new Map();
      for (const pt of resultPts) {
        const arr = groups.get(pt.originalIndex);
        if (arr) arr.push(pt);
        else groups.set(pt.originalIndex, [pt]);
      }
      const sortedIndices = [...groups.keys()].sort((a, b) => a - b);
      for (let gi = 0; gi < sortedIndices.length; gi++) {
        const oi = sortedIndices[gi];
        const groupPts = groups.get(oi);
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
            timestampMs: ts
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
async function analyzeGPXData(xmlContent, settings) {
  try {
    const parsedPoints = parseGPX(xmlContent);
    if (parsedPoints.length === 0) {
      return {
        success: false,
        error: "Keine g\xFCltigen Trackpunkte mit Zeitstempel im GPX-Dokument gefunden.",
        points: [],
        stops: [],
        summary: createEmptySummary()
      };
    }
    let displayPoints = parsedPoints;
    if (settings.cutoffTimestampMs !== void 0 && settings.cutoffTimestampMs > 0) {
      const minTimestamp = settings.cutoffTimestampMs - 6e4;
      const filtered = parsedPoints.filter((p) => p.timestampMs >= minTimestamp);
      if (filtered.length === 0) {
        return {
          success: false,
          error: `Keine Punkte nach dem gew\xE4hlten Zeitstempel (${new Date(settings.cutoffTimestampMs).toLocaleString("de-DE")}) vorhanden.`,
          points: [],
          stops: [],
          summary: createEmptySummary()
        };
      }
      displayPoints = filtered;
    }
    let matchedPoints;
    if (settings.enableMapMatching && settings.googleApiKey) {
      const densifyInterval = settings.densifyIntervalM ?? 0;
      const inputForMatching = densifyInterval > 0 ? densifyPoints(displayPoints, densifyInterval) : displayPoints;
      matchedPoints = await matchPointsToRoad(inputForMatching, settings.googleApiKey);
    }
    const analysisInput = matchedPoints ?? displayPoints;
    const rawPoints = matchedPoints ? displayPoints : void 0;
    let points = [];
    let filteredOutliersCount = 0;
    const MAX_SPEED_LIMIT_MS = 50;
    for (let i = 0; i < analysisInput.length; i++) {
      const curr = { ...analysisInput[i] };
      if (i > 0) {
        const prev = points[points.length - 1] || analysisInput[i - 1];
        const dist = calculateDistance(prev.lat, prev.lon, curr.lat, curr.lon);
        const timeDiff = (curr.timestampMs - prev.timestampMs) / 1e3;
        curr.distanceFromPrev = dist;
        curr.timeDiffFromPrev = timeDiff;
        if (timeDiff > 0) {
          curr.speedFromPrev = dist / timeDiff;
        } else {
          curr.speedFromPrev = 0;
        }
        if (settings.gpsFilterOutliers && curr.speedFromPrev > MAX_SPEED_LIMIT_MS && timeDiff < 60) {
          filteredOutliersCount++;
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
    if (points.length === 0) {
      points = [...analysisInput];
    }
    if (points.length > 0) {
      points[0].cumulativeDistance = 0;
      for (let i = 1; i < points.length; i++) {
        const dist = calculateDistance(points[i - 1].lat, points[i - 1].lon, points[i].lat, points[i].lon);
        points[i].distanceFromPrev = dist;
        points[i].timeDiffFromPrev = (points[i].timestampMs - points[i - 1].timestampMs) / 1e3;
        points[i].speedFromPrev = points[i].timeDiffFromPrev ? dist / points[i].timeDiffFromPrev : 0;
        points[i].cumulativeDistance = (points[i - 1].cumulativeDistance || 0) + dist;
      }
    }
    const stops = [];
    const minDurationMs = settings.minDurationMinutes * 60 * 1e3;
    const maxRadius = settings.maxRadiusMeters;
    let idx = 0;
    while (idx < points.length) {
      let stopFound = false;
      let stopEndIdx = idx;
      let stopPointsAccumulated = [];
      if (settings.detectionMethod === "distance") {
        let startPt = points[idx];
        let j = idx;
        let centroidLat = startPt.lat;
        let centroidLon = startPt.lon;
        let count = 1;
        let excursionStartIdx = null;
        let tempStopPoints = [startPt];
        while (j + 1 < points.length) {
          const nextPt = points[j + 1];
          const distToCentroid = calculateDistance(centroidLat, centroidLon, nextPt.lat, nextPt.lon);
          if (distToCentroid <= maxRadius) {
            tempStopPoints.push(nextPt);
            j++;
            count++;
            centroidLat = ((count - 1) * centroidLat + nextPt.lat) / count;
            centroidLon = ((count - 1) * centroidLon + nextPt.lon) / count;
            excursionStartIdx = null;
          } else if (settings.tolerateShortMovements) {
            if (excursionStartIdx === null) {
              excursionStartIdx = j + 1;
            }
            const excursionDurationMs = nextPt.timestampMs - points[excursionStartIdx].timestampMs;
            if (excursionDurationMs <= 9e4 && distToCentroid <= maxRadius * 3) {
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
      } else if (settings.detectionMethod === "speed") {
        const speedThreshold = 0.3;
        let startPt = points[idx];
        let j = idx;
        let excursionStartIdx = null;
        let tempStopPoints = [startPt];
        while (j + 1 < points.length) {
          const nextPt = points[j + 1];
          if (nextPt.speedFromPrev !== void 0 && nextPt.speedFromPrev <= speedThreshold) {
            tempStopPoints.push(nextPt);
            j++;
            excursionStartIdx = null;
          } else if (settings.tolerateShortMovements) {
            if (excursionStartIdx === null) {
              excursionStartIdx = j + 1;
            }
            const excursionDurationMs = nextPt.timestampMs - points[excursionStartIdx].timestampMs;
            const distToStart = calculateDistance(startPt.lat, startPt.lon, nextPt.lat, nextPt.lon);
            if (excursionDurationMs <= 9e4 && distToStart <= maxRadius * 2.5) {
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
        const speedThreshold = 0.35;
        let startPt = points[idx];
        let j = idx;
        let centroidLat = startPt.lat;
        let centroidLon = startPt.lon;
        let count = 1;
        let excursionStartIdx = null;
        let tempStopPoints = [startPt];
        while (j + 1 < points.length) {
          const nextPt = points[j + 1];
          const distToCentroid = calculateDistance(centroidLat, centroidLon, nextPt.lat, nextPt.lon);
          const speedOk = nextPt.speedFromPrev !== void 0 && nextPt.speedFromPrev <= speedThreshold;
          const radiusOk = distToCentroid <= maxRadius;
          if (radiusOk || speedOk) {
            tempStopPoints.push(nextPt);
            j++;
            count++;
            centroidLat = ((count - 1) * centroidLat + nextPt.lat) / count;
            centroidLon = ((count - 1) * centroidLon + nextPt.lon) / count;
            excursionStartIdx = null;
          } else if (settings.tolerateShortMovements) {
            if (excursionStartIdx === null) {
              excursionStartIdx = j + 1;
            }
            const excursionDurationMs = nextPt.timestampMs - points[excursionStartIdx].timestampMs;
            if (excursionDurationMs <= 9e4 && distToCentroid <= maxRadius * 3) {
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
        const startPt = points[idx];
        const endPt = points[stopEndIdx];
        const durationMs = endPt.timestampMs - startPt.timestampMs;
        let latSum = 0;
        let lonSum = 0;
        let eleSum = 0;
        let eleCount = 0;
        for (const pt of stopPointsAccumulated) {
          latSum += pt.lat;
          lonSum += pt.lon;
          if (pt.ele !== void 0) {
            eleSum += pt.ele;
            eleCount++;
          }
        }
        const centerLat = latSum / stopPointsAccumulated.length;
        const centerLon = lonSum / stopPointsAccumulated.length;
        const avgEle = eleCount > 0 ? eleSum / eleCount : void 0;
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
          avgEle: avgEle ? parseFloat(avgEle.toFixed(1)) : void 0,
          maxDistanceDelta: parseFloat(maxDelta.toFixed(1)),
          pointCount: stopPointsAccumulated.length
        });
        idx = stopEndIdx + 1;
      } else {
        idx++;
      }
    }
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
      if (prevEle !== void 0 && currEle !== void 0 && currEle > prevEle) {
        totalElevationGain += currEle - prevEle;
      }
    }
    const summary = {
      totalStopDurationMs: totalStopMs,
      totalStopDurationFormatted: formatDuration(totalStopMs),
      totalTrackDurationMs,
      totalPoints: analysisInput.length,
      filteredPointsCount: filteredOutliersCount,
      totalDistanceMeters: Math.round(totalDistance),
      totalElevationGainM: Math.round(totalElevationGain),
      stopCount: stops.length,
      stopRatioPercent: totalTrackDurationMs > 0 ? Math.round(totalStopMs / totalTrackDurationMs * 100) : 0
    };
    return {
      success: true,
      points,
      rawPoints,
      stops,
      summary
    };
  } catch (error) {
    return {
      success: false,
      error: `Analyse-Fehler: ${error.message || error}`,
      points: [],
      stops: [],
      summary: createEmptySummary()
    };
  }
}
function createEmptySummary() {
  return {
    totalStopDurationMs: 0,
    totalStopDurationFormatted: "0s",
    totalTrackDurationMs: 0,
    totalPoints: 0,
    filteredPointsCount: 0,
    totalDistanceMeters: 0,
    totalElevationGainM: 0,
    stopCount: 0,
    stopRatioPercent: 0
  };
}

// src/auth/routes.ts
var import_express = require("express");
var import_crypto = __toESM(require("crypto"), 1);

// src/auth/strava.ts
var stravaClientId = process.env.STRAVA_CLIENT_ID || "";
var stravaClientSecret = process.env.STRAVA_CLIENT_SECRET || "";
var stravaRedirectUri = process.env.STRAVA_REDIRECT_URI || "";
function getStravaAuthUrl(state, storeKey, redirectUri) {
  const combinedState = `${storeKey}:${state}`;
  const params = new URLSearchParams({
    client_id: stravaClientId,
    redirect_uri: redirectUri,
    response_type: "code",
    approval_prompt: "auto",
    scope: "read,activity:read",
    state: combinedState
  });
  return `https://www.strava.com/oauth/authorize?${params.toString()}`;
}
function isStravaConfigured() {
  return Boolean(stravaClientId && stravaClientSecret);
}
function getStravaEnvRedirectUri() {
  return stravaRedirectUri;
}
async function exchangeCodeForToken(code) {
  const response = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: stravaClientId,
      client_secret: stravaClientSecret,
      code,
      grant_type: "authorization_code"
    })
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Strava OAuth error: ${response.status} - ${errorText}`);
  }
  return response.json();
}
async function refreshAccessToken(refreshToken) {
  const response = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: stravaClientId,
      client_secret: stravaClientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    })
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Strava token refresh error: ${response.status} - ${errorText}`);
  }
  return response.json();
}
async function getAthleteActivities(accessToken, opts) {
  const params = new URLSearchParams();
  params.set("per_page", String(opts?.perPage ?? 30));
  if (opts?.after) params.set("after", String(opts.after));
  if (opts?.before) params.set("before", String(opts.before));
  const response = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!response.ok) {
    if (response.status === 401) {
      throw new StravaAuthError("Access token expired or invalid");
    }
    const errorText = await response.text();
    throw new Error(`Strava API error: ${response.status} - ${errorText}`);
  }
  return response.json();
}
var StravaAuthError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "StravaAuthError";
  }
};
async function getActivityStreams(accessToken, activityId) {
  const response = await fetch(
    `https://www.strava.com/api/v3/activities/${activityId}/streams?keys=latlng,time,altitude&key_by_type=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!response.ok) {
    if (response.status === 401) {
      throw new StravaAuthError("Access token expired or invalid");
    }
    const errorText = await response.text();
    throw new Error(`Strava streams API error: ${response.status} - ${errorText}`);
  }
  return response.json();
}
function buildGPXFromStreams(streams, activityName, startDate) {
  const latlng = streams.latlng?.data ?? [];
  const times = streams.time?.data ?? [];
  const altitudes = streams.altitude?.data ?? [];
  const baseTimeMs = startDate ? new Date(startDate).getTime() : 0;
  const points = [];
  const count = Math.min(latlng.length, times.length);
  for (let i = 0; i < count; i++) {
    const [lat, lon] = latlng[i];
    const time = new Date(baseTimeMs + times[i] * 1e3).toISOString();
    const ele = altitudes[i] != null ? `<ele>${altitudes[i].toFixed(1)}</ele>` : "";
    points.push(
      `      <trkpt lat="${lat}" lon="${lon}">${ele ? `
        ${ele}` : ""}
        <time>${time}</time>
      </trkpt>`
    );
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="gpx-details">
  <metadata>
    <name>${escapeXml(activityName)}</name>
  </metadata>
  <trk>
    <name>${escapeXml(activityName)}</name>
    <trkseg>
${points.join("\n")}
    </trkseg>
  </trk>
</gpx>`;
}
async function initStravaCredentials() {
  const { getStravaConfig: getStravaConfig2 } = await Promise.resolve().then(() => (init_db(), db_exports));
  const config = await getStravaConfig2();
  if (config) {
    if (!stravaClientId) {
      stravaClientId = config.client_id;
      stravaClientSecret = config.client_secret;
    }
    if (!stravaRedirectUri) {
      stravaRedirectUri = config.redirect_uri || "";
    }
  }
}
async function setStravaCredentials(clientId, clientSecret, redirectUri) {
  if (clientId) stravaClientId = clientId;
  if (clientSecret) stravaClientSecret = clientSecret;
  stravaRedirectUri = redirectUri || "";
  const { setStravaConfig: setStravaConfig2 } = await Promise.resolve().then(() => (init_db(), db_exports));
  await setStravaConfig2(clientId || "", clientSecret || "", redirectUri);
}
function escapeXml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

// src/auth/jwt.ts
var import_jsonwebtoken = __toESM(require("jsonwebtoken"), 1);
var JWT_SECRET = process.env.JWT_SECRET || "gpx-details-dev-secret-change-in-production";
function signToken(payload) {
  return import_jsonwebtoken.default.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}
function verifyToken(token) {
  return import_jsonwebtoken.default.verify(token, JWT_SECRET);
}

// src/auth/routes.ts
init_db();

// src/auth/middleware.ts
init_db();
async function authMiddleware(req, res, next) {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ error: "Not authenticated." });
  }
  try {
    const payload = verifyToken(token);
    const user = await findUserById(payload.userId);
    if (!user) {
      return res.status(401).json({ error: "User not found." });
    }
    req.user = {
      userId: payload.userId,
      stravaAthleteId: payload.stravaAthleteId,
      firstname: user.firstname,
      lastname: user.lastname
    };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token." });
  }
}
async function optionalAuth(req, _res, next) {
  const token = req.cookies?.token;
  if (token) {
    try {
      const payload = verifyToken(token);
      const user = await findUserById(payload.userId);
      if (user) {
        req.user = {
          userId: payload.userId,
          stravaAthleteId: payload.stravaAthleteId,
          firstname: user.firstname,
          lastname: user.lastname
        };
      }
    } catch {
    }
  }
  next();
}

// src/auth/routes.ts
var stateStore = /* @__PURE__ */ new Map();
var STATE_TTL = 10 * 60 * 1e3;
function cleanStateStore() {
  const now = Date.now();
  for (const [key, entry] of stateStore) {
    if (entry.expiresAt < now) stateStore.delete(key);
  }
}
function storeState(state) {
  cleanStateStore();
  const key = import_crypto.default.randomBytes(8).toString("hex");
  stateStore.set(key, { state, expiresAt: Date.now() + STATE_TTL });
  return key;
}
function verifyState(key, state) {
  const entry = stateStore.get(key);
  if (!entry) return false;
  stateStore.delete(key);
  return entry.state === state;
}
function createAuthRouter() {
  const router = (0, import_express.Router)();
  router.get("/login", (req, res) => {
    if (!isStravaConfigured()) {
      return res.status(500).json({ error: "Strava is not configured." });
    }
    const state = import_crypto.default.randomBytes(16).toString("hex");
    const key = storeState(state);
    const envRedirect = process.env.STRAVA_REDIRECT_URI || "";
    const redirectUri = envRedirect || getStravaEnvRedirectUri() || `${req.protocol}://${req.get("host")}/api/auth/strava/callback`;
    const url = getStravaAuthUrl(state, key, redirectUri);
    res.json({ url });
  });
  router.get("/status", (_req, res) => {
    return res.json({ configured: isStravaConfigured() });
  });
  router.post("/strava-config", async (req, res) => {
    const { clientId, clientSecret, redirectUri } = req.body;
    if (!isStravaConfigured() && (!clientId || !clientSecret)) {
      return res.status(400).json({ error: "Client ID and Client Secret are required." });
    }
    try {
      await setStravaCredentials(clientId, clientSecret, redirectUri);
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message || "Error saving configuration." });
    }
  });
  router.get("/strava/callback", async (req, res) => {
    const { code, state } = req.query;
    if (!code || typeof code !== "string") {
      return res.status(400).send("Missing OAuth code.");
    }
    if (!state || typeof state !== "string") {
      return res.status(403).send("Missing state parameter.");
    }
    const sep = state.indexOf(":");
    if (sep <= 0 || sep >= state.length - 1) {
      return res.status(403).send("Invalid state parameter.");
    }
    const sk = state.substring(0, sep);
    const actualState = state.substring(sep + 1);
    if (!verifyState(sk, actualState)) {
      return res.status(403).send("Invalid state parameter.");
    }
    try {
      const tokenData = await exchangeCodeForToken(code);
      const user = await upsertUser(
        tokenData.athlete.id,
        tokenData.athlete.firstname,
        tokenData.athlete.lastname,
        tokenData.access_token,
        tokenData.refresh_token,
        tokenData.expires_at
      );
      const jwtToken = signToken({
        userId: user.id,
        stravaAthleteId: user.strava_athlete_id
      });
      res.cookie("token", jwtToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1e3
      });
      return res.redirect("/");
    } catch (err) {
      console.error("Strava callback error:", err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      return res.redirect(`/?loginError=${encodeURIComponent(errorMsg)}`);
    }
  });
  router.get("/me", authMiddleware, (req, res) => {
    return res.json({
      authenticated: true,
      user: req.user
    });
  });
  router.post("/logout", (_req, res) => {
    res.clearCookie("token");
    return res.json({ success: true });
  });
  router.post("/delete-account", authMiddleware, async (req, res) => {
    try {
      const user = req.user;
      const { getStravaConfig: getStravaConfig2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const config = await getStravaConfig2();
      const clientId = config?.client_id || process.env.STRAVA_CLIENT_ID;
      const clientSecret = config?.client_secret || process.env.STRAVA_CLIENT_SECRET;
      const { findUserById: findUserById2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const userRow = await findUserById2(user.userId);
      if (userRow && clientId && clientSecret) {
        try {
          await fetch("https://www.strava.com/oauth/deauthorize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              client_id: clientId,
              client_secret: clientSecret,
              access_token: userRow.access_token
            })
          });
        } catch {
        }
      }
      await deleteUser(user.userId);
      res.clearCookie("token");
      return res.json({ success: true });
    } catch (err) {
      console.error("Delete account error:", err);
      return res.status(500).json({ error: err.message || "Error deleting account." });
    }
  });
  return router;
}

// server.ts
init_db();
async function startServer() {
  const app = (0, import_express2.default)();
  const PORT = 3e3;
  app.set("trust proxy", true);
  app.use(import_express2.default.json({ limit: "100mb" }));
  app.use(import_express2.default.urlencoded({ extended: true, limit: "100mb" }));
  app.use((0, import_cookie_parser.default)());
  await initStravaCredentials();
  app.use("/api/auth", createAuthRouter());
  app.post("/api/analyze", optionalAuth, async (req, res) => {
    try {
      const { content, settings } = req.body;
      if (!content || typeof content !== "string") {
        return res.status(400).json({
          success: false,
          error: "Invalid file content. No raw GPX text was provided."
        });
      }
      const parsedSettings = {
        minDurationMinutes: Number(settings?.minDurationMinutes ?? 5),
        maxRadiusMeters: Number(settings?.maxRadiusMeters ?? 15),
        detectionMethod: settings?.detectionMethod ?? "hybrid",
        gpsFilterOutliers: settings?.gpsFilterOutliers ?? true,
        tolerateShortMovements: settings?.tolerateShortMovements ?? true,
        cutoffTimestampMs: settings?.cutoffTimestampMs ?? void 0,
        enableMapMatching: settings?.enableMapMatching ?? false,
        googleApiKey: settings?.googleApiKey ?? void 0,
        densifyIntervalM: Number(settings?.densifyIntervalM ?? 0)
      };
      const result = await analyzeGPXData(content, parsedSettings);
      return res.json(result);
    } catch (error) {
      console.error("Analysis error in endpoint:", error);
      return res.status(500).json({
        success: false,
        error: `Server calculation error: ${error.message || error}`
      });
    }
  });
  app.post("/api/history/compare", optionalAuth, async (req, res) => {
    try {
      const { files } = req.body;
      if (!Array.isArray(files) || files.length < 2 || files.length > 5) {
        return res.status(400).json({
          success: false,
          error: "Provide 2\u20135 files for comparison."
        });
      }
      const results = [];
      for (const file of files) {
        if (!file.content || typeof file.content !== "string") {
          return res.status(400).json({
            success: false,
            error: `Invalid content for file "${file.filename}".`
          });
        }
        const parsedSettings = {
          minDurationMinutes: Number(file.settings?.minDurationMinutes ?? 5),
          maxRadiusMeters: Number(file.settings?.maxRadiusMeters ?? 15),
          detectionMethod: file.settings?.detectionMethod ?? "hybrid",
          gpsFilterOutliers: file.settings?.gpsFilterOutliers ?? true,
          tolerateShortMovements: file.settings?.tolerateShortMovements ?? true,
          cutoffTimestampMs: file.settings?.cutoffTimestampMs ?? void 0,
          enableMapMatching: file.settings?.enableMapMatching ?? false,
          googleApiKey: file.settings?.googleApiKey ?? void 0,
          densifyIntervalM: Number(file.settings?.densifyIntervalM ?? 0)
        };
        const result = await analyzeGPXData(file.content, parsedSettings);
        if (!result.success) {
          return res.status(400).json({
            success: false,
            error: `File "${file.filename}": ${result.error || "Analysis failed"}`
          });
        }
        results.push({
          filename: file.filename,
          summary: result.summary
        });
      }
      return res.json({ results });
    } catch (error) {
      console.error("Compare error in endpoint:", error);
      return res.status(500).json({
        success: false,
        error: `Comparison error: ${error.message || error}`
      });
    }
  });
  app.get("/api/strava/activities", authMiddleware, async (req, res) => {
    try {
      const user = await findUserById(req.user.userId);
      if (!user) {
        return res.status(401).json({ error: "User not found." });
      }
      let accessToken = user.access_token;
      if (user.expires_at * 1e3 < Date.now()) {
        try {
          const refreshed = await refreshAccessToken(user.refresh_token);
          accessToken = refreshed.access_token;
          await updateTokens(user.id, refreshed.access_token, refreshed.refresh_token, refreshed.expires_at);
        } catch {
          return res.status(401).json({ error: "Strava session expired. Please log in again." });
        }
      }
      const after = req.query.after ? parseInt(req.query.after) : void 0;
      const before = req.query.before ? parseInt(req.query.before) : void 0;
      const activities = await getAthleteActivities(accessToken, { after, before });
      return res.json({ activities });
    } catch (err) {
      console.error("Strava activities error:", err);
      return res.status(500).json({ error: err.message || "Error fetching activities." });
    }
  });
  app.get("/api/strava/activity/:id/gpx", authMiddleware, async (req, res) => {
    try {
      const activityId = parseInt(req.params.id, 10);
      if (isNaN(activityId)) {
        return res.status(400).json({ error: "Invalid activity ID." });
      }
      const user = await findUserById(req.user.userId);
      if (!user) {
        return res.status(401).json({ error: "User not found." });
      }
      let accessToken = user.access_token;
      if (user.expires_at * 1e3 < Date.now()) {
        try {
          const refreshed = await refreshAccessToken(user.refresh_token);
          accessToken = refreshed.access_token;
          await updateTokens(user.id, refreshed.access_token, refreshed.refresh_token, refreshed.expires_at);
        } catch {
          return res.status(401).json({ error: "Strava session expired. Please log in again." });
        }
      }
      const streams = await getActivityStreams(accessToken, activityId);
      if (!streams.latlng || !streams.time) {
        return res.status(400).json({ error: "This activity contains no GPS data." });
      }
      const activityName = streams.latlng ? "Strava Activity" : "";
      const startDate = req.query.startDate || "";
      const gpx = buildGPXFromStreams(streams, activityName, startDate);
      return res.json({ gpx, activityId });
    } catch (err) {
      console.error("Strava GPX error:", err);
      if (err instanceof StravaAuthError) {
        return res.status(401).json({ error: "Strava token invalid. Please log in again." });
      }
      return res.status(500).json({ error: err.message || "Error fetching GPX data." });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
    console.log("Vite development middleware integrated.");
  } else {
    const distPath = import_path2.default.join(process.cwd(), "dist");
    app.use(optionalAuth, import_express2.default.static(distPath));
    app.get("*", optionalAuth, (req, res) => {
      res.sendFile(import_path2.default.join(distPath, "index.html"));
    });
    console.log(`Serving static production build from: ${distPath}`);
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening at http://0.0.0.0:${PORT}`);
  });
}
startServer().catch((error) => {
  console.error("Failed to start full-stack server:", error);
});
/**
 * @license
 * SPDX-License-Identifier: GPL-3.0-only
 */
//# sourceMappingURL=server.cjs.map
