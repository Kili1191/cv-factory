# CV Factory

Application Next.js d'edition de CV avec IA Claude.

## Architecture

- **Frontend** : React/Next.js dans `app/page.jsx`
- **Backend** : Endpoint serverless `app/api/claude/route.js` qui appelle Anthropic
- **Cle API** : stockee uniquement sur le serveur (variable d'environnement)

---

## Demarrage rapide (en local)

### 1. Installe les dependances

```bash
npm install
```

### 2. Configure ta cle API

Cree un fichier `.env.local` a la racine (a cote de `package.json`) :

```bash
cp .env.local.example .env.local
```

Ouvre `.env.local` et remplace `sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxx` par ta vraie cle :

```
ANTHROPIC_API_KEY=sk-ant-api03-VRAIE_CLE_ICI
```

### 3. Lance l'app

```bash
npm run dev
```

Va sur http://localhost:3000

---

## Deploiement sur Vercel (gratuit)

### 1. Push ton code sur GitHub

```bash
git init
git add .
git commit -m "Initial CV Factory"
git branch -M main
git remote add origin https://github.com/TON_USERNAME/cv-factory.git
git push -u origin main
```

### 2. Connecte le repo a Vercel

1. Va sur https://vercel.com/new
2. Clique "Import Git Repository"
3. Selectionne ton repo `cv-factory`
4. **Avant de cliquer Deploy** : ouvre la section "Environment Variables"
5. Ajoute :
   - **Name** : `ANTHROPIC_API_KEY`
   - **Value** : `sk-ant-api03-...` (ta vraie cle)
6. Clique **Deploy**

Apres ~30 secondes, ton app est en ligne sur `https://cv-factory-XXX.vercel.app`

### 3. Mises a jour

A chaque `git push`, Vercel redeploie automatiquement.

```bash
git add .
git commit -m "Mon changement"
git push
```

---

## Securite

- La cle API n'est **JAMAIS** envoyee au navigateur
- Le frontend appelle `/api/claude` (ton serveur)
- Le serveur utilise la cle stockee dans Vercel pour appeler Anthropic
- Le `.env.local` est dans `.gitignore` (ne sera jamais push)
