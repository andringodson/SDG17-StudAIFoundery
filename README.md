# SDG 17 · Global Partnership Hub

An interactive web application for **UN Sustainable Development Goal 17 — Partnerships for the Goals**, built by the RIT StudAI Foundery team.

> Global challenges require global partnerships. Explore how collaboration in finance, technology, skills, trade and policy can accelerate sustainable development.

All monetary figures use **Indian Rupees** in the `en-IN` standard — `₹1,00,000`, `₹10 Crore`. There is no dollar sign anywhere in the application.

---

## Running it

There is no build step and there are no dependencies.

```bash
# Either: open the file directly
start index.html          # Windows
open index.html           # macOS

# Or: serve it (any static server works)
npx serve .
python -m http.server 8000
```

Both work. The app is written with classic scripts and embedded datasets rather than ES modules and `fetch`, specifically so that double-clicking `index.html` works — no CORS errors, no dev server required during a presentation.

---

## What's in it

| Module | What it does |
|---|---|
| **Hero & About** | The case for SDG 17, with live totals and six "why partnerships matter" cards |
| **Global partnership map** | Five regional hubs on a hand-drawn SVG world map, filterable by pillar, each opening a full regional profile |
| **Finance impact simulator** | A logarithmic ₹10 Lakh → ₹50 Crore slider driving projects, communities reached and an impact score |
| **Challenge explorer** | The five SDG 17 pillars, each with allocation charts, targets, and its own interactive tool |
| **Fair trade simulator** | Three policy levers producing growth, jobs and sustainability scores, with a written verdict |
| **Capacity learning paths** | Role-based skill tracks for students, teachers, NGO workers, officials and entrepreneurs |
| **Partnership builder** | A four-step flow ending in a scored strategy report with real assessment notes |
| **Action centre** | Quiz, badges, pledge wall and a live audience poll |
| **Status bar** | A persistent, accessible progress bar with a diagnostic panel — see below |

### The finance model

Exactly as specified:

```
Projects Supported  = Budget × 0.000025
Communities Reached = Projects × 200
Impact Score        = min(99%, 40% + log₁₀(Budget) × 7.5)
```

The slider is logarithmic because a linear one would spend roughly 98% of its travel above ₹1 Crore, making the low end unusable.

### The partnership score

Four components with stated weights, so a student can argue with the result:

| Component | Weight | Measures |
|---|---|---|
| Capability coverage | 35% | Do the selected partners cover what the challenge needs? |
| Institutional capacity | 30% | Combined weight of the actors at the table |
| Partner diversity | 15% | How many distinct kinds of actor |
| Resource adequacy | 20% | Budget relative to ambition |

---

## Accessibility

- `role="progressbar"` with live `aria-valuenow` on the status bar; determinate and indeterminate states
- **Escape** cancels any running operation; a visible Cancel button does the same
- `aria-live="polite"` announcements for progress, filters and form results
- Focus is trapped in modals and returned to the trigger on close
- Every interactive control is keyboard reachable with a visible `:focus-visible` ring
- Touch targets are at least 44×44px
- `prefers-reduced-motion` disables reveals, pulses, marquees and count-ups
- Chart identity never depends on colour alone — legends and direct labels always accompany it

### Colour

Series colours were **validated with a contrast/colour-vision checker**, not chosen by eye. The SDG brand blues (`#0A3A60`, `#1F69B3`, `#00AED6`, `#2EC4B6`) sit in the surface and accent roles; the categorical data palette is a separate validated set, because five brand-adjacent hues could not clear colour-vision separation as adjacent data marks.

The map uses a **sequential** single-hue ramp keyed to funding, with circle area showing project count — five independent categorical hues would have failed all-pairs separation.

---

## Offline first

Every chart, the map, and all simulations run from local data. There is no CDN, no external font request, no analytics, no network call of any kind. If the venue wifi dies mid-presentation, nothing changes.

The **Reset demo** button (in the Action Centre and the footer) clears all stored points, badges, pledges and votes and returns the hub to its opening state.

---

## Structure

```
index.html
vercel.json
assets/
  css/main.css          design tokens, fluid layout, components
  js/
    utils.js            INR formatting, DOM helpers, reactive store
    data.js             all datasets (embedded, no fetch)
    charts.js            SVG donut / bars / columns / meter / spark
    statusbar.js         accessible status bar + async task runner
    simulators.js        finance, fair trade, learning paths
    map.js                world map, filters, regional profiles
    ecosystem.js          four-step builder + scoring
    gamify.js              points, badges, quiz, pledges, poll
    app.js                  nav, modal, pillars, boot, reset
```

Load order matters and is fixed in `index.html`: utils → data → primitives → features → shell.

---

## Data

All datasets are **illustrative and offline**. This is a teaching and advocacy tool, not an official UN data source. Poll baselines are simulated for demonstration and labelled as such in the interface; votes cast in the browser are real and stored locally.

---

## Contributing

```bash
git clone https://github.com/andringodson/SDG17-StudAIFoundery.git
cd SDG17-StudAIFoundery
git checkout -b your-feature
# edit, then
git commit -am "describe the change"
git push origin your-feature
```

Open a pull request against `main`.

**Team:** [@andringodson](https://github.com/andringodson) · [@karthikeyan0929](https://github.com/karthikeyan0929) · [@ssudharsanan2007-max](https://github.com/ssudharsanan2007-max)
