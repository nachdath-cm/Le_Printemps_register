# Le Printemps — Registre des prestations

Application web installable (PWA) pour **Le Printemps SPA & Lumière**, Jéricho, Cotonou (Bénin).

Trois parcours, un seul outil :

| Route     | Écran                         | Pour qui                                   |
| --------- | ----------------------------- | ------------------------------------------ |
| `/borne`  | Borne + QR code               | Lahan sala, sur la tablette de l'accueil   |
| `/client` | Formulaire d'inscription     | La cliente, sur son téléphone              |
| `/admin`  | Registre des prestations     | L'équipe, derrière un code PIN             |

La cliente scanne le QR code, remplit le formulaire sur son téléphone, et son
inscription apparaît immédiatement sur l'écran d'accueil et dans le registre de
l'équipe.

---

## Démarrage rapide

```bash
npm install
cp .env.example .env      # puis renseignez ADMIN_PIN
npm run dev
```

- Borne (tablette) : <http://localhost:5173/borne>
- Formulaire client : <http://localhost:5173/client>
- Registre équipe : <http://localhost:5173/admin>

`npm run dev` lance l'API (port 5174) et le serveur Vite (port 5173) ensemble.
Vite redirige automatiquement `/api` vers l'API.

### Mise en production

```bash
npm run build   # icônes PWA + vérification TypeScript + build Vite
npm start       # sert l'API ET le front compilé (dist/) sur un seul port
```

En production, seul `npm start` est nécessaire : le même serveur Express sert
`/api` et les fichiers statiques de `dist/`.

---

## ⚠️ Avant la mise en ligne : le logo

`public/logo.png` est votre logo. Le script `npm run icons` en dérive tout le
reste — il suffit de remplacer le fichier et de relancer la commande.

Le script fait trois choses, automatiquement :

1. **Recadrage.** Les logos sont souvent livrés sur un grand carré vide. La
   zone vide est supprimée, sinon l'icône PWA n'afficherait qu'un petit trait
   au milieu d'un carré blanc.
2. **Icônes PWA**, aux tailles attendues par le manifeste et iOS, en respectant
   les proportions (le sigle n'est jamais étiré) et la zone sûre des icônes
   « maskable » d'Android.
3. **Version web** `logo-mark.png` : le logo recadré **sur fond transparent**.
   C'est celle que l'interface affiche, sinon le carré clair d'origine
   apparaîtrait sur le fond crème de la page.

Fichiers produits :

| Fichier                        | Rôle                                        |
| ------------------------------ | ------------------------------------------- |
| `pwa-192x192.png`              | Icône PWA standard                           |
| `pwa-512x512.png`              | Icône PWA haute densité                     |
| `pwa-maskable-512x512.png`     | Icône PWA avec zone sûre (Android)          |
| `apple-touch-icon.png`         | Icône d'écran d'accueil iOS                  |
| `logo-mark.png`                | Logo affiché dans l'interface, fond transparent |
| `logo-original.png`            | Copie intacte de votre fichier source       |

Le fond n'est retiré **que s'il est uni et nettement séparé du sigle** : le
détourage part des bords de l'image et ne traverse que les pixels de même
couleur, si bien qu'une zone claire à l'intérieur du logo (l'œil d'une lettre,
un espace) n'est jamais percée. Le script mesure le nombre de pixels du sigle
avant et après : si le fond avait été rogné par erreur, il conserve le fichier
opaque et vous prévient.

Si le logo n'a pas de fond uni, ou si vous préférez le carré clair d'origine,
supprimez le fichier `logo-mark.png` : l'interface bascule automatiquement sur
`logo.png`.

---

## Ajouter ou modifier une prestation

**Un seul fichier à modifier : `src/config/services.ts`.**

```ts
export const SERVICE_CATEGORIES = [
  {
    id: 'soins-du-visage',
    label: 'Soins du visage',
    services: [
      { id: 'soins-du-visage', label: 'Soins du visage' },
    ],
  },
  // …
];
```

L'ajout est pris en compte automatiquement partout : formulaire client, borne,
registre admin, validation serveur et export CSV. Le serveur importe ce même
fichier, il n'existe donc aucune liste à dupliquer.

Le système accepte aussi une catégorie `Autre` : le champ libre n'apparaît que
lorsque la cliente la coche, et il devient alors obligatoire.

---

## Variables d'environnement

| Variable         | Défaut            | Rôle                                                     |
| ---------------- | ----------------- | -------------------------------------------------------- |
| `ADMIN_PIN`      | `2468` en dev     | Code d'accès au registre. **Obligatoire en production.** |
| `SESSION_SECRET` | généré au démarrage | Clé HMAC des sessions. À fixer pour des sessions durables. |
| `PORT`           | `5174`            | Port d'écoute.                                            |
| `HOST`           | `0.0.0.0`         | Interface d'écoute.                                      |
| `DATA_DIR`       | `./server/data`   | Emplacement du fichier d'inscriptions.                   |

Voir `.env.example` pour le détail.

---

## API

| Méthode  | Route                              | Accès   | Rôle                              |
| -------- | ---------------------------------- | ------- | --------------------------------- |
| `GET`    | `/api/health`                      | public  | Sonde de disponibilité.           |
| `POST`   | `/api/registrations`               | public  | Crée une inscription.             |
| `GET`    | `/api/stats/today`                 | public  | Compteur du jour (borne).         |
| `POST`   | `/api/auth/login`                  | public  | Échange le PIN contre un jeton.   |
| `GET`    | `/api/registrations`               | PIN     | Liste les inscriptions du jour.   |
| `PATCH`  | `/api/registrations/:id/status`    | PIN     | Change le statut d'une ligne.     |
| `GET`    | `/api/registrations.csv`           | PIN     | Export CSV (UTF-8 avec BOM).      |

Les données sont stockées dans `server/data/registrations.json`, écrit de façon
atomique (fichier temporaire puis renommage) pour qu'une coupure de courant ne
puisse pas corrompre le registre. La « journée » suit l'heure du Bénin (UTC+1).

> Le fichier de données est ignoré par Git : c'est votre historique client, pas
> du code.

---

## Accessibilité et design

- Palette, typographies, rayons et ombres repris du site officiel, centralisés
  dans `src/index.css` (Tailwind v4, configuration CSS-first via `@theme`).
- Le blanc sur l'orange d'origine ne respecte pas le WCAG AA (2,60:1). Un ton
  plus foncé (`primary-strong`, 4,58:1) est donc utilisé pour les boutons et les
  textes actifs, sans changer l'identité visuelle. Voir `docs/palette-audit.md`.
- Formulaire entièrement navigable au clavier, focus visible, focus piégé dans
  les modales, focus Automatically déplacé vers le premier champ en erreur.
- Animations désactivées si le système demande `prefers-reduced-motion`.
- Interface intégralement en français, y compris les messages d'erreur.

---

## Scripts

| Commande             | Effet                                              |
| -------------------- | -------------------------------------------------- |
| `npm run dev`        | API + Vite en mode développement                   |
| `npm run dev:web`    | Front seul                                         |
| `npm run dev:api`    | API seule, avec rechargement à chaud               |
| `npm run icons`      | Régénère les icônes PWA depuis `public/logo.png`   |
| `npm run typecheck`  | Vérification TypeScript                             |
| `npm run lint`       | Analyse statique (oxlint)                          |
| `npm run build`      | Icônes + TypeScript + build de production           |
| `npm start`          | Serveur unique (API + `dist/`)                     |
| `npm run preview`    | Build puis lancement en conditions de production    |
