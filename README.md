# Property Management

## Local development

Requires Node 20+, pnpm and Docker (with Compose).

```bash
pnpm install
cp apps/site/.env.example apps/site/.env
docker compose up -d --wait postgres
docker compose exec postgres createdb -U postgres property_management_sites
pnpm dev
```

Open http://localhost:3000/admin and choose **Dev sign-in**.

This starts an empty Site. Demo content is optional: see `apps/site/scripts/seed.ts`.
