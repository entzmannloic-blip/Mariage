# Design system : Lieux de mariage

World: night motorway signage. Photos lead; the direction sign is the signature move.

## Colour
- Ground (dark, default): #08131f; surface #0e1e30; surface-2 #142942; hairline #223a57; ink #f3f6fb; muted #9db0c9.
- Light variant (prefers-color-scheme: light): ground #eef1f5; surface #fff; surface-2 #e6ebf2; line #cdd6e2; ink #0f1c2e; muted #53647c.
- Sign blue #0a56b0 (header, direction signs, segmented controls) with a white inner rule.
- Tourist brown #7b4a2a (venue type badges, map pins, selected type chips).
- Go green #0b7a52 (visited, switches on, proche tag). Amber #ffc20e (favori, sliders, values, focus ring).

## Typography
Overpass (Highway Gothic descendant), weights 400/600/700/800, tabular numerals everywhere. Names 800 20px; modal title 800 28px; stats 800 18px; labels 600 12-14px.

## Components
- Header gantry: blue bar, title + count, horizontally scrolling zone chips (white outline, white fill when active), Filtres button, sort select.
- Venue card: 3:2 photo, brown type badge top-left, star toggle top-right (amber when favori), body with name, commune, 3-column stats strip (invités, couchages, prix) separated by hairlines, direction sign.
- Direction sign: blue panel, 2px white inner border, two rows (arrow, city, time, km); the row outside the active threshold is dimmed.
- Fiche (modal): full-screen sheet on mobile, centered 980px on desktop; photo with prev/next/close, sign, definition list, link buttons, notes, sticky segmented status dock (Favori, À contacter, Visité, Écarté).
- Map: OSM tiles (dark filter at night), square brown pins, amber for favoris, blue contacté, green visité.
- Bottom Liste/Carte pill on mobile.

## Motion
One authored moment: the fiche rises 24px with a fade over 380ms (exponential ease-out). Hover lift on cards. All motion off under prefers-reduced-motion.

## Rules
Radius 14px cards, 9px signs, 6px badges, pills only for small chips. No gradient text, no glass beyond the small circular photo buttons. Focus ring 2.5px amber.
