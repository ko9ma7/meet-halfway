import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export async function loadProjectEnv(root) {
  const values = { ...process.env };
  const envPath = resolve(root, '.env');
  if (!existsSync(envPath)) return values;
  const text = await readFile(envPath, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!(key in process.env)) values[key] = value;
  }
  return values;
}

export function runtimeConfig(env) {
  return {
    mapProvider: env.MAP_PROVIDER || 'osm',
    googleMapsApiKey: env.GOOGLE_MAPS_API_KEY || '',
    kakaoMapsJavaScriptKey: env.KAKAO_MAPS_JAVASCRIPT_KEY || '',
    supabaseUrl: env.SUPABASE_URL || '',
    supabaseAnonKey: env.SUPABASE_ANON_KEY || '',
    geocodingCountryCodes: env.GEOCODING_COUNTRY_CODES || 'kr',
    overpassRadiusMeters: Number(env.OVERPASS_RADIUS_METERS || 2500),
    defaultLanguage: env.DEFAULT_LANGUAGE || 'auto',
    defaultStyle: env.DEFAULT_STYLE || 'aurora'
  };
}
