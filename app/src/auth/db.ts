/**
 * @license
 * SPDX-License-Identifier: GPL-3.0-only
 */

import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'app.db');

let db: SqlJsDatabase;
let initPromise: Promise<SqlJsDatabase> | null;

export interface UserRow {
  id: number;
  strava_athlete_id: number;
  firstname: string;
  lastname: string;
  access_token: string;
  refresh_token: string;
  expires_at: number;
  created_at: string;
  updated_at: string;
}

export interface StravaConfigRow {
  id: number;
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  updated_at: string;
}

async function initDb(): Promise<SqlJsDatabase> {
  if (db) return db;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const SQL = await initSqlJs();

    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(DB_PATH)) {
      const buffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
    }

    db.run('PRAGMA journal_mode = WAL');

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
    } catch {} // column may already exist

    return db;
  })();

  return initPromise;
}

function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

function getDbSync(): SqlJsDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return db;
}

export async function upsertUser(
  stravaAthleteId: number,
  firstname: string,
  lastname: string,
  accessToken: string,
  refreshToken: string,
  expiresAt: number
): Promise<UserRow> {
  const d = await initDb();
  const existing = d.exec('SELECT id FROM users WHERE strava_athlete_id = ?', [stravaAthleteId]);

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

  const result = d.exec('SELECT * FROM users WHERE strava_athlete_id = ?', [stravaAthleteId]);
  if (result.length === 0 || result[0].values.length === 0) {
    throw new Error('Failed to retrieve user after upsert');
  }

  return rowToUser(result[0]);
}

export async function findUserByAthleteId(stravaAthleteId: number): Promise<UserRow | undefined> {
  const d = await initDb();
  const result = d.exec('SELECT * FROM users WHERE strava_athlete_id = ?', [stravaAthleteId]);
  if (result.length === 0 || result[0].values.length === 0) return undefined;
  return rowToUser(result[0]);
}

export async function findUserById(id: number): Promise<UserRow | undefined> {
  const d = await initDb();
  const result = d.exec('SELECT * FROM users WHERE id = ?', [id]);
  if (result.length === 0 || result[0].values.length === 0) return undefined;
  return rowToUser(result[0]);
}

export async function deleteUser(id: number): Promise<void> {
  const d = await initDb();
  d.run('DELETE FROM users WHERE id = ?', [id]);
  saveDb();
}

export async function updateTokens(
  userId: number,
  accessToken: string,
  refreshToken: string,
  expiresAt: number
): Promise<void> {
  const d = await initDb();
  d.run(
    `UPDATE users SET access_token = ?, refresh_token = ?, expires_at = ?, updated_at = datetime('now') WHERE id = ?`,
    [accessToken, refreshToken, expiresAt, userId]
  );
  saveDb();
}

export async function getStravaConfig(): Promise<StravaConfigRow | undefined> {
  const d = await initDb();
  const result = d.exec('SELECT * FROM strava_config WHERE id = 1');
  if (result.length === 0 || result[0].values.length === 0) return undefined;
  return rowToStravaConfig(result[0]);
}

export async function setStravaConfig(clientId: string, clientSecret: string, redirectUri?: string): Promise<void> {
  const d = await initDb();
  const existing = await getStravaConfig();
  const finalClientId = clientId || existing?.client_id || '';
  const finalClientSecret = clientSecret || existing?.client_secret || '';
  const finalRedirectUri = redirectUri !== undefined ? redirectUri : (existing?.redirect_uri || '');
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

function rowToStravaConfig(row: { columns: string[]; values: any[][] }): StravaConfigRow {
  const cols = row.columns;
  const vals = row.values[0];
  return {
    id: vals[cols.indexOf('id')],
    client_id: vals[cols.indexOf('client_id')],
    client_secret: vals[cols.indexOf('client_secret')],
    redirect_uri: vals[cols.indexOf('redirect_uri')] || '',
    updated_at: vals[cols.indexOf('updated_at')],
  };
}

function rowToUser(row: { columns: string[]; values: any[][] }): UserRow {
  const cols = row.columns;
  const vals = row.values[0];
  return {
    id: vals[cols.indexOf('id')],
    strava_athlete_id: vals[cols.indexOf('strava_athlete_id')],
    firstname: vals[cols.indexOf('firstname')],
    lastname: vals[cols.indexOf('lastname')],
    access_token: vals[cols.indexOf('access_token')],
    refresh_token: vals[cols.indexOf('refresh_token')],
    expires_at: vals[cols.indexOf('expires_at')],
    created_at: vals[cols.indexOf('created_at')],
    updated_at: vals[cols.indexOf('updated_at')],
  };
}
