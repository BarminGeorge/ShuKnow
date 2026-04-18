# ShuKnow deployment

## 1. Подготовка env-файла

Скопируйте шаблон и заполните секреты:

```bash
cp .env.prod.example .env.prod
```

Минимально обязательно задать:

- `SERVER_NAME`
- `LETSENCRYPT_EMAIL`
- `JWT_KEY`
- `ENCRYPTION_KEY`
- `POSTGRES_PASSWORD`
- `REDIS_PASSWORD`
- `GRAFANA_ADMIN_PASSWORD`
- `BACKEND_UPSTREAM`
- `FRONTEND_UPSTREAM`
- `BACKEND_IMAGE`
- `FRONTEND_IMAGE`
- `PROMETHEUS_BASIC_AUTH_USER`
- `PROMETHEUS_BASIC_AUTH_PASSWORD`

## 2. Запуск production-стека (включая авто-получение первого SSL)

```bash
docker compose --env-file .env.prod -f compose.prod.yaml up -d
```

При первом старте сертификат запрашивается автоматически сервисом `certbot-init`, после чего запускается nginx с HTTPS.
`certbot-init` использует standalone HTTP-01 и требует, чтобы порт 80 на сервере был доступен извне для Let's Encrypt.

## 3. Мониторинг
Prometheus и Grafana запускаются этой же командой вместе со всем остальным стеком.

- Grafana доступна только через основной домен: `https://<SERVER_NAME>/monitoring/`
- Вход только по `GRAFANA_ADMIN_USER` / `GRAFANA_ADMIN_PASSWORD`
- Prometheus доступен через `https://<SERVER_NAME>/monitoring/prometheus/` и защищён Basic Auth (`PROMETHEUS_BASIC_AUTH_USER` + `PROMETHEUS_BASIC_AUTH_PASSWORD`)
- Прямые внешние порты `3000/9090` не публикуются

## 4. Обновление образов из GHCR

```bash
docker compose --env-file .env.prod -f compose.prod.yaml pull backend frontend
docker compose --env-file .env.prod -f compose.prod.yaml up -d backend frontend
```

## 5. Публикация Docker-образов в GHCR

Workflow: `.github/workflows/publish-docker-ghcr.yml`

- Публикация автоматически на тегах `v*.*.*`
- Также доступен ручной запуск через `workflow_dispatch`
- Публикуются два образа:
  - `ghcr.io/<owner>/<repo>` (backend)
  - `ghcr.io/<owner>/<repo>-frontend` (frontend)

## 6. Локальный запуск без SSL и без GHCR

Для localhost используйте override:

```bash
docker compose --env-file .env.prod -f compose.prod.yaml -f compose.override.yaml up -d --build
```

Этот режим:

- не запускает `certbot-init` и `certbot`;
- использует локально собранные образы (`shuknow-backend-local`, `shuknow-frontend-local`);
- поднимает nginx только на `http://localhost` без TLS.
- для мониторинга используйте прямые URL:
  - Grafana: `http://localhost:3000`
  - Prometheus: `http://localhost:9090`
  - маршруты nginx `/monitoring` и `/monitoring/prometheus` делают редирект на эти порты.
