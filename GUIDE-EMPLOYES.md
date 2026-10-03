# Guide d'utilisation — Registre Le Printemps

Ce document est destiné au personnel du salon. Il ne demande aucune
connaissance en informatique. Tout se fait à l'écran.

L'application a **trois usages** :

| Écran | À quoi il sert | Qui s'en sert |
| --- | --- | --- |
| **La borne** (`/borne`) | Afficher le QR pour accueillir les clientes | Sur la tablette, à l'accueil |
| **Accueil cliente** (`/accueil-client`) | Créer son espace ou s'y connecter | La cliente, sur son téléphone |
| **Le registre** (`/admin`) | Suivre les visites, les prix, les récompenses | Le personnel |

---

## 1. Le principe

La cliente scanne le QR de la borne. Elle arrive sur une page qui lui propose :

- **« Je viens pour la première fois »** : prénom, nom, téléphone — son compte
  est créé et elle est emmenée directement dans **son espace** ;
- **« Se connecter à mon espace »** : elle saisit son numéro, reçoit un code
  par WhatsApp et le tape pour entrer.

Dans son espace, elle peut déclarer **Nouvelle visite** (les prestations
qu'elle souhaite), suivre ses visites passées, ses **Gouttes de Rosée** et ses
**Fleurs de Printemps**, et échanger ses Fleurs contre des récompenses.

Votre travail consiste à **suivre l'avancement** de chaque visite dans le
registre : vous validez le montant, vous la marquez **Terminé** quand la
prestation est faite — c'est ce qui crédite les Gouttes de Rosée — ou
**Annulé** dans le cas contraire.

---

## 2. La borne (tablette à l'accueil)

Laissez la borne allumée sur l'écran d'accueil : les clientes scannent seules.

Cet écran affiche :

- le **QR code** vers l'accueil cliente ;
- un bouton **Copier le lien**, si une cliente préfère qu'on le lui envoie
  plutôt que de scanner ;
- un bouton **Inscrire sur place** : inscrit une cliente qui préfère se faire
  aider (même formulaire que pour une visite reçue en direct) ;
- le **nombre d'inscriptions du jour**.

---

## 3. Se connecter au registre

1. Ouvrez l'adresse du registre dans le navigateur.
2. Tapez les **4 chiffres** de votre code sur le pavé numérique : la connexion
   se fait toute seule.
3. Vous arrivez sur le registre.

La session reste ouverte **12 heures**. Pour quitter, bouton **Sortir**.

### Si le code est refusé

- **« Code incorrect. »** — erreur de frappe. Reprenez calmement.
- **« Trop de tentatives. Réessayez dans X minute(s). »** — après 5 essais de
  suite, l'accès est bloqué un moment. Attendez le temps indiqué, cela
  s'allonge progressivement (1 minute, puis 2, 4… jusqu'à 30 minutes).

> **Le code n'est à donner à personne.** Le registre contient le nom et le
> téléphone de toutes les clientes.

---

## 4. Les onglets du registre

En haut de la page admin, quatre onglets :

| Onglet | Contenu |
| --- | --- |
| **Registre** | les visites du jour — l'essentiel du travail |
| **Prestations** | le catalogue et les **prix** de chaque prestation |
| **Récompenses** | créer / modifier / activer / supprimer les récompenses |
| **Échanges** | les échanges de Fleurs demandés par les clientes |

### Registre — lire la liste

Chaque carte indique :

- le **nom** et le **prénom** de la cliente ;
- son **statut** : *En attente*, *Terminé* ou *Annulé* ;
- son **téléphone**, cliquable (appuyez dessus pour appeler) ;
- les **prestations**, en petites étiquettes ;
- l'heure d'inscription, en bas ;
- éventuellement une **note** de la cliente.

### Prestations — modifier un prix

Chaque ligne a un champ **prix en FCFA**. Modifiez la valeur et quittez le
champ (ou appuyez sur Entrée) : un petit « ✓ » confirme l'enregistrement.
Le nouveau prix sert au calcul des visites *suivantes* : les anciennes ne sont
pas recalculées.

### Récompenses — gérer les récompenses

- **Nouvelle récompense** : titre, description, coût en Fleurs, actif/inactif.
- La pastille **Active / Inactive** active ou masque la récompense côté
  cliente.
- Le crayon permet de la modifier, la corbeille de la supprimer.

### Échanges — valider ou annuler

Les demandes apparaissent en premier avec un badge **En attente** :

- **Utilisé** : la cliente est venue chercher sa récompense ;
- **Annuler** : elle ne s'est pas présentée — ses Fleurs lui sont
  immédiatement rendues disponibles.

Les statuts possibles : *En attente*, *Utilisé*, *Annulé*.

---

## 5. Créer une visite à la main (cliente sans espace)

Dans l'onglet **Registre**, bouton **Nouvelle visite**. Saisissez prénom, nom,
téléphone et prestations, comme au formulaire de la borne.

- Si le téléphone correspond à une cliente existante, la visite est
  **rattachée à son compte** : elle gagnera ses Gouttes de Rosée sur son
  espace.
- Sinon, un nouveau compte client est créé avec ce numéro. La cliente pourra
  plus tard le récupérer via « Se connecter à mon espace ».

---

## 6. Suivre une visite

### Filtrer et rechercher

Quatre filtres : **Tous**, **En attente**, **Terminés**, **Annulés**, chacun
avec son compteur. La **barre de recherche** filtre sur nom, téléphone ou
prestation. Le champ **date** est positionné sur aujourd'hui.

### Les statuts

| Bouton | Quand l'utiliser | Effet |
| --- | --- | --- |
| **Terminé** | la prestation est faite | crédite les Gouttes de Rosée |
| **Annuler** | la cliente ne vient pas / a abandonné | aucun XP |
| **Réactiver** | erreur de statut | remet *En attente*, et retire les XP si la visite était Terminé |

Quand vous cliquez **Terminé**, un message vert apparaît : *« +X Gouttes de
Rosée créditées »*. C'est le montant final (voir ci-dessous) qui compte.

> **La liste ne se met pas à jour toute seule.** Appuyez sur **Actualiser**
> quand une cliente vient de déclarer sa visite.

### Le montant à facturer

Sur chaque carte **En attente** ou **Annulé**, un champ **Montant à
facturer** est pré-rempli avec la somme des prix catalogue. **Vous pouvez le
modifier** — par exemple un tarif préférentiel pour une cliente fidèle.

- C'est ce montant qui crédite les Gouttes de Rosée au moment de **Terminé**
  (1 FCFA = 1 Goutte de Rosée).
- Si le montant diffère du total catalogue, une petite pastille
  **« Prix modifié »** apparaît sur la carte. C'est informatif, cela ne
  bloque rien.
- Une fois la visite **Terminé**, le montant n'est plus modifiable.

### Export CSV

Le bouton **Exporter CSV** télécharge la journée affichée avec Excel ou
LibreOffice. Les accents sont corrects à l'ouverture.

---

## 7. Côté cliente : ce qui se passe sur son téléphone

Pas besoin de le réexpliquer à chaque fois, mais au cas où une cliente
demanderait :

1. Elle scanne le QR → page d'accueil (première fois ou connexion).
2. Elle saisit ses prestations via **Nouvelle visite** ou se fait inscrire
   par vous.
3. Elle surveille son espace : Gouttes de Rosée, Fleurs, historique des
   visites, récompenses et ses échanges.
4. Pour se reconnecter plus tard (nouveau téléphone, nouvel onglet) :
   « Se connecter à mon espace » → code reçu par WhatsApp.

Pour elle, chaque visite de **10 000 Gouttes de Rosée** lui donne **1 Fleur de
Printemps** échangeable contre une récompense. Les paliers affichés :
**Bourgeon** → **Pousse** → **Fleur** → **Pleine Floraison**.

---

## 8. En cas de problème

| Situation | Que faire |
| --- | --- |
| **« Session expirée. Reconnectez-vous. »** | Retapez le code sur le pavé numérique (après 12 heures). |
| **« Trop de tentatives »** | Attendez le temps annoncé. |
| **Une cliente ne voit pas sa visite dans son espace** | Elle vient peut-être juste de la créer. Dites-lui d'appuyer sur actualiser dans son navigateur. Vérifiez qu'elle est connectée avec le bon numéro. |
| **Le code WhatsApp ne passe pas** | Vérifiez le numéro saisi, puis « Renvoyer un nouveau code ». Chaque nouveau code invalide l'ancien : le dernier compte. |
| **« Un compte existe déjà pour ce numéro. »** | En « Première fois », le numéro est déjà enregistré : utilisez « Se connecter à mon espace ». |
| **Le montant crédite 0 XP** | Une visite Terminé ne crédite que si un montant est présent. Vérifiez le champ « Montant à facturer » avant de valider. |
| **La liste reste vide** | La cliente n'a peut-être pas encore déclaré sa visite. Sinon, vérifiez la connexion internet et **Actualiser**. |
| **La borne n'affiche plus le QR** | Vérifiez le Wi-Fi. |

---

## 9. Confidentialité

- Le registre contient des données personnelles : ne laissez pas l'écran de
  l'admin visible depuis la salle d'attente, et n'exportez pas le CSV hors du
  salon.
- Le code d'accès registre n'est **jamais** à communiquer.
- L'espace d'une cliente n'est accessible qu'à elle (code WhatsApp) : ne
  demandez jamais son code à une cliente pour « l'aider », saisissez-le vous-
  même à sa place uniquement avec son accord — en général, il vaut mieux la
  laisser faire.

---

## 10. Ce que l'application ne fait pas

- **Elle ne gère pas les rendez-vous à l'heure exacte.** L'ordre de passage se
  décide entre vous.
- **Elle n'envoie ni SMS ni WhatsApp automatiques.** Le code de connexion est
  préparé dans le WhatsApp de la cliente elle-même, c'est elle qui l'envoie —
  aucun serveur ne contacte personne.
- **Elle ne supprime pas** une visite : une visite annulée reste visible dans
  le filtre *Annulés*.
- **Elle ne fonctionne pas hors-ligne.** Sans internet, rien ne se charge.
