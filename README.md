# Family Tree (PWA)

React + Vite + Zustand, Firebase (Auth + Firestore), hosted on GitHub Pages.

## 1. Firebase (one time)
1. console.firebase.google.com → create a project → **Build → Firestore Database** → create (production mode).
2. **Build → Authentication** → Sign-in method → enable **Google**. Under Settings → *Authorized domains* add `YOUR-USERNAME.github.io`.
3. **Project settings → Your apps → Web (</>)** → register an app and copy the config values.
4. **Firestore → Rules** → paste the contents of `firestore.rules` → Publish.
5. **Firestore → Data** → create collection `access`. Add a document whose **ID is your lowercase Google email** with field `role` (string) = `admin`. Add family members the same way with `role` = `member`.

## 2. Run locally
```
cp .env.example .env     # fill in the 4 values
npm install
npm run dev
```
Sign in, then use **Load sample family** (or **Add first member**) on the empty tree.

## 3. GitHub Pages
1. Create a GitHub repo and push this folder to `main`.
2. Repo → **Settings → Pages → Source: GitHub Actions**.
3. Repo → **Settings → Secrets and variables → Actions** → add secrets `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`.
4. Push to `main`; the workflow builds and deploys to `https://USERNAME.github.io/REPO/`.
5. On Android, open that URL in Chrome → menu → **Install app**.

The Firebase web config is not secret; real protection comes from `firestore.rules` and the `access` list.

## Notes
- Data model follows the spec: `members` and `unions` collections (`parent_union_id`, `children_ids`). `marriage_date` was added to unions for anniversaries, and `deleted` / `deleted_at` on members for soft delete.
- Writes are optimistic and offline-safe (Firestore persistent cache); edits queue and sync when back online.
- Profile photos (Firebase Storage) are not included: Storage now requires the paid Blaze plan.
