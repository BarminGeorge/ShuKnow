# Nginx deployment modes

## Dev mode (no TLS certificates)

Start local reverse proxy on HTTP only:

`docker compose -f compose.dev.yaml up -d nginx`

Default upstream in dev mode: `host.docker.internal:5209`.

## Prod mode (HTTPS + Let's Encrypt)

1. Create `.env.web` from `.env.web.example` and set:
   - `SERVER_NAME`
   - `LETSENCRYPT_EMAIL`
   - `BACKEND_UPSTREAM`
2. Get initial certificate:
   - `docker compose --env-file .env.web -f compose.prod.yaml run --rm certbot certonly --webroot -w /var/www/certbot --email "$LETSENCRYPT_EMAIL" --agree-tos --no-eff-email -d "$SERVER_NAME"`
3. Start prod proxy:
   - `docker compose --env-file .env.web -f compose.prod.yaml up -d nginx certbot`

Nginx includes:
- HTTP->HTTPS redirect in prod;
- reverse proxy with `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`;
- security headers (`HSTS`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `CSP`, `Permissions-Policy`, `COOP`, `CORP`);
- API DDoS mitigation via request/connection limits;
- WebSocket support on `/hubs/`;
- buffering and proxy timeouts for slow clients;
- performance logging with `$request_time` and `$upstream_response_time`.
