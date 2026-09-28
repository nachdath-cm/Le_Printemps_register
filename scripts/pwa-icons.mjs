/**
 * Derive les icones PWA depuis `public/logo.png`.
 *
 * Le logo est depose a la main par le proprietaire ; ce script se contente de
 * produire les tailles attendues par le manifeste et iOS, sans ajouter de
 * dependance native (sharp / imagemagick) au projet.
 *
 *   node scripts/pwa-icons.mjs
 *
 * Si `public/logo.png` est absent, le script ne casse pas le build : il
 * signale clairement ce qu'il faut faire.
 */

import { existsSync, statSync } from 'node:fs';
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { deflateSync, inflateSync } from 'node:zlib';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = join(root, 'public');
const source = join(publicDir, 'logo.png');

if (!existsSync(source)) {
  console.warn(
    '\n  ⚠  public/logo.png est introuvable — icônes PWA non générées.\n' +
      '     Déposez votre logo dans public/logo.png puis relancez : npm run icons\n',
  );
  process.exit(0);
}

/* -------------------------------------------------------------------------
 * Lecture du PNG : en-tete + decompression des lignes de pixels.
 * ---------------------------------------------------------------------- */

function readPng(buffer) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (!buffer.subarray(0, 8).equals(signature)) {
    throw new Error('logo.png : signature PNG invalide.');
  }

  let offset = 8;
  let header = null;
  const idat = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length; // longueur + type + data + CRC

    if (type === 'IHDR') {
      header = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        bitDepth: data[8],
        colorType: data[9],
        interlace: data[12],
      };
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }

  if (!header) throw new Error('logo.png : bloc IHDR manquant.');
  if (header.interlace !== 0) throw new Error('logo.png : image entrelacee non geree.');
  if (header.bitDepth !== 8) {
    throw new Error(`logo.png : profondeur ${header.bitDepth} bits non geree (8 attendu).`);
  }

  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[header.colorType];
  if (!channels) throw new Error(`logo.png : colorType ${header.colorType} non gere.`);

  const raw = inflate(idat);
  const { width, height } = header;
  const stride = width * channels;
  const pixels = Buffer.alloc(height * stride);

  // Reconstruction des filtres PNG (None / Sub / Up / Average / Paeth).
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    const out = pixels.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? pixels.subarray((y - 1) * stride, y * stride) : null;

    for (let x = 0; x < stride; x++) {
      const rawByte = line[x];
      const a = x >= channels ? out[x - channels] : 0;
      const b = prev ? prev[x] : 0;
      const c = prev && x >= channels ? prev[x - channels] : 0;

      let value;
      switch (filter) {
        case 0: value = rawByte; break;
        case 1: value = rawByte + a; break;
        case 2: value = rawByte + b; break;
        case 3: value = rawByte + ((a + b) >> 1); break;
        case 4: value = rawByte + paeth(a, b, c); break;
        default: throw new Error(`logo.png : filtre PNG inconnu (${filter}).`);
      }
      out[x] = value & 0xff;
    }
  }

  return { width, height, channels, colorType: header.colorType, pixels };
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

function inflate(chunks) {
  return inflateSync(Buffer.concat(chunks));
}

/* -------------------------------------------------------------------------
 * Ecriture d'un PNG RGBA, filtre 0 sur chaque ligne.
 * ---------------------------------------------------------------------- */

function crc32(buffer) {
  let crc = ~0;
  for (let i = 0; i < buffer.length; i++) {
    crc ^= buffer[i];
    for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([length, typeAndData, crc]);
}

function writePng(path, width, height, rgba) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // profondeur
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const rawWithFilter = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    rawWithFilter[y * (stride + 1)] = 0;
    rgba.copy(rawWithFilter, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  writeFileSync(
    path,
    Buffer.concat([
      signature,
      chunk('IHDR', ihdr),
      chunk('IDAT', deflateSync(rawWithFilter, { level: 9 })),
      chunk('IEND', Buffer.alloc(0)),
    ]),
  );
}

/* -------------------------------------------------------------------------
 * Echantillonnage bilineaire, avec composition source-over du fond.
 *
 * Le fond est important : iOS affiche les PNG transparents sur du noir, on
 * garantit donc une icone opaque. `padding` reserve une marge de securite
 * pour les icones « maskable », dont Android rogne la zone sure.
 * ---------------------------------------------------------------------- */

function resize(image, targetW, targetH, { padding = 0, background = [255, 255, 255, 255] } = {}) {
  const { width, height, channels, pixels } = image;
  const out = Buffer.alloc(targetW * targetH * 4);

  // Le logo est recadre, donc rarement carre : on le "fit" (contain) dans la
  // zone utile plutot que de l'etirer, sans quoi le sigle serait deforme.
  const availW = targetW * (1 - padding * 2);
  const availH = targetH * (1 - padding * 2);
  const scale = Math.min(availW / width, availH / height);
  const drawW = width * scale;
  const drawH = height * scale;
  const offX = (targetW - drawW) / 2;
  const offY = (targetH - drawH) / 2;

  const sample = (px, py) => {
    const i = (py * width + px) * channels;
    if (channels >= 3) {
      return [pixels[i], pixels[i + 1], pixels[i + 2], channels === 4 ? pixels[i + 3] : 255];
    }
    // Gris ou gris-alpha : on duplique le canal.
    return [pixels[i], pixels[i], pixels[i], 255];
  };

  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      const o = (y * targetW + x) * 4;

      // Hors de la zone de dessin : le fond seul (marge d'une icone maskable).
      let src = null;
      if (x >= offX && x < offX + drawW && y >= offY && y < offY + drawH) {
        const u = ((x - offX) / drawW) * width - 0.5;
        const v = ((y - offY) / drawH) * height - 0.5;
        const x0 = Math.max(0, Math.min(width - 1, Math.floor(u)));
        const y0 = Math.max(0, Math.min(height - 1, Math.floor(v)));
        const x1 = Math.min(width - 1, x0 + 1);
        const y1 = Math.min(height - 1, y0 + 1);
        const fx = Math.max(0, Math.min(1, u - x0));
        const fy = Math.max(0, Math.min(1, v - y0));

        const c00 = sample(x0, y0);
        const c10 = sample(x1, y0);
        const c01 = sample(x0, y1);
        const c11 = sample(x1, y1);

        src = [0, 0, 0, 0];
        for (let c = 0; c < 4; c++) {
          const top = c00[c] * (1 - fx) + c10[c] * fx;
          const bottom = c01[c] * (1 - fx) + c11[c] * fx;
          src[c] = top * (1 - fy) + bottom * fy;
        }
      }

      // Composition source-over, en espace non premultiplie.
      const sa = (src ? src[3] : 0) / 255;
      const da = background[3] / 255;
      const alpha = sa + da * (1 - sa);

      for (let c = 0; c < 3; c++) {
        const top = (src ? src[c] : 0) * sa;
        const bottom = background[c] * da * (1 - sa);
        out[o + c] = alpha === 0 ? 0 : Math.round((top + bottom) / alpha);
      }
      out[o + 3] = Math.round(alpha * 255);
    }
  }

  return { width: targetW, height: targetH, rgba: out };
}

function save(path, size, image, options) {
  const scaled = resize(image, size, size, options);
  writePng(path, scaled.width, scaled.height, scaled.rgba);
}

/* -------------------------------------------------------------------------
 * Recadrage automatique.
 *
 * Les logos livres « tels quels » comportent souvent une grande zone vide
 * autour du sigle (fond blanc exporte par un logiciel de dessin). Sans
 * recadrage, l'icone PWA n'afficherait qu'un petit trait au milieu d'un carre
 * vide. On detecte donc le fond uniforme — echantillonne dans les coins — puis
 * on rogne sur la boite englobante du contenu, avec une marge reguliere.
 *
 * Seule la zone exterieure est mesuree : le logo n'est jamais recolore, donc
 * un element clair au coeur du sigle n'est pas anis.
 * ---------------------------------------------------------------------- */

const CROP_THRESHOLD = 12; // ecart minimal par rapport au fond, somme des 3 canaux

function averageColor(image, points) {
  const { width, channels, pixels } = image;
  let r = 0, g = 0, b = 0, n = 0;
  for (const [x, y] of points) {
    const i = (y * width + x) * channels;
    r += pixels[i];
    g += pixels[i + 1];
    b += pixels[i + 2];
    n++;
  }
  return [r / n, g / n, b / n];
}

function cropToContent(image) {
  const { width, height, channels, pixels } = image;

  // Le fond est estime sur les quatre coins, plus le centre des aretes.
  const probe = [
    [0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1],
    [(width / 2) | 0, 0], [(width / 2) | 0, height - 1],
    [0, (height / 2) | 0], [width - 1, (height / 2) | 0],
  ];
  const bg = averageColor(image, probe);

  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const d =
        Math.abs(pixels[i] - bg[0]) +
        Math.abs(pixels[i + 1] - bg[1]) +
        Math.abs(pixels[i + 2] - bg[2]);
      if (d > CROP_THRESHOLD) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // Rien de distinct, ou deja plein cadre : on ne touche a rien.
  if (maxX < 0) return image;

  const margin = 2;
  const x0 = Math.max(0, minX - margin);
  const y0 = Math.max(0, minY - margin);
  const x1 = Math.min(width - 1, maxX + margin);
  const y1 = Math.min(height - 1, maxY + margin);

  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;

  // Recadrage trop marginal : on prefere garder l'image telle quelle plutot que
  // d'agrandir au-dela du cadre d'origine.
  if (w >= width && h >= height) return image;

  const out = Buffer.alloc(w * h * channels);
  for (let y = 0; y < h; y++) {
    pixels.copy(
      out,
      y * w * channels,
      ((y + y0) * width + x0) * channels,
      ((y + y0) * width + x1 + 1) * channels,
    );
  }

  return {
    ...image,
    width: w,
    height: h,
    pixels: out,
    croppedFrom: { width, height, x: x0, y: y0 },
  };
}

/* -------------------------------------------------------------------------
 * Detourage du fond par remplissage depuis les bords.
 *
 * Le logo est livre sur un fond clair uni, ce qui dessinerait un carre pale
 * visible sur le creme de l'interface. On rend ce fond transparent.
 *
 * Volontairement on ne fait PAS de selection globale par couleur : le sigle
 * contient des zones claires (oeils de lettres, espaces) qui seraient
 * percees. Le remplissage ne part que des pixels de bord et ne s'etend qu'au
 * travers de pixels de meme couleur, donc l'interieur du sigle est preserve.
 * ---------------------------------------------------------------------- */

function knockOutBackground(image, tolerance = 30) {
  const { width, height, channels, pixels } = image;
  if (channels !== 4) return { image, removed: 0 };

  // Le fond est releve sur les coins, sur la version recadree.
  const corners = [
    [0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1],
  ];
  let br = 0, bg = 0, bb = 0;
  for (const [x, y] of corners) {
    const i = (y * width + x) * channels;
    br += pixels[i];
    bg += pixels[i + 1];
    bb += pixels[i + 2];
  }
  br /= corners.length; bg /= corners.length; bb /= corners.length;

  const isBackground = (i) => {
    const d =
      Math.abs(pixels[i] - br) +
      Math.abs(pixels[i + 1] - bg) +
      Math.abs(pixels[i + 2] - bb);
    return d <= tolerance;
  };

  // Parcours en largeur depuis tous les pixels de bord.
  const visited = new Uint8Array(width * height);
  const queue = [];
  const push = (x, y) => {
    const k = y * width + x;
    if (visited[k]) return;
    visited[k] = 1;
    if (isBackground(k * channels)) queue.push(k);
  };

  for (let x = 0; x < width; x++) { push(x, 0); push(x, height - 1); }
  for (let y = 0; y < height; y++) { push(0, y); push(width - 1, y); }

  const region = new Uint8Array(width * height);
  let removed = 0;
  while (queue.length > 0) {
    const k = queue.pop();
    region[k] = 1;
    removed++;
    const x = k % width;
    const y = (k / width) | 0;
    if (x > 0) push(x - 1, y);
    if (x < width - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < height - 1) push(x, y + 1);
  }

  const out = Buffer.from(pixels);
  for (let k = 0; k < region.length; k++) {
    if (region[k]) out[k * channels + 3] = 0;
  }

  return { image: { ...image, pixels: out }, removed, background: [br, bg, bb] };
}

/* ------------------------------------------------------------------------- */

/** Compte les pixels qui s'ecartent du fond, en ignorant le transparent. */
function countInk(img, bg, tolerance = 30) {
  const { width, channels, pixels } = img;
  let n = 0;
  for (let k = 0; k < width * img.height; k++) {
    const i = k * channels;
    if (channels === 4 && pixels[i + 3] < 128) continue;
    const d =
      Math.abs(pixels[i] - bg[0]) +
      Math.abs(pixels[i + 1] - bg[1]) +
      Math.abs(pixels[i + 2] - bg[2]);
    if (d > tolerance) n++;
  }
  return n;
}

function main() {
  const image = readPng(readFileSync(source));
  console.log(`  logo.png : ${image.width}×${image.height} px, colorType ${image.colorType}`);

  // On rogne la zone vide autour du sigle avant de redimensionner.
  const cropped = cropToContent(image);
  if (cropped.croppedFrom) {
    const from = cropped.croppedFrom;
    console.log(
      `  recadré  : ${image.width}×${image.height} → ${cropped.width}×${cropped.height} px ` +
        `(zone vide supprimée en ${from.x},${from.y})`,
    );
  }

  // Fond blanc : iOS ne rend pas la transparence sur l'icone d'ecran d'accueil.
  const OPAQUE = { padding: 0.06, background: [255, 255, 255, 255] };
  // Variante « maskable » : 26 % de marge, car Android rogne la zone sure.
  const MASKABLE = { padding: 0.26, background: [255, 255, 255, 255] };

  const PLAN = [
    { name: 'pwa-192x192.png', size: 192, options: OPAQUE },
    { name: 'pwa-512x512.png', size: 512, options: OPAQUE },
    { name: 'pwa-maskable-512x512.png', size: 512, options: MASKABLE },
    { name: 'apple-touch-icon.png', size: 180, options: OPAQUE },
  ];

  for (const { name, size, options } of PLAN) {
    save(join(publicDir, name), size, cropped, options);
  }
  /* --- Version web : recadree et sur fond transparent --------------------- */

  const markCropped = cropToContent(readPng(readFileSync(source)));
  const { image: mark, removed, background } = knockOutBackground(markCropped);

  // Garde-fou : le detourage ne doit avoir mange que le fond. On compare le
  // nombre de pixels s'ecartant du fond avant et apres ; une fuite vers
  // l'interieur du sigle (oeil d'une lettre, espace) le ferait chuter.
  const before = countInk(markCropped, background);
  const after = countInk(mark, background);
  const lossRatio = before > 0 ? (before - after) / before : 0;

  const outputs = [...PLAN];

  if (lossRatio > 0.005) {
    console.warn(
      `  \u26a0  detourage trop agressif (${(lossRatio * 100).toFixed(1)} % du sigle perdu) \u2014 ` +
        'version web conservee sur fond opaque.',
    );
    save(join(publicDir, 'logo-mark.png'), 512, markCropped, OPAQUE);
  } else {
    // Largeur fixe, hauteur calculee : le sigle garde exactement sa proportion.
    const markW = 512;
    const markH = Math.round((markCropped.height / markCropped.width) * markW);
    const scaled = resize(mark, markW, markH, { padding: 0, background: [0, 0, 0, 0] });
    writePng(join(publicDir, 'logo-mark.png'), scaled.width, scaled.height, scaled.rgba);
    outputs.unshift({ name: 'logo-mark.png' });
    console.log(
      `  logo-mark.png : ${scaled.width}\u00d7${scaled.height} px, fond #${background
        .map((v) => Math.round(v).toString(16).padStart(2, '0'))
        .join('')} detoure (${removed} px), sigle intact a ${((1 - lossRatio) * 100).toFixed(2)} %`,
    );
  }

  // Copie intacte, pour les navigateurs qui acceptent une source arbitraire.
  copyFileSync(source, join(publicDir, 'logo-original.png'));

  for (const { name } of [...outputs, { name: 'logo-original.png' }]) {
    const size = statSync(join(publicDir, name)).size;
    console.log(`  \u2713 ${name.padEnd(28)} ${(size / 1024).toFixed(1)} Ko`);
  }
}

export { readPng, writePng, resize, cropToContent, knockOutBackground, countInk, source };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
