# Format Requests

Format Requests is a lightweight full-stack app for collecting, ranking, and managing requests for new media asset formats—such as image, audio, or video variations—that a studio should support next. Contributors can browse the catalog, filter by asset type or status, and upvote the additions they are most excited about. Admins can switch into management mode to add new formats, update their lifecycle status, or remove entries altogether, and everyone sees live vote updates streamed in real time.

## Project structure

- **Client** – React single-page app built with Parcel (`src/`).
- **Server** – Express + TypeScript API in `server.ts` that also serves the compiled client from `dist/`.
- **Database assets** – SQL migration and seed scripts in `init_db.sql` and `seed_db.sql` for PostgreSQL.

## Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL 14+

## Installation

```bash
npm install
```

## Database setup

1. Create a PostgreSQL database and export its connection string as `DATABASE_URL`.
2. Initialize the schema:
   ```bash
   npm run migrate
   ```
3. (Optional) Load sample data:
   ```bash
   npm run seed
   ```

## Running in development

The API and the client run as separate processes during development. The client automatically proxies API requests to `http://localhost:3000` when running on `localhost`.

1. Start the API (requires `DATABASE_URL` and optional `ADMIN_KEY`):
   ```bash
   npm run dev
   ```
2. In a separate terminal, start the Parcel dev server for the React app:
   ```bash
   npm run client:start
   ```
3. Visit `http://localhost:1234` in your browser.

### Admin access in development

Administrative actions (creating formats, updating status, deleting formats) require an admin key. By default the client expects the key `change-me`. You can either:

- Set `ADMIN_KEY=change-me` before starting the API, or
- Change the `ADMIN_KEY` constant inside `src/App.tsx` to match your chosen key.

## Production build

Create a production bundle for both the client and the server:

```bash
npm run build
```

This command compiles the React app into `dist/client` and emits the server bundle to `dist/server.js`. You can then launch the server with the same environment variables as development:

```bash
npm start
```

The Express server serves both the API and the static client from the `dist` folder.

## Environment variables

| Variable      | Description                                                                     |
| ------------- | ------------------------------------------------------------------------------- |
| `DATABASE_URL`| **Required.** PostgreSQL connection string.                                     |
| `ADMIN_KEY`   | Optional. Secret string required for admin endpoints (`change-me` by default).  |
| `PORT`        | Optional. HTTP port for the API (defaults to `3000`).                           |

## Features

- Browse and search media-format requests with filters for asset type, status, and sort order.
- Upvote requests once per device, with instant local feedback and live updates via Server-Sent Events.
- Persist requests locally for offline-first behavior, with automatic refresh from the API when online.
- Admin dashboard to add new asset formats, change their status, or delete them entirely.

## License

This project is provided as-is for demonstration purposes. No specific license has been chosen yet.
