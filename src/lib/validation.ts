import { OTHER_SERVICE_ID } from '../config/services';

export interface RegistrationFormValues {
  firstName: string;
  lastName: string;
  phone: string;
  services: string[];
  other: string;
  note: string;
}

export type RegistrationErrors = Partial<
  Record<keyof RegistrationFormValues, string>
>;

export const EMPTY_FORM: RegistrationFormValues = {
  firstName: '',
  lastName: '',
  phone: '',
  services: [],
  other: '',
  note: '',
};

/** Memes regles que `server/schemas.ts` — la validation client n'est qu'un confort. */
const PHONE_PATTERN = /^[+0-9][0-9 ().-]{5,24}$/;

export function validateRegistration(values: RegistrationFormValues): RegistrationErrors {
  const errors: RegistrationErrors = {};

  if (values.firstName.trim().length < 1) errors.firstName = 'Votre prénom est requis.';
  if (values.lastName.trim().length < 1) errors.lastName = 'Votre nom est requis.';

  const phone = values.phone.trim();
  if (!phone) {
    errors.phone = 'Votre numéro de téléphone est requis.';
  } else if (!PHONE_PATTERN.test(phone)) {
    errors.phone = 'Numéro invalide. Ex. : 01 97 00 00 00';
  }

  if (values.services.length === 0) {
    errors.services = 'Choisissez au moins une prestation.';
  } else if (values.services.includes(OTHER_SERVICE_ID) && values.other.trim().length < 2) {
    errors.other = 'Précisez votre besoin en quelques mots.';
  }

  return errors;
}

/** Normalisation identique a celle du serveur, pour que le CSV reste propre. */
export function toPayload(values: RegistrationFormValues) {
  return {
    firstName: values.firstName.trim().replace(/\s+/g, ' '),
    lastName: values.lastName.trim().replace(/\s+/g, ' '),
    phone: values.phone.trim().replace(/\s+/g, ' '),
    services: values.services,
    other: values.services.includes(OTHER_SERVICE_ID) ? values.other.trim() : '',
    note: values.note.trim(),
  };
}
