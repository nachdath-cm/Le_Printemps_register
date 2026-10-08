# Nouveautés — Prospects & Bons

Ce document explique, simplement, les deux nouveautés ajoutées au registre
**Le Printemps** : le **système de prospects** et la **vente de bons par
prestation**.

---

## 1. Les prospects

### À quoi ça sert ?

Une personne qui découvre le salon (affiche, Instagram, bouche-à-oreille)
n'est pas encore cliente. Avant, il fallait attendre qu'elle vienne et
s'inscrive d'elle-même. Maintenant, **l'employée lui envoie un lien**, elle
remplit un mini-formulaire, et elle arrive dans la base comme **Prospect**.

### Le parcours

1. **Envoyer le lien** — dans l'onglet `Prospects`, un clic sur
   « Générer un lien » produit un lien + QR code :
   - *Partager sur WhatsApp* : message pré-rempli à envoyer à la personne ;
   - *Copier* : collez-le où vous voulez ;
   - *Télécharger le QR* : PNG à imprimer (affiche, carte…).
2. **La personne s'inscrit** — sur son téléphone, elle saisit :
   **prénom, nom, téléphone**. C'est tout. Elle voit un message de
   remerciement et un bouton pour écrire au salon sur WhatsApp.
3. **Elle devient Cliente** — dès qu'elle entre vraiment dans le salon :
   - **automatiquement**, si elle utilise « Je viens pour la première fois »,
     « Se connecter à mon espace », ou si l'employée crée une visite à son
     numéro dans le Registre ;
   - **manuellement**, via le bouton « Passer en cliente » dans l'onglet
     `Prospects` (avec possibilité de saisir la prestation reçue : elle
     apparaît alors dans le Registre en *En attente*).

### Vie du prospect dans l'onglet Prospects

- **Liste** : nom, téléphone (cliquable), source, date, badge de statut.
- **Filtres** : Prospects / Converties / Tous, par source, par période ;
  recherche par nom ou téléphone.
- **Actions par ligne** :
  - *Relancer sur WhatsApp* (message poli pré-rempli) ;
  - *Passer en cliente* ;
  - *Supprimer* (uniquement tant qu'elle n'a aucune visite).
- **Synthèse par source** : nombre de prospects, nombre convertis,
  taux de conversion — pour savoir quel canal fonctionne.
- Un prospect **ne peut pas** encore ouvrir son espace : tant qu'il n'est
  pas converti, la page d'accueil cliente lui indique que son compte est en
  cours de validation.

> **Doublon de téléphone ?** Si le numéro saisi est déjà connu, aucun
> compte en double n'est créé et l'interface ne dit pas que le numéro
> existe déjà — c'est voulu, pour ne rien révéler de la base.

---

## 2. Les bons par prestation

### À quoi ça sert ?

Une cliente peut **prépayer une prestation précise** et l'offrir ou
l'utiliser plus tard. Chaque bon est un **carnet de tickets** pour une
prestation : à l'achat on obtient autant de codes que de pièces.

| Prestation | Carnet | Prix |
| --- | --- | --- |
| Coiffure Femme / Homme / adultes | 6 pièces | 10 000 F |
| Coiffure Enfant (jeunes et enfants) | 6 pièces | 5 000 F |
| Soins pieds et mains (manucure prestige) | 3 pièces | 15 000 F |
| Soins du visage | 2 pièces | 20 000 F |
| Soins du visage éclat | 3 pièces | 12 000 F |
| Massages relaxants | 2 pièces | 20 000 F |
| Gommages du corps | 2 pièces | 20 000 F |

**Aucun paiement en ligne** : la cliente commande depuis son espace, paye
en **espèces au comptoir**, et l'employée confirme. Les points de fidélité
(1 FCFA = 1 Goutte de Rosée, 10 000 Gouttes = 1 Fleur) sont crédités
uniquement à cette confirmation.

### Côté cliente (espace personnel)

- **Acheter un bon** : liste des prestations vendables par catégorie, prix
  affichés, boutons `+ / −` (max 10 de chaque), total FCFA visible,
  bouton **Commander**. Message de confirmation : « Présentez-vous au
  comptoir… ».
- **Une seule commande en attente** à la fois : si l'une existe déjà, son
  contenu et son statut s'affichent avec un bouton *Annuler ma commande*.
- **Mes bons** : chaque bon avec sa prestation, son code
  (`PRT-XXXXX-XXXXX`), sa date de validité et son statut :
  *Valide · Réservé · Utilisé · Expiré · Annulé*.
- **Commandes de bons** : historique avec statut
  (En attente de paiement / Payée / Annulée / Expirée).

### Côté employée (onglet `Bons`)

1. **Commandes en attente de paiement** — compteur rouge sur l'onglet,
   triées des plus anciennes. Chaque ligne : nom, téléphone, contenu,
   total, date d'arrivée.
2. Pour chaque ligne, un **champ « Prix payé »** pré-rempli au prix
   catalogue, modifiable (tarif préférentiel → pastille *Prix modifié*).
3. **Espèces reçues** confirme : création des bons, crédit des Gouttes de
   Rosée. Un deuxième clic ne crédite rien une seconde fois.
4. **Annuler** : la commande s'annule, aucun effet sur les points.
5. Une commande sans paiement depuis **72 h** est considérée comme
   **expirée** automatiquement (aucun point touché).
6. Après confirmation : la liste des **codes** s'affiche avec
   *Copier les codes*.

### Vente directe (filet de secours)

Si la cliente paye sans passer par son espace : bouton **Vendre un bon**,
recherche de la cliente (ou création rapide en 2 lignes), choix des
prestations et prix, validation. La commande est directement *Payée*,
avec codes générés immédiatement.

### Utiliser un bon

Deux façons de l'appliquer à une visite *En attente* :

- **Depuis l'espace de la cliente**, *Nouvelle visite* : si elle a un bon
  valide pour une des prestations choisies, un bouton
  « Utiliser mon bon » apparaît ;
- **Depuis le Registre (employée)** : bouton *Utiliser un bon* et saisie
  du code — couvre les bons offerts à quelqu'un d'autre.

À l'application :

- le **Montant à facturer** diminue du **prix catalogue** de la prestation
  couverte (jamais en dessous de 0) ; modifiable à la main ensuite ;
- une pastille **« Bon PRT-… appliqué »** s'affiche sur la carte ;
- **détacher** est possible tant que la visite est *En attente* : le bon
  redevient actif et le montant est restauré.

### Cycle de vie d'une visite avec bon

| Événement | Effet sur le bon | Effet sur les points |
| --- | --- | --- |
| Visite passe à *Terminé* | *Utilisé* | Gouttes créditées sur le montant **final** (0 FCFA = 0 Goutte) |
| Visite *Annulée* | repasse *Actif* | — |
| Visite *Réactivée* depuis Terminé | repasse *Réservé* (même visite) | Gouttes de la visite retirées |
| Bon détaché | repasse *Actif* | — |
| Bon annulé par l'admin | *Annulé* | Gouttes retirées à l'acheteuse |

> L'annulation d'un bon est **refusée** si elle rendait les Fleurs
> disponibles de l'acheteuse négatives (échange en cours ou récompense
> déjà utilisée), avec un message clair.

### Suivi dans l'onglet Bons

- **Bons vendus** : nombre et montant total ;
- **Bons en circulation** : bons valides encore utilisables et leur valeur
  — c'est le nombre de prestations qu'il reste à honorer ;
- **Filtres** : Actifs / Réservés / Utilisés / Expirés / Annulés ;
  recherche par code, nom, téléphone ; export **CSV** ;
- **Réglage de validité** (en mois, 0 = sans expiration, défaut 6 mois).

---

## 3. À retenir

- Les prospects et les bons **ne changent rien au registre existant** :
  une cliente devient cliente normalement, et ses Gouttes de Rosée se
  cumulent comme avant.
- Les points ne sont jamais crédités avant confirmation du paiement par
  l'employée.
- Tout le paiement reste **en espèces au salon** : l'appli sert au suivi,
  pas à encaisser en ligne.
