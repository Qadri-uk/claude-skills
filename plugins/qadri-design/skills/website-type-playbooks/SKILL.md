---
name: website-type-playbooks
description: "Starting playbooks for common kinds of website: local service business, car dealer, clinic/wellness, restaurant/cafe, trades, portfolio, agency/studio, SaaS landing, e-commerce storefront, editorial/blog, event, charity. Each gives the job of the homepage, the section order, the conversion action, a sensible style direction and motion level, the structured data to add, and which skills to load for it. Use at the start of any new site or redesign, or when asked to make a site for a particular type of business."
---

# Website type playbooks

Pick the playbook, then adapt. Each one names the **single action** the site exists to
drive. Every section either builds trust toward that action or removes a doubt about it.

Motion levels: **0** none beyond hover/focus · **1** reveals and micro-interactions ·
**2** a signature hero moment plus scroll reveals · **3** full scroll story (`scroll-story-site`).
Most businesses want 1-2. Use 3 when the brand *is* the experience: launches, agencies,
luxury, product reveals.

| Type | Action | Section order (homepage) | Style direction | Motion | Schema |
|---|---|---|---|---|---|
| Local service / trades | Call or request a quote | Hero with phone + area served, services grid, proof (reviews, accreditations), how it works (3 steps), gallery of real jobs, FAQ, contact + map | corporate or friendly, high-contrast CTA | 1 | `localBusiness`, `faq` |
| Car dealer | Enquire on a vehicle / book a test drive | Search-first hero, featured stock cards (price, mileage, year, finance from), why buy here, part-exchange/finance, reviews, opening hours + location | dark premium or clean showroom; photography carries it | 1-2 (hero car reveal, card hover) | `localBusiness` (AutoDealer), `product`/Vehicle per car, `faq` |
| Clinic / wellness / beauty | Book an appointment | Calm hero with booking CTA, treatments with prices and durations, who you'll see, before/after or results (where allowed), reviews, what to expect, FAQ | soft minimal or luxury, warm neutrals, generous whitespace | 1 (slow fades) | `localBusiness` (HealthAndBeautyBusiness), `faq` |
| Restaurant / cafe | Book a table / order | Full-bleed food hero, menu (HTML, not PDF), opening hours, booking, story, location | editorial or playful; type-led | 1-2 | `localBusiness` (Restaurant) with `servesCuisine`, `hasMenu` |
| Portfolio (person) | Get in touch / hire | Name + one-line positioning, 3-6 selected works, case study pages, about, contact | editorial, brutalist or minimal, to match the work | 2-3 | `breadcrumbs`, `article` per case study |
| Agency / studio | Start a project | Statement hero, showreel or scroll story, selected work, services, process, clients, contact | bold: modern/tech, brutalist or luxury | 3 | `localBusiness` or Organization |
| SaaS landing | Start trial / book demo | Value-prop hero + product shot, logos, 3 benefit blocks, feature deep-dives, how it works, pricing, testimonials, FAQ, final CTA | modern/tech, one saturated accent | 2 | `product`, `faq` |
| E-commerce storefront | Add to basket | Hero collection, category tiles, bestsellers, value props (delivery, returns), UGC/reviews, newsletter | depends on product; product imagery first | 1 | `product` per item, `breadcrumbs` |
| Editorial / blog | Read, subscribe | Lead story, latest, topics, newsletter | editorial: real measure, serif display | 0-1 | `article`, `breadcrumbs` |
| Event / launch | Register / buy ticket | Date+place hero, countdown, lineup/agenda, venue, tickets, FAQ | expressive, retro or neon | 2-3 | Event (add a builder if needed), `faq` |
| Charity / community | Donate / volunteer | Mission hero, impact numbers, stories, ways to help, transparency, contact | warm, human photography | 1 | Organization, `faq` |

## For every type

- **Lead with the answer** (template house style): the paragraph under the h1 says what
  you do, where, and for whom, in two or three sentences.
- Phone, hours and location on every page for local businesses, as text rather than images.
- Real photography beats stock. If none exists, use illustration (`illustration-*`) or
  type-led layouts instead of fake stock people.
- One primary CTA style per page. Secondary actions are links.
- Pick the style skill to match the direction: `style-*` (73 one-style skills), `dt-*`
  (design-taste presets), `taste-skill`, `neobrutalist-web-designer`,
  `swiss-modern-web-designer`, `glassmorphism`, `liquid-glass`. Then tokens via
  `tailwind-theme-builder` / `design-tokens` and colour via `oklch-skill` / `better-colors`.
- Section patterns: `landing-page-anatomy`, `hero-section`, `landing-page-design`,
  `sections-library` inside `taste-skill`.
- Quality pass before done: `impeccable` or `hallmark`, `web-design-guidelines`, `accessibility-audit`.
