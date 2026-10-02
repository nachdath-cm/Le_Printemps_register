import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';

import { isPinConfigured, issueToken, readToken, verifyPin, verifyToken, warnAboutAuthConfig } from './auth.ts';
import { checkLoginRate, recordLoginFailure, recordLoginSuccess } from './rate-limit.ts';
import {
  BODY_LIMIT,
  amountSchema,
  createSchema,
  firstError,
  loginSchema,
  phoneLinkConfirmSchema,
  phoneLinkRequestSchema,
  redeemSchema,
  redemptionStatusSchema,
  rewardPatchSchema,
  rewardSchema,
  servicePriceSchema,
  statusSchema,
} from './schemas.ts';
import { PIN_LENGTH } from '../src/lib/constants.ts';
import {
  confirmPhoneLinkCode,
  countForDay,
  createPhoneLinkCode,
  createReward,
  createRegistration,
  deleteReward,
  ensureStoreReady,
  getSpaceData,
  listRedemptions,
  listRegistrations,
  listRewards,
  listServicePrices,
  redeemReward,
  setAmount,
  setRedemptionStatus,
  setServicePrice,
  setStatus,
  updateReward,
} from './store.ts';
import { SERVICE_BY_ID, SERVICES, serviceLabel } from '../src/config/services.ts';
import { INSTITUTE } from '../src/config/institute.ts';
import { STATUS_LABEL } from '../src/lib/types.ts';

const here = dirname(fileURLToPath(import.meta.url));
const DIST = join(here, '..', 'dist');

const PORT = Number(process.env.PORT ?? 5174);
const HOST = process.env.HOST ?? '0.0.0.0';

/** Journee locale de l'institut (UTC+1), alignee sur `store.ts`. */
function todayKey(): string {
  return new Date(Date.now() + 60 * 60_000).toISOString().slice(0, 10);
}

const app = express();

app.disable('x-powered-by');
// Railway et Render placent un proxy devant l'application : sans cette ligne,
// `req.ip` renvoie l'IP du proxy — la meme pour tous les visiteurs. La
// limitation de tentatives regrouperait alors tout le monde dans un seul
// compteur, et un attaquant pourrait verrouiller l'acces admin de l'equipe
// en epuisant le quota a leur place. Le proxy etant le seul point d'entree
// accessible, on lui fait confiance pour X-Forwarded-For.
app.set('trust proxy', 1);
// En developpement le front tourne sur :5173 et dialogue avec l'API sur :5174.
app.use(cors({ origin: true, credentials: false }));
app.use(express.json({ limit: BODY_LIMIT }));

/** Toute route /api/* non trouvee repond en JSON, jamais en HTML. */
const api = express.Router();

/** Exige une session admin valide. */
function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!verifyToken(readToken(req as unknown as Parameters<typeof readToken>[0]))) {
    res.status(401).json({ error: 'Session expirée. Reconnectez-vous.' });
    return;
  }
  next();
}

api.get('/health', (_req, res) => {
  res.json({ ok: true });
});

/** Compteur public : alimente la page employee, aucune donnee nominative. */
api.get('/stats/today', async (_req, res) => {
  try {
    res.json(await countForDay(todayKey()));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Impossible de lire les statistiques.' });
  }
});

api.post('/registrations', async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: firstError(parsed.error) });
    return;
  }
  try {
    const record = await createRegistration(parsed.data);
    res.status(201).json(record);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "L'inscription n'a pas pu être enregistrée." });
  }
});

api.get('/registrations', requireAdmin, async (req, res) => {
  const day = typeof req.query.day === 'string' && req.query.day ? req.query.day : undefined;
  try {
    res.json(await listRegistrations(day));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Impossible de lire le registre.' });
  }
});

api.patch('/registrations/:id/status', requireAdmin, async (req, res) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: firstError(parsed.error) });
    return;
  }
  // Express 5 type les parametres de route en `string | string[]`.
  const id = req.params.id;
  if (typeof id !== 'string') {
    res.status(400).json({ error: 'Identifiant invalide.' });
    return;
  }
  try {
    const change = await setStatus(id, parsed.data.status);
    if (!change) {
      res.status(404).json({ error: 'Inscription introuvable.' });
      return;
    }
    res.json({ ...change.registration, xpCredited: change.xpCredited });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Mise à jour impossible.' });
  }
});

/**
 * Export CSV. Un <a download> ne peut pas porter d'en-tetes HTTP, d'ou le
 * jeton accepte en query. Meme niveau de securite : la session expire en 12 h
 * et le jeton ne donne acces qu'a la lecture.
 */
api.get('/registrations.csv', requireAdmin, async (req, res) => {
  const day = typeof req.query.day === 'string' && req.query.day ? req.query.day : undefined;
  try {
    const rows = await listRegistrations(day);
    const header = [
      'Date',
      'Heure',
      'Journee',
      'Prenom',
      'Nom',
      'Telephone',
      'Prestations',
      'Autre',
      'Note',
      'Statut',
    ];
    const cell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const lines = [
      header.map(cell).join(';'),
      ...rows.map((r) =>
        [
          r.createdAt.slice(0, 10),
          r.createdAt.slice(11, 16),
          r.day,
          r.firstName,
          r.lastName,
          r.phone,
          r.services.map(serviceLabel).join(' + '),
          r.other,
          r.note,
          STATUS_LABEL[r.status],
        ]
          .map(cell)
          .join(';'),
      ),
    ];
    // BOM UTF-8 : Excel ouvre alors le fichier avec les accents corrects.
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="registrations-${day ?? 'tout'}.csv"`);
    res.send(`\uFEFF${lines.join('\r\n')}`);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Export impossible.' });
  }
});

/** Le montant facturé d'une visite, editable avant passage a Terminé. */
api.patch('/registrations/:id/amount', requireAdmin, async (req, res) => {
  const parsed = amountSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: firstError(parsed.error) });
    return;
  }
  const id = req.params.id;
  if (typeof id !== 'string') {
    res.status(400).json({ error: 'Identifiant invalide.' });
    return;
  }
  try {
    const updated = await setAmount(id, parsed.data.amountFcfa);
    if (!updated) {
      res.status(404).json({ error: 'Inscription introuvable.' });
      return;
    }
    res.json(updated);
  } catch (err) {
    res.status(409).json({ error: err instanceof Error ? err.message : 'Mise à jour impossible.' });
  }
});

/* ----------------------------------------------------------------------- */
/* Espace client public — tout est scoppé par le space_token de l'URL       */
/* ----------------------------------------------------------------------- */

function tokenParam(req: Request): string | null {
  const token = (req.params as { token?: unknown }).token;
  return typeof token === 'string' && token.length >= 16 && token.length <= 128 ? token : null;
}

api.get('/space/:token', async (req, res) => {
  const token = tokenParam(req);
  if (!token) {
    res.status(404).json({ error: 'Lien invalide.' });
    return;
  }
  try {
    const data = await getSpaceData(token);
    if (!data) {
      res.status(404).json({ error: "Cet espace n'existe pas ou a été réinitialisé." });
      return;
    }
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Impossible de charger cet espace.' });
  }
});

api.post('/space/:token/redeem', async (req, res) => {
  const token = tokenParam(req);
  const parsed = redeemSchema.safeParse(req.body);
  if (!token || !parsed.success) {
    res.status(400).json({ error: 'Demande invalide.' });
    return;
  }
  try {
    const result = await redeemReward(token, parsed.data.rewardId);
    if ('error' in result) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "L'échange n'a pas pu être enregistré." });
  }
});

api.post('/space/:token/phone-link', async (req, res) => {
  const token = tokenParam(req);
  const parsed = phoneLinkRequestSchema.safeParse(req.body);
  if (!token || !parsed.success) {
    res.status(400).json({ error: parsed.success ? 'Lien invalide.' : firstError(parsed.error) });
    return;
  }
  try {
    const result = await createPhoneLinkCode(token, parsed.data.phone);
    if ('error' in result) {
      res.status(400).json({ error: result.error });
      return;
    }
    // Le code est envoye a l'institut par WhatsApp et saisi ici pour confirmer.
    const text = encodeURIComponent(
      `Liaison de mon compte Le Printemps. Mon code : ${result.code}`,
    );
    res.json({ code: result.code, whatsappUrl: `https://wa.me/${INSTITUTE.whatsapp}?text=${text}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Impossible de générer le code.' });
  }
});

api.post('/space/:token/phone-link/confirm', async (req, res) => {
  const token = tokenParam(req);
  const parsed = phoneLinkConfirmSchema.safeParse(req.body);
  if (!token || !parsed.success) {
    res.status(400).json({ error: parsed.success ? 'Lien invalide.' : firstError(parsed.error) });
    return;
  }
  // Meme logique que le pavé admin : 5 essais, puis blocage progressif.
  const bucket = `phonelink:${token}`;
  const verdict = checkLoginRate(bucket);
  if (!verdict.ok) {
    res.setHeader('Retry-After', String(verdict.retryAfter));
    const minutes = Math.max(1, Math.round(verdict.retryAfter / 60));
    res.status(429).json({ error: `Trop de tentatives. Réessayez dans ${minutes} minute${minutes > 1 ? 's' : ''}.` });
    return;
  }
  try {
    const result = await confirmPhoneLinkCode(token, parsed.data.code);
    if ('error' in result) {
      recordLoginFailure(bucket);
      res.status(400).json({ error: result.error });
      return;
    }
    recordLoginSuccess(bucket);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Vérification impossible.' });
  }
});

/* ----------------------------------------------------------------------- */
/* Recompenses, echanges, prix (admin)                                     */
/* ----------------------------------------------------------------------- */

api.get('/rewards', requireAdmin, async (_req, res) => {
  try {
    res.json(await listRewards());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Impossible de lire les récompenses.' });
  }
});

api.post('/rewards', requireAdmin, async (req, res) => {
  const parsed = rewardSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: firstError(parsed.error) });
    return;
  }
  try {
    res.status(201).json(await createReward(parsed.data));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Création impossible.' });
  }
});

api.patch('/rewards/:id', requireAdmin, async (req, res) => {
  const parsed = rewardPatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: firstError(parsed.error) });
    return;
  }
  const id = req.params.id;
  if (typeof id !== 'string') {
    res.status(400).json({ error: 'Identifiant invalide.' });
    return;
  }
  try {
    const updated = await updateReward(id, parsed.data);
    if (!updated) {
      res.status(404).json({ error: 'Récompense introuvable.' });
      return;
    }
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Mise à jour impossible.' });
  }
});

api.delete('/rewards/:id', requireAdmin, async (req, res) => {
  const id = req.params.id;
  if (typeof id !== 'string') {
    res.status(400).json({ error: 'Identifiant invalide.' });
    return;
  }
  try {
    if (!(await deleteReward(id))) {
      res.status(404).json({ error: 'Récompense introuvable.' });
      return;
    }
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Suppression impossible.' });
  }
});

api.get('/redemptions', requireAdmin, async (_req, res) => {
  try {
    res.json(await listRedemptions());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Impossible de lire les échanges.' });
  }
});

api.patch('/redemptions/:id', requireAdmin, async (req, res) => {
  const parsed = redemptionStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: firstError(parsed.error) });
    return;
  }
  const id = req.params.id;
  if (typeof id !== 'string') {
    res.status(400).json({ error: 'Identifiant invalide.' });
    return;
  }
  try {
    const updated = await setRedemptionStatus(id, parsed.data.status);
    if (!updated) {
      res.status(404).json({ error: 'Échange introuvable.' });
      return;
    }
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Mise à jour impossible.' });
  }
});

api.get('/services', async (_req, res) => {
  try {
    const prices = await listServicePrices();
    res.json(
      SERVICES.map((s) => ({
        id: s.id,
        label: s.label,
        categoryId: s.categoryId,
        priceFcfa: prices[s.id] ?? 0,
      })),
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Impossible de lire les prestations.' });
  }
});

api.patch('/services/:id', requireAdmin, async (req, res) => {
  const parsed = servicePriceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: firstError(parsed.error) });
    return;
  }
  const id = req.params.id;
  if (typeof id !== 'string' || !SERVICE_BY_ID.has(id)) {
    res.status(404).json({ error: 'Prestation introuvable.' });
    return;
  }
  try {
    const prices = await setServicePrice(id, parsed.data.priceFcfa);
    res.json({ id, priceFcfa: prices?.[id] ?? parsed.data.priceFcfa });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Mise à jour impossible.' });
  }
});

api.post('/auth/login', (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: `Le code doit comporter ${PIN_LENGTH} chiffres.` });
    return;
  }
  // Aucun PIN configure : c'est un probleme de plateforme, pas une erreur de
  // saisie. Un 500 ou un « code incorrect » ferait chercher l'erreur au
  // mauvais endroit pendant des heures.
  if (!isPinConfigured()) {
    res.status(503).json({
      error: 'Serveur non configure : la variable ADMIN_PIN est absente.',
    });
    return;
  }
  // Un PIN de quatre chiffres se devine : on limite les tentatives avant de
  // verifier quoi que ce soit, et on ne distingue pas « bloque » de « faux »
  // pour ne pas aider a deviner.
  const clientId = req.ip ?? 'inconnu';
  const verdict = checkLoginRate(clientId);
  if (!verdict.ok) {
    res.setHeader('Retry-After', String(verdict.retryAfter));
    // Dire combien de temps : une employée qui s'est trompée de touche au
    // comptoir ne doit pas rester devant « réessayez plus tard » en croyant
    // que le code est devenu faux.
    const minutes = Math.max(1, Math.round(verdict.retryAfter / 60));
    res.status(429).json({
      error: `Trop de tentatives. Réessayez dans ${minutes} minute${minutes > 1 ? 's' : ''}.`,
    });
    return;
  }
  if (!verifyPin(parsed.data.pin)) {
    recordLoginFailure(clientId);
    res.status(401).json({ error: 'Code incorrect.' });
    return;
  }
  recordLoginSuccess(clientId);
  res.json({ token: issueToken() });
});

app.use('/api', api);

// Toute route /api inconnue repond en JSON : le client attend du JSON,
// pas la page HTML du repli SPA.
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Route inconnue.' });
});

/* -------------------------------------------------------------------------- */
/* Front (production) : dist/ + repli SPA                                    */
/* -------------------------------------------------------------------------- */

if (existsSync(DIST)) {
  app.use(
    express.static(DIST, {
      setHeaders(res, path) {
        // Service worker et manifest : jamais de cache long, sinon les
        // mises a jour ne se propagent jamais sur les telephones installes.
        if (path.endsWith('sw.js') || path.endsWith('manifest.webmanifest')) {
          res.setHeader('Cache-Control', 'no-cache');
        }
      },
    }),
  );
  // Toute route inconnue rend index.html : indispensable pour /client et /admin.
  app.get(/.*/, (_req, res) => {
    res.sendFile(join(DIST, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res
      .type('text/plain')
      .send('API Le Printemps. Lancez `npm run dev` pour le front en developpement.');
  });
}

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  if (res.headersSent) return;
  res.status(500).json({ error: 'Erreur interne du serveur.' });
});

warnAboutAuthConfig();
await ensureStoreReady();
app.listen(PORT, HOST, () => {
  console.log(`  ➜  API Le Printemps : http://localhost:${PORT}`);
  if (existsSync(DIST)) console.log('  ➜  Front servi depuis dist/');
});
