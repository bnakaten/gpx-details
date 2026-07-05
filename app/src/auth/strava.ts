/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

let stravaClientId = process.env.STRAVA_CLIENT_ID || '';
let stravaClientSecret = process.env.STRAVA_CLIENT_SECRET || '';
let stravaRedirectUri = process.env.STRAVA_REDIRECT_URI || '';

export function getStravaAuthUrl(state: string, storeKey: string, redirectUri: string): string {
  const combinedState = `${storeKey}:${state}`;
  const params = new URLSearchParams({
    client_id: stravaClientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'read,activity:read',
    state: combinedState,
  });
  return `https://www.strava.com/oauth/authorize?${params.toString()}`;
}

export function isStravaConfigured(): boolean {
  return Boolean(stravaClientId && stravaClientSecret);
}

export function getStravaEnvRedirectUri(): string {
  return stravaRedirectUri;
}

interface StravaTokenResponse {
  token_type: string;
  expires_at: number;
  expires_in: number;
  refresh_token: string;
  access_token: string;
  athlete: {
    id: number;
    firstname: string;
    lastname: string;
  };
}

export async function exchangeCodeForToken(code: string): Promise<StravaTokenResponse> {
  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: stravaClientId,
      client_secret: stravaClientSecret,
      code,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Strava OAuth error: ${response.status} - ${errorText}`);
  }

  return response.json() as Promise<StravaTokenResponse>;
}

export interface RefreshedTokenResponse {
  token_type: string;
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
}

export async function refreshAccessToken(refreshToken: string): Promise<RefreshedTokenResponse> {
  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: stravaClientId,
      client_secret: stravaClientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Strava token refresh error: ${response.status} - ${errorText}`);
  }

  return response.json() as Promise<RefreshedTokenResponse>;
}

export interface StravaActivity {
  id: number;
  name: string;
  distance: number;
  start_date: string;
  type: string;
  has_heartrate?: boolean;
}

export async function getAthleteActivities(
  accessToken: string,
  opts?: { after?: number; before?: number; perPage?: number }
): Promise<StravaActivity[]> {
  const params = new URLSearchParams();
  params.set('per_page', String(opts?.perPage ?? 30));
  if (opts?.after) params.set('after', String(opts.after));
  if (opts?.before) params.set('before', String(opts.before));
  const response = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new StravaAuthError('Access token expired or invalid');
    }
    const errorText = await response.text();
    throw new Error(`Strava API error: ${response.status} - ${errorText}`);
  }

  return response.json() as Promise<StravaActivity[]>;
}

interface StravaStreams {
  latlng?: { data: [number, number][] };
  time?: { data: number[] };
  altitude?: { data: number[] };
}

export class StravaAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StravaAuthError';
  }
}

export async function getActivityStreams(accessToken: string, activityId: number): Promise<StravaStreams> {
  const response = await fetch(
    `https://www.strava.com/api/v3/activities/${activityId}/streams?keys=latlng,time,altitude&key_by_type=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new StravaAuthError('Access token expired or invalid');
    }
    const errorText = await response.text();
    throw new Error(`Strava streams API error: ${response.status} - ${errorText}`);
  }

  return response.json() as Promise<StravaStreams>;
}

export function buildGPXFromStreams(
  streams: StravaStreams,
  activityName: string,
  startDate?: string
): string {
  const latlng = streams.latlng?.data ?? [];
  const times = streams.time?.data ?? [];
  const altitudes = streams.altitude?.data ?? [];

  const baseTimeMs = startDate ? new Date(startDate).getTime() : 0;

  const points: string[] = [];
  const count = Math.min(latlng.length, times.length);

  for (let i = 0; i < count; i++) {
    const [lat, lon] = latlng[i];
    const time = new Date(baseTimeMs + times[i] * 1000).toISOString();
    const ele = altitudes[i] != null ? `<ele>${altitudes[i].toFixed(1)}</ele>` : '';
    points.push(
      `      <trkpt lat="${lat}" lon="${lon}">${ele ? `\n        ${ele}` : ''}
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
${points.join('\n')}
    </trkseg>
  </trk>
</gpx>`;
}

export async function initStravaCredentials(): Promise<void> {
  const { getStravaConfig } = await import('./db');
  const config = await getStravaConfig();
  if (config) {
    if (!stravaClientId) {
      stravaClientId = config.client_id;
      stravaClientSecret = config.client_secret;
    }
    if (!stravaRedirectUri) {
      stravaRedirectUri = config.redirect_uri || '';
    }
  }
}

export async function setStravaCredentials(clientId?: string, clientSecret?: string, redirectUri?: string): Promise<void> {
  if (clientId) stravaClientId = clientId;
  if (clientSecret) stravaClientSecret = clientSecret;
  stravaRedirectUri = redirectUri || '';
  const { setStravaConfig } = await import('./db');
  await setStravaConfig(clientId || '', clientSecret || '', redirectUri);
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
