# Audit de la palette — WCAG 2.1 AA

La palette ci-dessous est extraite du site officiel `leprintemspa.com`. Elle est
déclarée dans `src/index.css` via `@theme` (Tailwind v4, configuration CSS-first).

## Contraste de l'orange d'origine

La couleur de marque `--color-primary: #f2824e` **ne respecte pas le WCAG AA**
pour du texte blanc :

| Texte | Fond | Ratio | Requis | Verdict |
| ----- | ---- | ----- | ------ | ------- |
| `#ffffff` | `#f2824e` | **2,60:1** | 4,5:1 | ❌ Échec |

Le blanc sur l'orange d'origine ne passe donc pas, aussi bien pour du texte de
14 px que pour du texte de 30 px (un grand texte exige 3:1, on reste sous ce
seuil). Deux boutons utilisent pourtant du texte blanc sur ce fond dans la
charte : il fallait corriger.

## Tons dérivés

Trois tons plus sombres sont ajoutés **sans s'éloigner de l'identité visuelle** :

| Token                 | Valeur     | Usage                                              |
| --------------------- | ---------- | -------------------------------------------------- |
| `primary-strong`      | `#bd5822`  | Fond des boutons principaux (texte blanc)          |
| `primary-strong-hover` | `#a3481a` | État survol de ces boutons                         |
| `primary-ink`         | `#a5481c`  | Texte et icônes actifs sur fond clair              |

| Texte             | Fond       | Ratio | Requis | Verdict |
| ----------------- | ---------- | ----- | ------ | ------- |
| `#ffffff`         | `#bd5822`   | 4,58:1 | 4,5:1 | ✅ AA   |
| `#ffffff`         | `#a3481a`   | 6,00:1 | 4,5:1 | ✅ AAA  |
| `#a5481c`         | `#ffffff`   | 5,93:1 | 4,5:1 | ✅ AA   |
| `#a5481c`         | `#faf6f2`   | 5,51:1 | 4,5:1 | ✅ AA   |
| `#a5481c`         | `#fff2eb`   | 5,40:1 | 4,5:1 | ✅ AA   |
| `#a5481c`         | `#e06e39`   | 4,85:1 | 4,5:1 | ✅ AA   |

`#bd5822` est le seuil exact : il passe AA sur fond blanc **et** sur le crème
`#faf6f2`, ce qui permet d'utiliser le même ton pour toute la surface.

## Autres tons

| Token      | Valeur    | Sur fond      | Ratio | Verdict |
| ---------- | --------- | ------------- | ----- | ------- |
| `ink`      | `#2d1f1d` | `#ffffff` / `#faf6f2` | 15,85:1 / 14,74:1 | ✅ AAA |
| `muted`    | `#6e5855` | `#ffffff`     | 6,58:1 | ✅ AA   |
| `muted`    | `#6e5855` | `#faf6f2`     | 6,12:1 | ✅ AA   |
| `success`  | `#1c6b3c` | `#e7f4ec`     | 5,76:1 | ✅ AA   |
| `danger`   | `#b3261e` | `#ffffff`     | 6,54:1 | ✅ AA   |

`success` et `danger` ont eux aussi été assombris par rapport à des verts/rouges
plus vifs, afin de rester lisibles sur leurs pastilles de fond claires.

## Couleur de thème PWA

`theme_color` vaut `#bd5822` (et non `#f2824e`) : la couleur de thème doit
rester lisible dans la barre d'adresse du navigateur.

## Vérification

L'audit complet (borne, formulaire client, saisie du PIN, registre admin, états
d'erreur et de chargement) est passé au navigateur avec calcul de contraste sur
le rendu réel. Toutes les combinaisons de texte persistantes respectent AA.

Restent volontairement hors périmètre :

- les squelettes de chargement, sans texte réel ;
- les opacity d'animation d'entrée, désactivées si
  `prefers-reduced-motion: reduce` est demandé par le système.

## Méthode

Le calcul a été fait sur les couleurs **réellement peintes** : les fonds
Tailwind v4 combinés (`color-mix(in oklab, …)`) sont convertis en sRGB par le
navigateur avant le calcul, et les fonds semi-transparents sont composés sur
leur parent. Comparer des valeurs hexadécimales déclaratives ne suffit pas,
`backdrop-blur` et les fonds translucides changeant le résultat.
