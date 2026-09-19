# NineTees brand assets

Vector rebuild of the approved logo, drawn from the site's own fonts (Anton for the wordmark, Inter Tight for the caption)
so every version is exact at any size. Colours are the site tokens: ink #0A0A0B, bone #F3EFE6, royal #1A3CFF, red #E0202B.

| File | Use |
|---|---|
| `ninetees-logo-bone` | Full lockup for dark backgrounds. Transparent. |
| `ninetees-logo-ink` | Full lockup for light backgrounds. Blue and red stripes with the background showing through as the middle stripe. Transparent. |
| `ninetees-logo-on-ink` | Full lockup on a solid ink panel, for previews and print. |
| `ninetees-wordmark-bone` / `-ink` | Wordmark alone, wide lockup, for the site header and anywhere narrow. Transparent. |
| `ninetees-wordmark-bar-bone` | Wordmark with the stripe bar, no caption. Transparent. |
| `ninetees-icon` | Square NT device on ink: app icon, favicon, avatar. |
| `ninetees-icon-transparent` | Same device, no background. |
| `ninetees-icon-mono-ink` / `-mono-bone` | Single-colour device for embroidery, stamps and favicons. Transparent. |
| `ninetees-og` | 1200x630 social preview card. |

`svg/` is the master. `png/` is rendered from it at 2048 pixels on the long side (the og card at 1200x630).
Regenerate from the scratch generator if the design changes; the geometry is a handful of proportions at the top of `build.mjs`.
