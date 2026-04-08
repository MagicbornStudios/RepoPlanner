# RepoPlanner landing site

Single-page Next.js app (App Router, Tailwind v4, shadcn-style primitives under `components/ui/`).

**This app exists only on the `development` branch.** `main` is pinned to the older framework snapshot and does not include `apps/landing`.

## Deploy on Vercel

1. Import [MagicbornStudios/RepoPlanner](https://github.com/MagicbornStudios/RepoPlanner) (or use an existing project, e.g. [repo-planner on Vercel](https://vercel.com/b2gdevs-projects/repo-planner)).
2. **Production branch:** `development` (Settings → Git → Production Branch).
3. **Root Directory:** `apps/landing` (Settings → General → Root Directory).
4. **Node.js:** 22.x (Settings → General → Node.js Version).
5. Install / build: defaults work with committed `package-lock.json` and `vercel.json` (`npm ci`, `npm run build`).

Redeploy after changing branch or root directory.

## Local

```bash
git checkout development
cd apps/landing
npm install
npm run dev
```

Open `http://localhost:3040`.
