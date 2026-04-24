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

Рекомендуется сразу задать retention метрик Prometheus (чтобы не потерять историю через несколько недель/месяцев):

- `PROMETHEUS_RETENTION_TIME` (например `365d`, `730d`)

## 2. Запуск production-стека (включая авто-получение первого SSL)

```bash
docker compose --env-file .env.prod -f compose.prod.yaml up -d
```

При первом старте сертификат запрашивается автоматически сервисом `certbot-init`, после чего запускается nginx с HTTPS.
`certbot-init` использует standalone HTTP-01 и требует, чтобы порт 80 на сервере был доступен извне для Let's Encrypt.

## 3. Применение миграций вручную

One-shot сервис `migrator` не запускается автоматически. Применяйте миграции отдельной командой:

```bash
docker compose --env-file .env.prod -f compose.prod.yaml up migrator
```

После успешного завершения `migrator` можно запускать или перезапускать backend:

```bash
docker compose --env-file .env.prod -f compose.prod.yaml up -d backend
```

## 4. Мониторинг
Prometheus и Grafana запускаются этой же командой вместе со всем остальным стеком.

- Grafana доступна только через основной домен: `https://<SERVER_NAME>/monitoring/`
- Вход только по `GRAFANA_ADMIN_USER` / `GRAFANA_ADMIN_PASSWORD`
- Prometheus доступен через `https://<SERVER_NAME>/monitoring/prometheus/` и защищён Basic Auth (`PROMETHEUS_BASIC_AUTH_USER` + `PROMETHEUS_BASIC_AUTH_PASSWORD`)
- Прямые внешние порты `3000/9090` не публикуются

История в Grafana сохраняется настолько, насколько Prometheus хранит TSDB на томе `prometheus-data`.  
Чтобы видеть графики "за всё время", используйте достаточно большое значение `PROMETHEUS_RETENTION_TIME` (например `365d`+) и не удаляйте volume `prometheus-data`.

Быстрая проверка retention после запуска:

```bash
docker compose --env-file .env.prod -f compose.prod.yaml -f compose.override.yaml exec prometheus wget -qO- http://127.0.0.1:9090/api/v1/status/flags
```

В ответе должен быть `storage.tsdb.retention.time` с ожидаемым значением.

## 5. Обновление образов из GHCR

```bash
docker compose --env-file .env.prod -f compose.prod.yaml pull backend frontend
docker compose --env-file .env.prod -f compose.prod.yaml up -d backend frontend
```

## 6. Публикация Docker-образов в GHCR

Workflow: `.github/workflows/publish-docker-ghcr.yml`

- Публикация автоматически на тегах `v*.*.*`
- Также доступен ручной запуск через `workflow_dispatch`
- Публикуются два образа:
  - `ghcr.io/<owner>/<repo>` (backend)
  - `ghcr.io/<owner>/<repo>-frontend` (frontend)

## 7. Локальный запуск без SSL и без GHCR

Для localhost используйте override:

```bash
docker compose --env-file .env.prod -f compose.prod.yaml -f compose.override.yaml up -d --build
```

Для миграции:

```bash
docker compose --env-file .env.prod -f compose.prod.yaml -f compose.override.yaml up migrator --build
```

Этот режим:

- не запускает `certbot-init` и `certbot`;
- использует локально собранные образы (`shuknow-backend-local`, `shuknow-frontend-local`);
- backend использует `rustfs` (S3-совместимое хранилище) с локальными тестовыми credentials;
- поднимает nginx только на `http://localhost` без TLS.
- для мониторинга используйте прямые URL:
  - Grafana: `http://localhost:3000`
  - Prometheus: `http://localhost:9090`
  - маршруты nginx `/monitoring` и `/monitoring/prometheus` делают редирект на эти порты.
