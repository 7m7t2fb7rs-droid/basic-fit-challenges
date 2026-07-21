# 🏋️ Challenges Basic Fit

Site de classement des défis de la salle, avec système de points F1.
Next.js (App Router) + Supabase, déployable sur Vercel.

- **Accueil** : classement général cumulé (points F1 sur tous les défis).
- **Défis** : résultats des défis en cours / terminés + ceux à venir.
- **Admin** (connexion) : créer/modifier des défis (mesurés en **temps** ou en **répétitions**), saisir les scores des participants.

---

## 1. Créer la base Supabase (gratuit, ~5 min)

1. Va sur [supabase.com](https://supabase.com) → **New project** (note le mot de passe de la base).
2. Menu **SQL Editor** → **New query** → colle tout le contenu de `supabase-schema.sql` → **Run**.
   Ça crée les tables `challenges` et `entries` et les règles de sécurité.
3. Menu **Project Settings → API** : copie **Project URL** et la clé **anon public**. On en a besoin à l'étape 3.

## 2. Créer les comptes admin

Dans Supabase → **Authentication → Users → Add user** :
- renseigne un email + mot de passe pour chaque admin,
- coche **Auto Confirm User** (sinon le compte reste en attente d'email).

Il n'y a pas d'inscription ouverte sur le site : seuls ces comptes peuvent se connecter à `/admin`.

## 3. Déployer sur Vercel

1. Pousse ce dossier sur un dépôt GitHub (ou glisse-le dans Vercel).
2. Sur [vercel.com](https://vercel.com) → **Add New → Project** → importe le repo.
3. Dans **Environment Variables**, ajoute :

   | Nom | Valeur |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | ton Project URL Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ta clé anon public |

4. **Deploy**. C'est en ligne. 🎉

## 4. Utilisation

- Va sur `ton-site.vercel.app/admin`, connecte-toi.
- Crée un défi (ex. **Pompes**, mesuré en *Répétitions*), mets-le **En cours**.
- Ajoute les scores : Nom + perf (`2:40` pour un temps, `42` pour des répétitions).
- Le classement de l'accueil se met à jour automatiquement.

---

## Développement local (optionnel)

```bash
npm install
cp .env.example .env.local   # remplis avec tes clés Supabase
npm run dev                  # http://localhost:3000
```

## Comment marchent les points

Barème F1 par défi : **25, 18, 15, 12, 10, 8, 6, 4, 2, 1** (puis 0 au-delà de la 10e).
Dans chaque défi, **le meilleur score = 1re place** (temps le plus long *ou* le plus de répétitions).
Le classement général additionne les points de chaque participant sur tous les défis.
La logique est dans `lib/scoring.js`.

## Structure

```
app/
  page.js         → classement général (accueil)
  defis/page.js   → liste des défis + résultats + à venir
  admin/page.js   → connexion + gestion défis & scores
  Nav.js, layout.js, globals.css
lib/
  supabaseClient.js → connexion Supabase
  scoring.js        → barème F1, classement
supabase-schema.sql → tables + sécurité (à exécuter une fois)
```
