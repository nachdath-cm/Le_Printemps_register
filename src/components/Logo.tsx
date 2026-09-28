import { useState } from 'react';
import { LOGO_MARK_PATH, LOGO_PATH } from '../config/institute';

export interface LogoProps {
  /** Hauteur du sigle en pixels. La largeur suit le rapport du logo. */
  size?: number;
  className?: string;
  /** Rend un rendu texte a la place de l'image (si le logo est absent). */
  withText?: boolean;
}

/**
 * Logo de l'institut — depose par le proprietaire dans public/logo.png.
 *
 * On affiche la version recadree et detouree (`logo-mark.png`, produite par
 * `npm run icons`), car le fichier d'origine est livre sur un carre blanc qui
 * dessinerait un bloc pale au milieu de la page. Si cette version derive
 * manque, on retombe sur le fichier d'origine, puis sur le nom en serif.
 */
export function Logo({ size = 40, className, withText = false }: LogoProps) {
  const [src, setSrc] = useState(LOGO_MARK_PATH);

  return (
    <span className={`inline-flex items-center gap-3 ${className ?? ''}`}>
      <img
        src={src}
        alt=""
        // Le sigle est dimensionne par sa hauteur : la largeur est calculee
        // par le navigateur, ce qui evite tout deformation du logo.
        style={{ height: size, width: 'auto' }}
        className="max-w-[14rem] shrink-0 object-contain"
        onError={(event) => {
          // Version derivee absente : on tente le fichier depose a la main.
          if (src !== LOGO_PATH) {
            setSrc(LOGO_PATH);
            return;
          }
          // Aucun logo : on masque l'image cassee, le texte prend le relais.
          event.currentTarget.style.display = 'none';
        }}
      />
      {withText && <LogoText />}
    </span>
  );
}

/** « LE PRINTEMPS » en serif orange — reprise du header du site vitrine. */
export function LogoText({ className }: { className?: string }) {
  return (
    <span className={`flex flex-col leading-none ${className ?? ''}`}>
      <span className="text-primary-ink font-serif text-xl font-semibold tracking-wide">
        LE PRINTEMPS
      </span>
      <span className="text-muted mt-1 font-sans text-[0.6rem] font-medium tracking-[0.22em] uppercase">
        Soins &amp; Coiffures
      </span>
    </span>
  );
}
