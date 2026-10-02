# Guide d'utilisation — Registre Le Printemps

Ce document est destiné au personnel du salon. Il ne demande aucune
connaissance en informatique. Tout se fait à l'écran.

L'application a **deux usages** :

| Écran | À quoi il sert | Qui s'en sert |
| --- | --- | --- |
| **La borne** (`/borne`) | Afficher le QR code à scanner | Sur la tablette, à l'accueil |
| **Le registre** (`/admin`) | Voir et suivre les clientes | Sur l'ordinateur ou la tablette de l'accueil |

---

## 1. Le principe

Une cliente scanne le QR code de la borne avec son téléphone. Elle remplit
elle-même le formulaire : prénom, nom, téléphone, prestations. La fiche
arrive **automatiquement** dans le registre, sans qu'on ait rien à recopier.

Votre travail consiste à **suivre l'avancement** de chaque cliente, pas à
saisir les informations.

---

## 2. La borne (tablette à l'accueil)

Laissez la borne allumée sur l'écran d'accueil : les clientes scannent seules.

Cet écran affiche :

- le **QR code** à scanner ;
- un bouton **Copier le lien**, si une cliente préfère qu'on lui copie
  l'adresse plutôt que de scanner ;
- un bouton **Inscrire sur place**, pour inscrire une cliente dont le téléphone
  n'a pas de caméra, ou qui préfère être assistée ;
- le **nombre d'inscriptions du jour**.

Pour changer de journée sur la borne, revenez au **registre** et changez la
date (voir section 5).

---

## 3. Se connecter au registre

1. Ouvrez l'adresse du registre dans le navigateur.
2. Un pavé numérique s'affiche. Tapez les **4 chiffres** de votre code : la
   connexion se fait toute seule, il n'y a rien à valider à la main.
3. Vous arrivez sur le registre.

Un bouton **Effacer** permet de recommencer, et **Valider le code** sert si
rien ne s'est déclenché.

La session reste ouverte **12 heures**. Vous n'avez donc rien à refaire à
chaque cliente.

Pour quitter, bouton **Sortir**, en haut à droite.

### Si le code est refusé

- **« Code incorrect. »** — erreur de frappe. Reprenez calmement.
- **« Trop de tentatives. Réessayez dans X minute(s). »** — après 5 essais de
  suite, l'accès est bloqué un moment. **Attendez le temps indiqué**, puis
  recommencez. Si c'est vous et non une autre personne, il n'y a rien de
  cassé.

> Après plusieurs blocages successifs, la durée augmente (1 minute, puis 2,
> 4… jusqu'à 30 minutes maximum). C'est normal.

> **Le code n'est à donner à personne.** Une personne qui l'a peut lire le
> nom et le téléphone de toutes les clientes.

---

## 4. Lire la liste

Chaque cliente apparaît dans une carte indiquant :

- son **nom** et son **prénom** ;
- un **statut** : *En attente*, *Terminé* ou *Annulé* ;
- son **téléphone** — **cliquable** : sur une tablette ou un téléphone, appuyez
  dessus pour l'appeler directement ;
- les **prestations** demandées, en petites étiquettes ;
- si elle a choisi **Autre**, sa précision entre guillemets juste en dessous ;
- l'heure à laquelle elle s'est inscrite, en bas de la carte ;
- une éventuelle **note** laissée par la cliente (allergie, demande particulière).

Lisez toujours la **note** : c'est là que la cliente signale une allergie ou
une demande particulière.

---

## 5. Les filtres et la recherche

En haut de la liste, quatre boutons filtres, chacun avec son nombre :

| Filtre | Sert à |
| --- | --- |
| **Tous** | la journée complète |
| **En attente** | celles qui ne sont pas encore passées |
| **Terminés** | celles qui sont passées |
| **Annulés** | celles qui ne viendront pas |

La **barre de recherche** filtre à la volée sur le nom, le téléphone ou la
prestation. Tapez deux ou trois lettres : la liste se réduit.

Le champ **date** affiche la journée. Il est déjà positionné sur aujourd'hui.
Changez-le pour consulter un autre jour — utile en fin de journée pour vérifier
que tout le monde a bien été servie.

Les fiches s'affichent **de la plus récente à la plus ancienne** : une cliente
qui vient de s'inscrire apparaît donc en haut de la liste.

> **La liste ne se met pas à jour toute seule.** Si une cliente vient de
> scanner le QR et que rien n'apparaît, appuyez sur **Actualiser**. Prenez
> l'habitude de le faire de temps en temps pendant les heures rushes, et
> toujours avant de servir la personne suivante.

---

## 6. Changer le statut d'une cliente

Trois boutons à droite de chaque carte. Agissez sur la cliente concernée :

| Bouton | Quand l'utiliser |
| --- | --- |
| **Terminé** | la prestation a été faite |
| **Annuler** | la cliente ne vient pas, ou a été annulée |
| **Réactiver** | remise en attente : une erreur a été faite |

Seuls les boutons utiles s'affichent, selon l'état de la fiche :

| Statut actuel | Boutons affichés |
| --- | --- |
| En attente | Terminé · Annuler |
| Terminé | Réactiver · Annuler |
| Annulé | Terminé · Réactiver |

**Exemple de journée type :**

1. La cliente s'inscrit → statut **En attente**.
2. Elle arrive et est servie → appuyez sur **Terminé**.
3. Elle part sans être servie → appuyez sur **Annuler**.
4. Vous vous êtes trompée de cliente sur le 3. → appuyez sur **Réactiver** pour
   la remettre en attente.

Le changement est enregistré immédiatement et les compteurs des filtres se
mettent à jour.

---

## 7. Exporter la journée (CSV)

Le bouton **Exporter CSV** envoie un fichier que vous ouvrez avec Excel ou
LibreOffice. Il contient les inscriptions **de la journée affichée**, pas
seulement celles du filtre sélectionné.

Les accents sont corrects à l'ouverture, ce n'est pas un fichier illisible.

---

## 8. En cas de problème

| Situation | Que faire |
| --- | --- |
| **« Session expirée. Reconnectez-vous. »** | Revenez au pavé numérique et retapez le code. Cela arrive après 12 heures. |
| **« Trop de tentatives »** | Attendez le temps annoncé. |
| **La liste reste vide** | La cliente ne s'est peut-être pas encore inscrite. Sinon, vérifiez la **connexion internet** et appuyez sur **Actualiser**. |
| **Une cliente apparaît deux fois** | Elle a scanné le QR deux fois. Comme la plus récente est en haut, gardez celle du haut et mettez **Annuler** sur celle du dessous. |
| **La borne affiche une erreur** | Vérifiez le Wi-Fi. La borne a besoin d'internet pour afficher le QR. |
| **Le code ne fonctionne sur aucun appareil** | Signalez-le : le code enregistré côté serveur a peut-être été modifié. |

---

## 9. Confidentialité

Le registre contient le **nom et le téléphone** des clientes. Ce sont des
données personnelles.

- Ne laissez pas le registre ouvert sur un écran visible de la salle d'attente.
- Ne communiquez le code à personne, y compris à un collègue de confiance : le
  registre est commun à toute l'équipe, un seul code suffit.
- Ne partagez pas le fichier CSV à l'extérieur du salon.
- Aucune donnée n'est supprimée automatiquement. Si une cliente demande que
  ses informations soient effacées, dites-le : la suppression se fait
  manuellement.

---

## 10. Ce que l'application ne fait pas

Mieux vaut le savoir :

- **Elle ne gère pas les rendez-vous à l'heure exacte.** Elle compte
  l'arrivée dans l'ordre des inscriptions ; l'ordre de passage se décide
  entre vous.
- **Elle n'envoie aucun message** à la cliente. Le confirmateur
  « Merci ! » reste affiché sur l'écran de la cliente, il n'y a ni SMS ni
  e-mail.
- **Elle n'a pas d'historique des jours précédents** en dehors de la
  recherche par date, et l'export ne porte que sur la journée choisie.
- **Elle ne supprime pas** une fiche. Une cliente annulée reste visible dans
  le filtre *Annulés*.
- **Elle ne fonctionne pas hors ligne.** Sans internet, ni le QR ni le
  registre ne s'affichent.
