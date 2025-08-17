# Gateway API setup for quests.tmbot.cc

1) Install Envoy Gateway (NodePort 32443)
   helm repo add envoyproxy https://charts.envoyproxy.io
   helm repo update
   kubectl create ns envoy-gateway
   helm upgrade --install eg envoyproxy/gateway-helm -n envoy-gateway -f infra/gateway/eg-values.yaml

2) Namespaces & ArgoCD
   kubectl create ns sandbox || true
   kubectl create ns prod || true
   kubectl apply -f infra/argocd/app-sandbox.yaml
   kubectl apply -f infra/argocd/app-prod.yaml

3) TLS via cert-manager (Gateway HTTPRoute solver)
   kubectl -n prod apply -f infra/cert/issuer-prod.yaml
   kubectl -n prod apply -f infra/cert/certificate-prod.yaml

4) DNS
   A record: quests.tmbot.cc -> YOUR_SERVER_IP

5) Expose NodePort 32443 from the host (simple options)
   - Open firewall and DNAT 443 -> 32443, or
   - Run host Nginx to proxy https://quests.tmbot.cc to https://127.0.0.1:32443

6) BotFather
   Web App URL: https://quests.tmbot.cc/
   Frontend calls API at the same origin: https://quests.tmbot.cc/api

7) Deploy stub_tg_link mini-app (ArgoCD)
   # ArgoCD Application will create namespace `stub` (syncOptions CreateNamespace=true)
   kubectl apply -f infra/argocd/app-stub-tg-link.yaml -n argocd

Quick note:
- Все "заглушки" теперь живут в namespace `stub`.

Quick ArgoCD checklist if pod не появился
1) Убедиться, что Application создан:
   kubectl get applications -n argocd | grep stub-tg-link

2) Посмотреть статус Application и ошибки синхронизации:
   kubectl describe application stub-tg-link -n argocd
   # либо через argocd CLI / UI:
   # argocd app get stub-tg-link

3) Форсировать синхронизацию (если не включена автосинхронизация):
   # с argocd CLI:
   # argocd app sync stub-tg-link
   # или через kubectl (скинь аннотацию/патч если нужно):
   kubectl -n argocd patch application stub-tg-link --type merge -p '{"spec":{"syncPolicy":{"automated":{"prune":true,"selfHeal":true}}}}' || true
   # и затем:
   kubectl -n argocd rollout restart deployment argocd-application-controller || true

4) Если Application показывает ошибки получения манифестов:
   - проверить repoURL в infra/argocd/app-stub-tg-link.yaml (приватный репозиторий требует добавить credentials в ArgoCD)
   - проверить path: infra/apps/stub_tg_link действительно существует в репо

5) Проверить ресурсы в sandbox namespace:
   kubectl get all -n sandbox
   kubectl get httproutes -n sandbox
   kubectl describe deploy stub-tg-link -n sandbox
   kubectl describe svc stub-tg-link -n sandbox
   kubectl get events -n sandbox --sort-by='.lastTimestamp'

6) Если Deployment создан, но нет Pod:
   - проверить образ в deployment.yaml (image: your-registry/stub_tg_link:latest) — заменить на существующий образ или путь сборки
   - проверить imagePullSecrets / доступ к registry
   - посмотреть describe пода/replicaset для ошибок создания

7) Логи контроллера ArgoCD для подробностей:
   kubectl logs -n argocd deploy/argocd-application-controller --tail=200

Если после этих шагов всё ещё нет pod — пришлите вывод:
- kubectl get applications -n argocd
- kubectl describe application stub-tg-link -n argocd
- kubectl get all -n sandbox
- kubectl describe deploy stub-tg-link -n sandbox
