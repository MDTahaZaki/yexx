// A large, tileable embossed paper/fabric texture, generated as an inline
// SVG (feTurbulence) data URI — no binary asset needed. Used as a very
// low-opacity CSS background-image overlay (see call sites for the actual
// opacity — this only sizes the tile large enough, and keeps contrast low
// enough, that the repeat never reads as a visible tile). Replaces the old
// high-contrast film-grain overlay from the dark direction.
export const embossTexture =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='480' height='480'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";
