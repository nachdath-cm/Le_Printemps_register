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

En haut de la page admin, six onglets :

| Onglet | Contenu |
| --- | --- |
| **Registre** | les visites du jour — l'essentiel du travail |
| **Prestations** | le catalogue et les **prix** de chaque prestation |
| **Récompenses** | créer / modifier / activer / supprimer les récompenses |
| **Échanges** | les échanges de Fleurs demandés par les clientes |
| **Bons** | commandes de bons, confirmation d'encaissement, liste des bons |
| **Prospects** | les liens à envoyer et les personnes intéressées |

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

## 8. Les prospects

Un **prospect**, c'est une personne intéressée que vous n'avez pas encore
accueillie. Il arrive dans la liste via un lien que vous générez, et devient
**cliente** dès qu'elle reçoit une prestation ou si vous la convertissez.

### Générer un lien

Dans l'onglet **Prospects**, section *Générer un lien* :

1. Cliquez **Générer un lien** : le lien, son QR code et les boutons
   s'affichent ;
2. Envoyez le lien par WhatsApp (**Partager sur WhatsApp**), copiez-le, ou
   téléchargez le **QR PNG** pour l'imprimer.

Chaque lien compte combien de prospects il vous a apportés. Vous pouvez le
désactiver à tout moment : le formulaire associé affiche alors un message
d'erreur sobre.

Le formulaire que la personne remplit ne demande que son **prénom, son
nom et son téléphone** : elle est ensuite directement enregistrée comme
prospect dans votre base.

### La liste des prospects

Chaque ligne indique le nom, le téléphone (cliquable pour appeler), la
prestation d'intérêt, la source (le lien utilisé) et la date.

- **Relancer sur WhatsApp** : prépare un message poli au nom du salon ;
- **Passer en cliente** : convertit la personne (utile quand elle arrive
  sans avoir utilisé son espace) ;
- **Supprimer** : possible seulement tant qu'elle n'a aucune visite ;
- filtres : *Prospects / Converties / Tous*, par source, par période, et
  recherche par nom ou téléphone.

La petite synthèse en bas de page donne, par source, le nombre de prospects,
le nombre de converties et le taux de conversion.

> Un prospect converti par « Je viens pour la première fois », par
> « Se connecter à mon espace » ou par une visite créée à la main passe
> automatiquement en cliente : aucune action requise de votre part.

---

## 9. Les bons (prestations prépayées)

Un **bon**, c'est une prestation achetée à l'avance, en espèces au comptoir.
Chaque bon correspond à **une prestation précise** du catalogue.

### Comment une cliente achète

Dans **son espace**, section *Acheter un bon* : elle choisit les prestations
(à forte demande), valide sa commande, puis présente-vous **En attente de
paiement**.

- Une seule commande en attente à la fois ;
- Elle peut l'**annuler** tant que vous n'avez pas confirmé ;
- Les points (Gouttes de Rosée) ne sont crédités **qu'à votre confirmation**.

### Confirmer une commande (onglet Bons)

1. L'onglet **Bons** affiche les *Commandes en attente de paiement*,
   avec un compteur rouge sur l'onglet.
2. Pour chaque ligne, le prix catalogue est pré-rempli : ajustez si
   tarif préférentiel — une pastille **Prix modifié** apparaît.
3. **Espèces reçues** valide : la commande passe *Payée*, les bons sont
   créés et les Gouttes de Rosée crédités à l'acheteuse.
   Un deuxième clic « Espèces reçues » ne crédite rien une seconde fois.
4. **Annuler** laisse la cliente repartir sans bon ni points.
5. Une commande sans paiement pendant **72 heures** est considérée comme
   expirée automatiquement : retirez-la simplement de votre suivi.

Après confirmation, les **codes des bons** (format `PRT-XXXXX-XXXXX`)
s'affichent : copiez-les et donnez-les à la cliente.

### Vente directe (« Vendre un bon »)

Si la cliente paye sans passer par son espace :

1. **Vendre un bon** ;
2. Recherchez la cliente par nom/téléphone, ou créez-la en deux lignes ;
3. Choisissez les prestations et les prix (tarif normal ou préférentiel) ;
4. Validez : les bons sont créés immédiatement et crédités.

### Utiliser un bon

**Côté cliente**, dans *Nouvelle visite* : si elle a un bon valide pour une
prestation choisie, un bouton « Utiliser mon bon » apparaît.

**Côté employée**, dans le **Registre**, sur une visite *En attente* :
bouton **Utiliser un bon** → saisissez le code (même si la cliente n'est
pas l'acheteuse du bon, par ex. un cadeau).

Dans les deux cas :

- le **Montant à facturer** diminue du prix catalogue de la prestation
  couverte (jamais en dessous de zéro) — modifiable à la main ensuite ;
- une pastille **Bon PRT-… appliqué** s'affiche ;
- **détacher** est possible tant que la visite reste *En attente* : le bon
  redevient actif et le montant est restauré.

Au passage à **Terminé**, le bon passe *Utilisé* et les Gouttes de Rosée
ne sont calculées que sur le montant final : une visite à 0 FCFA grâce à
un bon crédite 0 Goutte (les points ont déjà été donnés à l'achat).

### Annuler un bon

Dans la liste des bons, **Annuler le bon** est possible tant qu'il est
actif. Ses Gouttes de Rosée sont alors retirées à l'acheteuse. Si ce
retrait rendrait ses Fleurs disponibles négatives (échange en cours), le
système refuse et explique pourquoi.

### Suivi

- **Bons vendus** : nombre et montant total ;
- **Bons en circulation** : bons valides non utilisés et leur valeur —
  c'est le nombre de prestations que vous devez encore honorer ;
- filtres *Actifs / Réservés / Utilisés / Expirés / Annulés*, recherche par
  code, nom ou téléphone, export **CSV**.
- Le **réglage de validité** (en mois ; 0 = sans expiration) est en bas de
  la page. Par défaut : 6 mois.

---

## 10. En cas de problème

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
| **Un prospect ne peut pas s'inscrire, activez le lien** | Vérifiez que le lien est bien **actif** dans l'onglet Prospects. |
| **Une personne s'est inscrite avec un mauvais numéro** | Impossible de la retrouver ? Vérifiez l'orthographe et le format dans sa fiche prospect, puis relancez-la. |
| **Une commande ne disparaît pas après 72 h** | Elle est marquée *Expirée* automatiquement : vous pouvez l'annuler ou demander à la cliente de refaire sa commande. |
| **« Espèces reçues » ne crée pas les bons** | La commande a déjà été traitée (double clic, ou entre-temps). Vérifiez dans la liste des bons : ils y sont peut-être déjà. |
| **« Annulation impossible : Fleurs négatives »** | La cliente a déjà échangé ou utilisé ses Fleurs. Réglez avec elle à main levée avant d'annuler le bon. |
| **Le bon d'une cliente ne s'applique pas** | Vérifiez que la prestation du bon figure bien dans la visite, que le bon est actif (non expiré, non utilisé), et qu'il n'est pas déjà rattaché à une autre visite. |
| **Une cliente a payé mais n'a pas ses bons** | La commande est peut-être encore « En attente de paiement » : confirmez-la après avoir vérifié le paiement. |

---

## 11. Confidentialité

- Le registre contient des données personnelles : ne laissez pas l'écran de
  l'admin visible depuis la salle d'attente, et n'exportez pas le CSV hors du
  salon.
- Le code d'accès registre n'est **jamais** à communiquer.
- L'espace d'une cliente n'est accessible qu'à elle (code WhatsApp) : ne
  demandez jamais son code à une cliente pour « l'aider », saisissez-le vous-
  même à sa place uniquement avec son accord — en général, il vaut mieux la
  laisser faire.

---

## 12. Ce que l'application ne fait pas

- **Elle ne gère pas les rendez-vous à l'heure exacte.** L'ordre de passage se
  décide entre vous.
- **Elle n'envoie ni SMS ni WhatsApp automatiques.** Le code de connexion est
  préparé dans le WhatsApp de la cliente elle-même, c'est elle qui l'envoie —
  aucun serveur ne contacte personne.
- **Elle ne supprime pas** une visite : une visite annulée reste visible dans
  le filtre *Annulés*.
- **Elle ne fonctionne pas hors-ligne.** Sans internet, rien ne se charge.
