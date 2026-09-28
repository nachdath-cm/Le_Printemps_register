import { PIN_LENGTH } from '../src/lib/constants.ts';
import { z } from 'zod';

import { OTHER_SERVICE_ID, VALID_SERVICE_IDS } from '../src/config/services.ts';
import { REGISTRATION_STATUSES } from '../src/lib/types.ts';

/**
 * Validation des entrees reseau.
 * L'endpoint de creation est public (le QR est lu par n'importe quel
 * telephone) : aucune donnee n'est ecrite sans passer par ce schema.
 */

const PHONE_PATTERN = /^[+0-9][0-9 ().-]{5,24}$/;

/** Les navigateurs envoient des espaces insecables ; on les normalise. */
const clean = (value: string) => value.replace(/\s+/g, ' ').trim();

const createSchemaBase = z.object({
  firstName: z.string().min(1, 'Le prénom est requis.').max(60).transform(clean),
  lastName: z.string().min(1, 'Le nom est requis.').max(60).transform(clean),
  phone: z
    .string()
    .min(6, 'Numéro de téléphone trop court.')
    .max(25)
    .transform(clean)
    .refine((v) => PHONE_PATTERN.test(v), 'Numéro de téléphone invalide.'),
  services: z
    .array(z.string())
    .min(1, 'Choisissez au moins une prestation.')
    .max(20, 'Trop de prestations sélectionnées.')
    .transform((list) => [...new Set(list)])
    .refine(
      (list) => list.every((id) => VALID_SERVICE_IDS.has(id)),
      'Prestation inconnue.',
    ),
  other: z.string().max(300, 'Précision trop longue.').transform(clean).default(''),
  note: z.string().max(300, 'Note trop longue.').transform(clean).default(''),
});

/**
 * Si « Autre » est coche, la precision est obligatoire — et inversement on
 * ignore une precision orpheline pour ne pas stocker du bruit.
 */
export const createSchema = createSchemaBase.superRefine((data, ctx) => {
  const hasOther = data.services.includes(OTHER_SERVICE_ID);
  if (hasOther && data.other.length < 2) {
    ctx.addIssue({
      code: 'custom',
      path: ['other'],
      message: 'Précisez votre besoin dans le champ « Autre ».',
    });
  }
});

export const statusSchema = z.object({
  status: z.enum(REGISTRATION_STATUSES, {
    // Sans message explicite, zod renvoie son texte anglais dans l'API.
    error: 'Statut inconnu.',
  }),
});

export const loginSchema = z.object({
  pin: z.string().regex(new RegExp(`^\\d{${PIN_LENGTH}}$`)),
});

export type CreatePayload = z.infer<typeof createSchema>;

export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Données invalides.';
}

/** Limite grossiere : protege d'un corps de requete abusif. */
export const BODY_LIMIT = '16kb';
