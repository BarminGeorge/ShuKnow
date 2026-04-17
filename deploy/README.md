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
- `GRAFANA_ADMIN_PASSWORD`

## 2. Первичный выпуск TLS-сертификата Let's Encrypt

Первичный выпуск вынесен в GitHub Actions workflow:

- `.github/workflows/issue-initial-ssl.yml`
- запуск: `Actions -> Issue Initial SSL Certificate -> Run workflow`

Перед запуском настройте repository secrets:

- `PROD_SSH_HOST`
- `PROD_SSH_PORT`
- `PROD_SSH_USER`
- `PROD_SSH_PRIVATE_KEY`
- `PROD_DEPLOY_PATH`

На сервере в `PROD_DEPLOY_PATH` должен лежать корректно заполненный `.env.prod`.

Ручной fallback (если нужно):

```bash
set -a && . ./.env.prod && set +a
docker compose --env-file .env.prod -f compose.prod.yaml up -d nginx
docker compose --env-file .env.prod -f compose.prod.yaml run --rm certbot certonly --webroot -w /var/www/certbot --email "$LETSENCRYPT_EMAIL" --agree-tos --no-eff-email -d "$SERVER_NAME"
docker compose --env-file .env.prod -f compose.prod.yaml up -d nginx certbot
```

## 3. Запуск production-стека

```bash
docker compose --env-file .env.prod -f compose.prod.yaml up -d
```

## 4. Мониторинг (опционально)

Prometheus и Grafana в `compose.prod.yaml` вынесены в профиль `monitoring`.

```bash
docker compose --env-file .env.prod -f compose.prod.yaml --profile monitoring up -d
```

## 5. Обновление образа backend из GHCR

```bash
docker compose --env-file .env.prod -f compose.prod.yaml pull backend
docker compose --env-file .env.prod -f compose.prod.yaml up -d backend
```

## 6. Публикация Docker-образа в GHCR

Workflow: `.github/workflows/publish-docker-ghcr.yml`

- Публикация автоматически на тегах `v*.*.*`
- Также доступен ручной запуск через `workflow_dispatch`
