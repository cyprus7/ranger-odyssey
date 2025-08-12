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
