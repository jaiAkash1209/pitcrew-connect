# PitCrew Connect

Static front-end MVP plus a deployable Node/Express API for bookings, mechanic onboarding, verification, and job acceptance.

## Run locally

Install dependencies and start the server from the project root.

Local development works in two modes:

- without `DATABASE_URL`: JSON fallback storage in `data/*.json`
- with `DATABASE_URL`: PostgreSQL storage for durable records

Production rule:

- in production, the server now requires `DATABASE_URL`
- if `DATABASE_URL` is missing, the app will not start
- this prevents hosted deployments from silently using non-permanent JSON files

Run:

```powershell
npm install
npm start
```

Then open:

- `http://localhost:8080/`

## Available endpoints

- `POST /api/bookings`
- `GET /api/bookings`
- `PATCH /api/bookings/:id/accept`
- `POST /api/mechanics`
- `GET /api/mechanics`
- `PATCH /api/mechanics/:id`
- `PATCH /api/mechanics/:id/verification`
- `POST /api/users/register`
- `GET /api/users`
- `PATCH /api/users/:id`
- `DELETE /api/users/:id`
- `POST /api/login`
- `POST /api/password/reset`
- `GET /api/tracking`
- `POST /api/tracking/update`
- `GET /api/tracking/matches`
- `DELETE /api/mechanics/:id`
- `DELETE /api/bookings/:id`

Local JSON fallback records are stored in:

- `data/bookings.json`
- `data/mechanics.json`
- `data/users.json`
- `data/tracking.json`

## Deploy on Render

This repo includes `render.yaml` for a web service plus PostgreSQL database deployment.

1. Push this project to GitHub.
2. Create a new Render service from the repo.
3. Render will provision:
   - a PostgreSQL database
   - a `DATABASE_URL` environment variable on the web service
4. Render will use:
   - `buildCommand`: `npm install`
   - `startCommand`: `npm start`

Important:

- deployed accounts and records persist only when `DATABASE_URL` is configured
- if `DATABASE_URL` is missing, the app falls back to local JSON files, which are not durable on hosted deployments
- admin is the only role allowed to delete users, mechanics, and bookings through the app
