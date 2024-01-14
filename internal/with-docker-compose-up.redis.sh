#!/bin/bash
set -e

docker-compose -f docker-compose.redis.yml up --quiet-pull -d

for i in $(seq 1 20); do
  docker-compose -f docker-compose.redis.yml ps | grep -q healthy && break
  sleep 1
done

export REDISCLI_AUTH=bitnami
eval "$@"
