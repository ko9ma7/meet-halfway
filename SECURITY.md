# Security

MeetHalfway is a static GitHub Pages application. Any configuration required by browser JavaScript is observable by visitors. Security therefore relies on **least-privilege browser keys and server-side authorization**, not on hiding frontend strings.

## Browser-safe public configuration

The deployed application contains:

- Kakao Maps JavaScript key
- Supabase Project URL
- Supabase Publishable key

These values are intentionally treated as public. Kakao should additionally restrict the JavaScript SDK key to the approved website origin.

## Never commit or ship

Do not add any of the following to this repository or browser bundle:

- Supabase `sb_secret_...` keys
- Supabase `service_role` key
- Database passwords / connection strings containing passwords
- GitHub PATs
- Private encryption keys
- Personal administrator credentials

## Supabase access model

`supabase/schema.sql` enables RLS on the data tables and revokes direct table privileges from browser roles. Browser clients use a small set of `SECURITY DEFINER` RPC functions instead.

- meeting creation: allowed through `create_meeting`
- meeting lookup: requires an unguessable share ID
- participant update: bound to a random participant token whose hash is stored
- early close: requires a random administrator token whose hash is stored

Plain administrator/participant tokens remain only in the browser local storage used by that user.

## Share-link privacy

Anyone who receives a meeting share URL can see the starting locations in that meeting. The UI therefore recommends stations, buildings, or landmarks rather than exact home addresses. New share IDs use 96 bits of randomness.

## Abuse / production scale

The current architecture is designed for small private groups. If the service becomes public/high-traffic, add rate limiting or CAPTCHA through a server-side/Edge Function write gateway before allowing unrestricted anonymous meeting creation.
