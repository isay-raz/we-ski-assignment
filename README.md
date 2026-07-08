# WeSki — Hotel Search API

A REST API for searching ski-resort hotel availability. Built with Node.js + TypeScript + Express, backed by Redis.

## Requirements

- Node.js ≥ 18
- Docker (for Redis)

## Run

### With Docker (app + Redis)

```bash
docker compose up -d --build   # builds and runs the API + Redis
```

The API is available on http://localhost:3000. Stop it with `docker compose down`.

### Locally (Redis in Docker, app from source)

```bash
docker compose up -d redis     # start Redis on localhost:6379
npm install
npm run dev                    # http://localhost:3000
```

Production build:

```bash
npm run build
npm start
```

Configuration is optional — see [`.env.example`](.env.example) for tunables (port, max group size, provider timeouts, Redis URL, TTL, log level).

## Test

```bash
docker compose up -d redis   # Redis must be running
npm test
```

## Endpoints

### `POST /search`

Starts a search and returns an id.

Request body:

```json
{
  "ski_site": 1,
  "from_date": "03/04/2025",
  "to_date": "03/11/2025",
  "group_size": 2
}
```

- `ski_site` — id of a known ski resort (see table below).
- `from_date` / `to_date` — `MM/DD/YYYY`, a valid ordered range.
- `group_size` — positive integer.

Ski sites:

| id | name |
|----|------|
| 1  | Val Thorens |
| 2  | Courchevel |
| 3  | Tignes |
| 4  | La Plagne |
| 5  | Chamonix |

Response `201`:

```json
{ "id": "eyJza2lfc2l0ZSI6MSwi..." }
```

### `GET /search/:id`

Returns the results available so far. Poll it until `status` is `completed`.

Response `200`:

```json
{
  "status": "in_progress | completed | failed",
  "progress": { "completed": 1, "total": 3 },
  "count": 3,
  "accommodations": [
    {
      "hotelCode": "PWHSTABAN",
      "hotelName": "Hotel Banyan",
      "images": { "main": "https://...", "all": ["https://..."] },
      "location": {
        "latitude": 46.93,
        "longitude": 10.99,
        "distances": [{ "type": "ski_lift", "distance": "240m" }]
      },
      "rating": 5,
      "beds": 4,
      "price": { "afterTax": 328.34, "beforeTax": 309.25 },
      "capacity": 4,
      "provider": "dummy"
    }
  ]
}
```

### `GET /health`

Returns `{ "status": "ok" }`.

## Example

```bash
ID=$(curl -s -X POST localhost:3000/search -H 'Content-Type: application/json' \
  -d '{"ski_site":1,"from_date":"03/04/2025","to_date":"03/11/2025","group_size":2}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')

curl -s "localhost:3000/search/$ID"   # repeat until status == completed
```
