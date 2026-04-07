# PitCrew Connect

Static front-end MVP plus a deployable Node/Express API for bookings, mechanic onboarding, verification, and job acceptance.

## Run locally

Install dependencies and start the server from the project root.

Local development works in two modes:

- without `DATABASE_URL`: JSON storage on your computer system
- with `DATABASE_URL`: PostgreSQL storage for durable records

When you run locally on Windows, the app now stores records here by default:

- `%LOCALAPPDATA%\PitCrewConnect\data`

Example path:

- `C:\Users\<your-user>\AppData\Local\PitCrewConnect\data`

You can override that location with:

- `LOCAL_DATA_DIR`

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

Local computer storage files are stored in:

- `bookings.json`
- `mechanics.json`
- `users.json`
- `tracking.json`

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
- production now also requires `SESSION_SECRET` for signed login sessions
- set `SESSION_SECRET` in Render to a long random value before deploying the secured build
