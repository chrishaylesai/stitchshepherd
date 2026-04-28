# StitchHarbor

Web application for creating, sharing, and exporting cross-stitch patterns.

## Local Setup

1. Install dependencies:

   ```sh
   pnpm install
   ```

2. Create local environment values:

   ```sh
   cp .env.example .env
   openssl rand -base64 32
   ```

   Put the generated value in `AUTH_SECRET`.

3. Fill in email delivery values for Auth.js magic links:

   ```sh
   RESEND_API_KEY="re_..."
   EMAIL_FROM="StitchHarbor <verified-sender@example.com>"
   ```

   `EMAIL_FROM` must use a sender/domain verified in Resend.

4. Start local infrastructure and the Next.js app:

   ```sh
   docker compose -f docker/docker-compose.yml up
   ```

5. Apply database migrations:

   ```sh
   pnpm db:migrate
   ```

## Verification

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```
