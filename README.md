# PitCrew Connect

Static front-end MVP plus a deployable Node/Express API for bookings and mechanic onboarding.

## Run locally

Install dependencies and start the server from the project root:

```powershell
npm install
npm start
```

Then open:

- `http://localhost:8080/`

## Available endpoints

- `POST /api/bookings`
- `GET /api/bookings`
- `POST /api/mechanics`
- `GET /api/mechanics`

Submitted records are stored in:

- `data/bookings.json`
- `data/mechanics.json`

## Deploy on Render

This repo includes `render.yaml` for a simple web service deployment.

1. Push this project to GitHub.
2. Create a new Render service from the repo.
3. Render will use:
   - `buildCommand`: `npm install`
   - `startCommand`: `npm start`

Note: the current app stores data in local JSON files, which is fine for MVP demos but not durable production storage.
