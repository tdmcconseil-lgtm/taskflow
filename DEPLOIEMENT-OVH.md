# Déploiement de Taskflow sur OVH (VPS)

Guide pas-à-pas. L'application (Next.js + PostgreSQL) tourne dans des conteneurs
Docker, derrière Caddy qui gère le HTTPS automatiquement. Il faut un **serveur**
(OVH **VPS** ou Public Cloud), pas l'hébergement mutualisé.

Ce qui est déjà prêt dans le dépôt : `Dockerfile`, `docker-compose.prod.yml`,
`Caddyfile`, `.env.production.example`, `deploy.sh`.

---

## 1. Commander le serveur et le domaine

1. Sur OVH, commande un **VPS** (le modèle d'entrée de gamme suffit pour
   démarrer) avec **Ubuntu 24.04** ou **Debian 12**. Note l'**adresse IP** et le
   mot de passe/clé SSH fournis.
2. Si tu as un **nom de domaine** (chez OVH ou ailleurs), crée un enregistrement
   **DNS de type A** qui pointe un sous-domaine (ex. `taskflow.ton-domaine.fr`)
   vers l'**IP du VPS**. (La propagation peut prendre quelques minutes.)
   - Pas de domaine ? On peut démarrer en HTTP sur l'IP, mais HTTPS a besoin d'un
     domaine — dis-le-moi et j'adapte.

## 2. Se connecter en SSH

Depuis ton PC (PowerShell ou un terminal) :

```
ssh ubuntu@IP_DU_VPS      # ou root@IP_DU_VPS selon l'image OVH
```

## 3. Installer Docker (sur le VPS)

```
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER    # puis se déconnecter/reconnecter
```

Vérifier : `docker --version` et `docker compose version`.

## 4. Récupérer le code (dépôt privé)

Le dépôt est privé : on autorise le VPS en lecture via une **clé de déploiement**.

Sur le VPS :

```
ssh-keygen -t ed25519 -C "vps-taskflow" -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub
```

Copie la clé affichée, puis sur GitHub : dépôt **taskflow → Settings → Deploy
keys → Add deploy key** (colle la clé, laisse « Allow write access » décoché).

Toujours sur le VPS :

```
git clone git@github.com:tdmcconseil-lgtm/taskflow.git
cd taskflow
```

## 5. Configurer l'environnement

```
cp .env.production.example .env
nano .env
```

Remplis : `POSTGRES_PASSWORD` (le même dans `DATABASE_URL`), `AUTH_SECRET`
(génère-le avec la commande indiquée dans le fichier), `DOMAIN` et `APP_URL`
avec ton sous-domaine.

## 6. Démarrer

```
docker compose -f docker-compose.prod.yml up -d --build
```

Au premier lancement : build de l'image, démarrage de PostgreSQL, application
automatique des migrations, puis Caddy obtient le certificat HTTPS.

Vérifier :

```
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f app
```

Ouvre `https://taskflow.ton-domaine.fr` → crée ton compte via **/signup**
(la base démarre vide).

> Pense à ouvrir les ports **80** et **443** dans le pare-feu du VPS si besoin.

---

## 7. Modifier à distance (mises à jour)

Tu travailles sur ton PC (ou dans un Codespace), tu pousses sur GitHub, puis sur
le VPS :

```
cd ~/taskflow
./deploy.sh
```

`deploy.sh` fait : `git pull` → rebuild → redémarrage (les migrations
éventuelles s'appliquent au démarrage). Tes données en base sont conservées.

## 8. Sauvegarde / restauration de la base

Sauvegarde :

```
docker compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U taskflow taskflow > sauvegarde-$(date +%F).sql
```

Restauration :

```
cat sauvegarde-AAAA-MM-JJ.sql | docker compose -f docker-compose.prod.yml exec -T db \
  psql -U taskflow -d taskflow
```

---

## Dépannage rapide

- **HTTPS ne se met pas en place** : vérifie que le DNS pointe bien sur l'IP du
  VPS et que les ports 80/443 sont ouverts ; regarde `logs caddy`.
- **L'app redémarre en boucle** : `logs app` — souvent une variable manquante
  dans `.env` (ex. `AUTH_SECRET`, `DATABASE_URL`).
- **Emails** : par défaut `MAIL_TRANSPORT=console` (les liens d'invitation sont
  dans `logs app`). Pour de vrais envois, configure un fournisseur SMTP.
