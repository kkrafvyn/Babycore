# Docker

Cradlyn ships as one production container that serves the built React app and the Express API from port `3000`.

## Docker Compose

```powershell
Copy-Item .env.docker.example .env.docker
docker compose --env-file .env.docker up --build
```

Open `http://localhost:3000` when the container is healthy.

## Docker CLI

```powershell
docker build `
  --build-arg VITE_API_BASE_URL=/api `
  --build-arg VITE_API_BASE_URL_PROD=/api `
  --build-arg VITE_SUPABASE_URL=https://your-project.supabase.co `
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key `
  -t cradlyn:local .

docker run --rm --env-file .env.docker -p 3000:3000 cradlyn:local
```

## Notes

- Public `VITE_` values are baked into the frontend during `docker build`; rebuild the image when those change.
- Server secrets such as `SUPABASE_SERVICE_KEY`, payment keys, email keys, and `OPENAI_API_KEY` are runtime environment variables.
- The health endpoint is `http://localhost:3000/health`.
