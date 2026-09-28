/**
 * Constantes partagees entre le front et le serveur.
 *
 * Le serveur importe deja des modules de `src/` (voir `server/index.ts`), et
 * l'inverse se passe aussi : la longueur du PIN doit etre la meme dans le
 * pave numerique et dans la validation de l'API, sinon l'interface envoie
 * une saisie que le serveur refuse.
 */

/** Longueur du code administrateur, en chiffres. */
export const PIN_LENGTH = 4;
