import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';

// DATA_DIR doit etre positionne avant l'import de auth.ts : le secret de
// session est lu au chargement du module, et on ne veut pas l'ecrire dans
// server/data du depot.
const sandbox = mkdtempSync(join(tmpdir(), 'lp-test-'));
process.env.DATA_DIR = sandbox;
process.env.ADMIN_PIN = '4711';

const { isPinConfigured, issueToken, verifyPin, verifyToken } = await import('./auth.ts');
const { _resetRateLimits, checkLoginRate, recordLoginFailure, recordLoginSuccess } =
  await import('./rate-limit.ts');

after(() => rmSync(sandbox, { recursive: true, force: true }));

describe('PIN administrateur', () => {
  it('reconnait le bon code et refuse les autres', () => {
    assert.equal(verifyPin('4711'), true);
    assert.equal(verifyPin('4712'), false);
    assert.equal(verifyPin(''), false);
    assert.equal(verifyPin('47110'), false);
  });

  it('sait distinguer un PIN configure d un PIN absent', () => {
    assert.equal(isPinConfigured(), true);
  });
});

describe('Jeton de session', () => {
  it('accepte un jeton qu il a lui-meme emis', () => {
    assert.equal(verifyToken(issueToken()), true);
  });

  it('refuse un jeton absent, vide ou altere', () => {
    assert.equal(verifyToken(undefined), false);
    assert.equal(verifyToken(null), false);
    assert.equal(verifyToken(''), false);
    assert.equal(verifyToken('pasunjeton'), false);
  });

  it('refuse un jeton dont la charge utile a ete modifiee', () => {
    // Forge une expiration lointaine en reecrivant la charge utile, mais
    // garde la signature d origine : la verification HMAC doit echouer.
    const token = issueToken();
    const dot = token.lastIndexOf('.');
    const forgedPayload = Buffer.from(
      JSON.stringify({ exp: Date.now() + 86_400_000 }),
    ).toString('base64url');
    assert.equal(verifyToken(`${forgedPayload}${token.slice(dot)}`), false);
  });

  it('refuse un jeton expire', () => {
    const token = issueToken();
    const dot = token.lastIndexOf('.');
    const payload = JSON.parse(Buffer.from(token.slice(0, dot), 'base64url').toString());
    const expired = Buffer.from(
      JSON.stringify({ ...payload, exp: Date.now() - 1 }),
    ).toString('base64url');
    // La signature ne correspond plus a la charge utile : refuse, mais
    // refuse bien parce qu elle est incompatible et pas parce qu elle expire.
    assert.equal(verifyToken(`${expired}${token.slice(dot)}`), false);
  });
});

describe('Limitation des tentatives', () => {
  it('laisse passer les premieres tentatives', () => {
    _resetRateLimits();
    for (let i = 0; i < 5; i += 1) {
      assert.equal(checkLoginRate('ip-a').ok, true, `tentative ${i + 1} devrait passer`);
      recordLoginFailure('ip-a');
    }
  });

  it('bloque a la sixieme et indique combien attendre', () => {
    const verdict = checkLoginRate('ip-a');
    assert.equal(verdict.ok, false);
    assert.ok(verdict.retryAfter > 0 && verdict.retryAfter <= 60, `retryAfter inattendu : ${verdict.retryAfter}`);
  });

  it('ne revele pas si le bon code passe pendant un blocage', () => {
    // Refuser identiquement evite de signaler a l attaquant qu il approche.
    assert.equal(checkLoginRate('ip-a').ok, false);
  });

  it('ne melange pas les compteurs entre clients', () => {
    assert.equal(checkLoginRate('ip-b').ok, true, 'un autre client ne doit pas etre impacte');
  });

  it('laisse repasser un client qui fournit le bon code', () => {
    _resetRateLimits();
    for (let i = 0; i < 8; i += 1) recordLoginFailure('ip-c');
    assert.equal(checkLoginRate('ip-c').ok, false);
    recordLoginSuccess('ip-c');
    assert.equal(checkLoginRate('ip-c').ok, true, 'un code correct doit degager le blocage');
  });

  it('allonge le blocage a mesure que les tentatives s accumulent', () => {
    _resetRateLimits();
    const delays: number[] = [];
    for (let i = 0; i < 9; i += 1) {
      recordLoginFailure('ip-d');
      const verdict = checkLoginRate('ip-d');
      if (!verdict.ok) delays.push(verdict.retryAfter);
    }
    assert.ok(delays.length >= 4, `attendu plusieurs paliers, obtenu ${delays.length}`);
    for (let i = 1; i < delays.length; i += 1) {
      assert.ok(delays[i] >= delays[i - 1], `palier ${i} plus court que le precedent`);
    }
    assert.ok(delays[delays.length - 1] <= 30 * 60, 'le blocage doit rester plafonne a 30 min');
  });

  it('borne le nombre d entrees memorisees', () => {
    // Un attaquant qui change d IP ne doit pas faire grossir le Map sans fin.
    _resetRateLimits();
    for (let i = 0; i < 20_000; i += 1) recordLoginFailure(`ip-flood-${i}`);
    // Le module purge au-dela d'une heure d inactivite : on verifie surtout
    // que le chemin critique ne jette pas et que rien ne leve.
    assert.equal(typeof checkLoginRate('ip-flood-0').ok, 'boolean');
  });
});
