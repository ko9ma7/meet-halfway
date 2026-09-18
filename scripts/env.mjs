import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { PUBLIC_DEFAULTS } from './public-defaults.mjs';

export async function loadProjectEnv(root) {
  const values = { ...process.env };
  const envPath = resolve(root, '.env');
  if (existsSync(envPath)) {
    const text = await readFile(envPath, 'utf8');
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq < 1) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      if (!(key in process.env) || String(process.env[key] ?? '').trim() === '') values[key] = value;
    }
  }

  // Public defaults guarantee that a manual GitHub Pages build still has the
  // browser-safe configuration even if Repository Variables were not created.
  for (const [key, value] of Object.entries(PUBLIC_DEFAULTS)) {
    if (String(values[key] ?? '').trim() === '') values[key] = value;
  }
  return values;
}

export function runtimeConfig(env) {
  return {
    mapProvider: env.MAP_PROVIDER || PUBLIC_DEFAULTS.MAP_PROVIDER,
    googleMapsApiKey: env.GOOGLE_MAPS_API_KEY || PUBLIC_DEFAULTS.GOOGLE_MAPS_API_KEY,
    kakaoMapsJavaScriptKey: env.KAKAO_MAPS_JAVASCRIPT_KEY || PUBLIC_DEFAULTS.KAKAO_MAPS_JAVASCRIPT_KEY,
    supabaseUrl: env.SUPABASE_URL || PUBLIC_DEFAULTS.SUPABASE_URL,
    supabasePublishableKey: env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY || PUBLIC_DEFAULTS.SUPABASE_PUBLISHABLE_KEY,
    geocodingCountryCodes: env.GEOCODING_COUNTRY_CODES || PUBLIC_DEFAULTS.GEOCODING_COUNTRY_CODES,
    overpassRadiusMeters: Number(env.OVERPASS_RADIUS_METERS || PUBLIC_DEFAULTS.OVERPASS_RADIUS_METERS),
    defaultLanguage: env.DEFAULT_LANGUAGE || PUBLIC_DEFAULTS.DEFAULT_LANGUAGE,
    defaultStyle: env.DEFAULT_STYLE || PUBLIC_DEFAULTS.DEFAULT_STYLE
  };
}
