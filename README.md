## Getting Started

1) Install dependencies:

```bash
npm install
```

2) Configure environment variables:

```bash
cp .env.example .env.local
```

Update `.env.local` with:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3) Run the development server:

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) with your browser to see the result.

## Supabase Health Check

After setting env vars, verify Supabase wiring with:

- [http://localhost:3001/api/supabase/health](http://localhost:3001/api/supabase/health)

Expected:

```json
{ "ok": true, "message": "Supabase connection configured" }
```

If values are missing or invalid, the endpoint returns a clear error.

## Notes

- `src/lib/supabase.ts` now holds shared Supabase client config for browser and server usage.
- `src/utils/supabase/client.ts` reuses the shared browser client helper.

