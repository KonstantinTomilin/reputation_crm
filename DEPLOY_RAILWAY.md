# Deploy to Railway

## What is configured

- `railway.json`:
  - build: `npm ci && npm run build`
  - start: `npm run start`
- `npm run start` launches `scripts/serve-static.mjs`
- static output folder: `out` (already used by Vite config)

## Environment variables

- `PORT` is provided by Railway automatically.
- Optional:
  - `VITE_CRM_DATA_MODE=localStorage` (default behavior in current stage)

## Railway steps

1. Create a new project in Railway.
2. Connect this GitHub repository/branch.
3. Ensure the service is configured as a Node app.
4. Deploy.

## Local production check

```bash
npm ci
npm run build
npm run start
```

Open: `http://localhost:3000` (or custom `PORT`).
