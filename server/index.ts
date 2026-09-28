import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';

import { isPinConfigured, issueToken, readToken, verifyPin, verifyToken, warnAboutAuthConfig } from './auth.ts';
import { BODY_LIMIT, createSchema, firstError, loginSchema, statusSchema } from './schemas.ts';
import { countForDay, createRegistration, listRegistrations, setStatus } from './store.ts';
import { serviceLabel } from '../src/config/services.ts';
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
    const updated = await setStatus(id, parsed.data.status);
    if (!updated) {
      res.status(404).json({ error: 'Inscription introuvable.' });
      return;
    }
    res.json(updated);
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

api.post('/auth/login', (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'PIN requis.' });
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
  if (!verifyPin(parsed.data.pin)) {
    res.status(401).json({ error: 'Code incorrect.' });
    return;
  }
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
app.listen(PORT, HOST, () => {
  console.log(`  ➜  API Le Printemps : http://localhost:${PORT}`);
  if (existsSync(DIST)) console.log('  ➜  Front servi depuis dist/');
});
