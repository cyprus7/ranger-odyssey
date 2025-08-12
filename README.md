# GeoQuests Mini App

Next.js + NestJS, нижнее меню из 5 кнопок (активна "Quests"), запуск через docker-compose.
См. также директорию `infra/` — Helm chart и манифесты для k3s + ArgoCD + External Secrets.

## Быстрый старт (docker-compose)

1. Скопируй `.env.example` в `.env` и при необходимости поправь значения.
2. Запусти:
   ```bash
   docker compose up -d --build
   ```
3. Открой http://localhost:8080 (фронт). Бэкенд: http://localhost:3001/api/quests

## Telegram Bot (BotFather)
- Имя: **Ranger Odyssey**; username: **@RangerOdysseyBot** (или свободный).
- Кнопка WebApp с URL вашего фронта (домен/локальный туннель).

## K8s (k3s) кратко
- См. `infra/` + файлы ArgoCD в `infra/argocd/`.
- В `infra/envs/*/values.yaml` устанавливается тег образа (GitOps).
