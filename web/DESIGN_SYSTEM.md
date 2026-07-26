# CaseJeeto Design System

## Direction

**Appointment-first legal marketplace** positions CaseJeeto as assured, practical, and human. Clients often arrive under stress, so the interface exposes useful profile evidence early and keeps the path to a first conversation obvious. Advocates are presented as professionals with distinct practices, not interchangeable inventory.

The visual language combines deep navy structure, coral decisions, mint reassurance, and a cool near-white canvas. Product imagery shows an ordinary, respectful legal conversation in an Indian context. Wide evidence rows replace generic marketplace card grids.

## Foundations

### Palette and token mapping

| Role | Semantic token | Intent |
| --- | --- | --- |
| Cool canvas | `background` | Calm page field for long-form browsing |
| White surface | `card`, `popover` | Forms, rows, and focused product surfaces |
| Deep navy | `primary`, `primary-strong` | Navigation, headings, dark comparison surfaces |
| Coral | `seal`, `ring` | Primary decisions and keyboard focus |
| Soft coral | `accent`, `coral-soft` | Selected filters and secondary emphasis |
| Mint | `mint`, `mint-strong` | Reassurance and positive product state |
| Gold | `rating` | Ratings only |

Colors use OKLCH variables in `src/index.css`. Components use semantic utilities rather than hard-coded values. Coral is intentionally scarce so primary decisions remain obvious.

### Typography

- **Display and headings:** Geist Variable (`font-heading`) for direct, contemporary hierarchy.
- **Interface and body:** Anek Latin Variable (`font-sans`) for readable forms, evidence, and Indian-language character.
- Marketing headings use the fluid `text-display` and `text-section-title` utilities. Product and dashboard text use fixed rem-based Tailwind scales.
- Body copy stays under roughly 70 characters per line. Uppercase is limited to short eyebrow labels.

### Spacing and shape

The semantic 4px scale remains available through `cj-` utilities. Related evidence is compact; section transitions receive more space. Controls have 10–12px radii, major product surfaces use 16–24px radii, and status pills are reserved for short facts.

Use one-pixel rules to align evidence. Shadows are limited to `--shadow-hairline`, `--shadow-small`, and `--shadow-raised`. They communicate elevation rather than decorate ordinary content.

## Composition

- The public home page pairs a concise value proposition with real product-context imagery and an immediately usable legal-need finder.
- Finder inputs map only to supported directory parameters: practice area, court or jurisdiction, and language.
- Advocate results use `LawyerComparisonRow`: identity and focus, comparable evidence, consultation fee, then a profile action.
- Profile details give the portrait and practice evidence visual priority. The consultation summary remains sticky on wide screens.
- Booking is disabled until public availability and booking orchestration are connected. Never show illustrative slots as live inventory.
- Demo data and illustrative workspace UI are labelled. Do not describe profiles as verified unless the API supplies a verification field.

Avoid purple gradients, gradient text, glassmorphism, side-stripe callouts, floating decorative documents, interchangeable card grids, excessive pills, and unsupported trust claims.

## Imagery

- Images are project-bound WebP files in `src/assets`; no production marketing surface depends on remote URLs.
- The consultation image uses a 3:2 crop. Advocate portraits use a 4:5 crop with the face centred and sufficient headroom.
- API-provided profile photos take precedence. Initials remain the fallback when an image is missing.
- Below-the-fold portraits load lazily; the hero image and first visible result may load eagerly.

## Motion

- `--motion-fast` (140ms) handles press feedback and short state changes.
- `--motion-base` (220ms) handles hover emphasis and disclosure.
- Use the custom `--ease-out` curve. Animate only transform and opacity where movement is involved.
- Pressable controls scale to `0.97–0.98` on active. Hover movement is gated behind fine-pointer media queries.
- Page entrance motion is short and non-blocking. Reduced-motion preferences collapse non-essential movement.

## Accessibility

- Target WCAG 2.2 AA contrast.
- Keyboard focus uses a visible coral outline or ring.
- Controls have at least 44px touch targets on coarse pointers.
- Selection, rating, and status always include text or an accessible label; color is not the only signal.
- Semantic headings, fieldsets, legends, visible labels, live result counts, and descriptive link labels are required.
- Layouts must reflow at 320px and remain usable at 200% zoom.

## Component rules

- **Buttons:** one dominant action per decision region. Supporting actions use outline, secondary, ghost, or text variants.
- **Finder:** use `LegalNeedFinder` for supported discovery inputs rather than duplicating navigation logic.
- **Advocate rows:** use `LawyerComparisonRow` for evidence-led public results. Dark and light tones share the same information order.
- **Badges:** short practice areas or status facts only.
- **Sheets:** mobile filters and focused navigation only; ordinary detail stays inline.
- **Cards:** reserve for a coherent object or focused form. Do not wrap every section in a card.
