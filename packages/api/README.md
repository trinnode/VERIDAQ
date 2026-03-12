# @veridaq/api deployment notes

## Can this backend run on Vercel?

Partially.

- HTTP API routes can run as Vercel Functions.
- Always-on BullMQ workers cannot run on Vercel because Vercel Functions are request-driven and ephemeral.

With the current architecture, use one of these:

1. **Recommended:** Frontends on Vercel, API + worker on a service that supports long-running processes.
2. **MVP fallback:** API on Vercel and temporarily disable queue-dependent flows (batch processing) until a worker host is added.

## Minimum production requirements (current code)

- Postgres (managed)
- Redis (managed)
- API process
- Worker process (`pnpm --filter @veridaq/api worker`)

## If you still deploy API on Vercel

- Keep Postgres/Redis external.
- Set all API env vars in Vercel project settings.
- Set `DISABLE_QUEUE=true` on Vercel to keep non-queue routes working cleanly.
- Expect queue jobs to stall unless a worker runs elsewhere.

## Vercel setup (step by step)

1. Create a new Vercel project and set Root Directory to `packages/api`.
	- After this step: project import succeeds and Vercel detects `vercel.json` in this folder.

2. Add environment variables in Vercel:
	- Required: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `CIRCUIT_WASM_PATH`, `CIRCUIT_ZKEY_PATH`, `VERIFICATION_KEY_PATH`, `DISABLE_QUEUE=true`.
	- After this step: build and runtime config validation should pass.

3. Deploy the API project.
	- After this step: `GET /health` should return `{ status: "ok" }`.

4. Point each frontend (`apps/web`, `apps/portal`, `apps/verify`, `apps/console`) `NEXT_PUBLIC_API_URL` to this API URL and redeploy.
	- After this step: auth/profile/read routes should work through Vercel.

5. Run the worker outside Vercel (Render/Fly/cheap VPS) with the same env, but `DISABLE_QUEUE=false`.
	- After this step: batch uploads and queue processing complete end-to-end.
