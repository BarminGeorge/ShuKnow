#!/bin/sh
set -eu

printf '%s:{PLAIN}%s\n' "$PROMETHEUS_BASIC_AUTH_USER" "$PROMETHEUS_BASIC_AUTH_PASSWORD" > /etc/nginx/prometheus.htpasswd
