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

export const amountSchema = z.object({
  amountFcfa: z
    .number()
    .int('Le montant doit être un nombre entier.')
    .min(0, 'Le montant ne peut pas être négatif.')
    .max(100_000_000),
});

export const rewardSchema = z.object({
  title: z.string().min(1, 'Le titre est requis.').max(80).transform(clean),
  description: z.string().max(300).transform(clean).default(''),
  costFlowers: z.number().int().min(1, 'Le coût doit être au moins 1.').max(1_000_000),
  active: z.boolean().default(true),
});

export const rewardPatchSchema = rewardSchema.partial();

export const redemptionStatusSchema = z.object({
  status: z.enum(['used', 'cancelled'], { error: 'Statut inconnu.' }),
});

export const redeemSchema = z.object({
  rewardId: z.string().min(1).max(64),
});

export const phoneOnlySchema = z.object({
  phone: z
    .string()
    .min(6, 'Numéro de téléphone trop court.')
    .max(25)
    .transform(clean)
    .refine((v) => PHONE_PATTERN.test(v), 'Numéro de téléphone invalide.'),
});

export const firstVisitSchema = z.object({
  firstName: z.string().min(1, 'Le prénom est requis.').max(60).transform(clean),
  lastName: z.string().min(1, 'Le nom est requis.').max(60).transform(clean),
  phone: z
    .string()
    .min(6, 'Numéro de téléphone trop court.')
    .max(25)
    .transform(clean)
    .refine((v) => PHONE_PATTERN.test(v), 'Numéro de téléphone invalide.'),
});

export const verifyCodeSchema = z.object({
  phone: z
    .string()
    .min(6, 'Numéro de téléphone trop court.')
    .max(25)
    .transform(clean)
    .refine((v) => PHONE_PATTERN.test(v), 'Numéro de téléphone invalide.'),
  code: z.string().trim().regex(/^\d{6}$/, 'Le code fait 6 chiffres.'),
});

export const createVisitSchema = z.object({
  services: z
    .array(z.string())
    .min(1, 'Choisissez au moins une prestation.')
    .max(20, 'Trop de prestations sélectionnées.')
    .transform((list) => [...new Set(list)])
    .refine(
      (list) => list.every((id) => VALID_SERVICE_IDS.has(id) && id !== 'autre'),
      'Prestation inconnue.',
    ),
  voucherIds: z.array(z.string().min(1).max(64)).max(20).optional(),
});

export const servicePriceSchema = z.object({
  priceFcfa: z
    .number()
    .int('Le prix doit être un nombre entier.')
    .min(0, 'Le prix ne peut pas être négatif.')
    .max(100_000_000),
});

export const prospectLinkSchema = z.object({
  label: z.string().max(60).transform(clean).optional().default(''),
});

export const prospectSubmitSchema = z.object({
  firstName: z.string().min(1, 'Le prénom est requis.').max(60).transform(clean),
  lastName: z.string().min(1, 'Le nom est requis.').max(60).transform(clean),
  phone: z
    .string()
    .min(6, 'Numéro de téléphone trop court.')
    .max(25)
    .transform(clean)
    .refine((v) => PHONE_PATTERN.test(v), 'Numéro de téléphone invalide.'),
  interestServiceId: z.string().max(64).nullish(),
  consent: z.boolean().optional().default(false),
  /** Honeypot : doit rester vide. */
  website: z.string().max(0).optional(),
});

export const voucherOrderLineSchema = z.object({
  serviceId: z.string().min(1).max(64),
  quantity: z.number().int().min(1, 'Quantité minimale : 1.').max(10, 'Quantité maximale : 10.'),
});

export const createVoucherOrderSchema = z.object({
  lines: z.array(voucherOrderLineSchema).min(1, 'Le panier est vide.').max(50),
});

export const confirmOrderSchema = z.object({
  prices: z
    .array(
      z.object({
        serviceId: z.string().min(1).max(64),
        unitPriceFcfa: z
          .number()
          .int('Le prix doit être un nombre entier.')
          .min(0, 'Le prix ne peut pas être négatif.')
          .max(100_000_000),
      }),
    )
    .max(50),
});

export const applyVoucherSchema = z.object({
  code: z.string().min(3).max(24).transform(clean),
});

export const detachVoucherSchema = z.object({
  voucherId: z.string().min(1).max(64),
});

export const voucherValiditySchema = z.object({
  months: z
    .number()
    .int('La validité doit être un nombre entier de mois.')
    .min(0, 'Utilisez 0 pour une validité sans expiration.')
    .max(120),
});

export const directSaleSchema = z.object({
  clientId: z.string().min(1).max(64),
  lines: z.array(voucherOrderLineSchema).min(1).max(50),
  prices: z
    .array(
      z.object({
        serviceId: z.string().min(1).max(64),
        unitPriceFcfa: z.number().int().min(0).max(100_000_000),
      }),
    )
    .max(50),
});

export const clientCreateSchema = z.object({
  firstName: z.string().min(1, 'Le prénom est requis.').max(60).transform(clean),
  lastName: z.string().min(1, 'Le nom est requis.').max(60).transform(clean),
  phone: z
    .string()
    .min(6)
    .max(25)
    .transform(clean)
    .refine((v) => PHONE_PATTERN.test(v), 'Numéro de téléphone invalide.'),
});

export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Données invalides.';
}

/** Limite grossiere : protege d'un corps de requete abusif. */
export const BODY_LIMIT = '16kb';
