# Cires Demandes

Conception d'une application des demandes internes et de leur traitement — backend NestJS + Prisma/PostgreSQL, frontend Angular.

## Prerequis

- Node.js >= 20
- PostgreSQL (serveur accessible, une base vide pour le projet)
- Git

## 1. Cloner le projet

```bash
git clone <url-du-repo>
cd cires-demandes
```

## 2. Backend (`backend/`)

```bash
cd backend
npm install
cp .env.example .env
```

Editer `backend/.env` :

| Variable | Description |
|---|---|
| `DATABASE_URL` | Chaine de connexion PostgreSQL, ex. `postgresql://user:password@localhost:5432/cires_demandes?schema=public` |
| `JWT_ACCESS_SECRET` | Chaine aleatoire longue, propre a chaque environnement (ne pas reutiliser celle d'un autre poste) |
| `JWT_ACCESS_EXPIRES_IN` | Duree de validite du token, ex. `8h` |
| `CORS_ORIGIN` | URL du frontend, ex. `http://localhost:4200` |
| `PORT` | Port de l'API (optionnel, defaut `3000`) |
| `SMTP_*` | Optionnel en dev — laisser vide pour utiliser une boite Ethereal de test (lien affiche dans la console) |

Appliquer les migrations Prisma :

```bash
npx prisma migrate deploy
```

Creer le dossier des pieces jointes (ignore par git) :

```bash
mkdir uploads
```

### Premier compte admin

Il n'existe pas de route d'inscription publique : la creation d'utilisateurs (`POST /auth/users`) exige deja un compte `ADMIN`. Sur une base neuve, il faut donc creer le premier admin via le script de seed :

1. Renseigner `SEED_ADMIN_EMAIL` et `SEED_ADMIN_PASSWORD` (et optionnellement `SEED_ADMIN_NOM`/`SEED_ADMIN_PRENOM`) dans `backend/.env`.
2. Lancer :

```bash
npx prisma db seed
```

Le script est idempotent : si un utilisateur existe deja avec cet email, il ne fait rien (il ne reinitialise jamais un mot de passe existant). Une fois connecte avec ce compte, les autres utilisateurs se creent depuis l'interface (page Gestion des Utilisateurs).

<details>
<summary>Methode manuelle (si le script de seed ne convient pas)</summary>

Generer un hash bcrypt du mot de passe :

```bash
node -e "console.log(require('bcrypt').hashSync('MonMotDePasse', 10))"
```

Puis inserer la ligne via Prisma Studio (`npx prisma studio`) ou en SQL direct dans la table `utilisateurs` (`role = 'ADMIN'`, `actif = true`, `motDePasse` = hash genere ci-dessus).
</details>

### Lancer le backend

```bash
npm run start:dev      # developpement (watch)
# ou
npm run build && npm run start:prod   # production
```

## 3. Frontend (`frontend/`)

```bash
cd ../frontend
npm install
```

Verifier `src/environments/environment.ts` (dev) et `environment.prod.ts` (prod) : `apiUrl` doit pointer vers l'URL du backend. En prod, `environment.prod.ts` contient un placeholder (`https://api.REPLACE-ME.example.com`) — `main.ts` refuse de demarrer tant qu'il n'est pas remplace par la vraie URL.

```bash
npm start        # serveur de dev sur http://localhost:4200
# ou
npm run build     # build de prod dans dist/, a servir via un serveur statique / nginx
```

## Notes

- `.env` (backend) contient des secrets et n'est jamais commite — seul `.env.example` (template sans valeurs sensibles) est versionne.
- `backend/uploads/` (pieces jointes) est ignore par git ; recreer le dossier sur chaque nouvel environnement.