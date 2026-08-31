# NMRiH2 Loadout / Combat Optimizer

Deterministic combat simulator, breakpoint analyzer, and RNG perk leveling assistant for **No More Room in Hell 2 (NMRiH2)**.

Built as a high-performance, client-side single page application running entirely in the browser with **$0/month infrastructure cost**.

---

## 🎯 What the Application Does

Unlike generic build planners or wiki calculators that simply display stats or theoretical DPS numbers, this optimizer answers practical combat questions:

- **Action Sequences (Combat Recipes):** Calculates the exact attack sequence to eliminate any zombie type (e.g. `Shove → Charged Head` vs `Kick → Quick Head`).
- **Breakpoints:** Identifies which perks actually reduce the required hit count against specific zombies rather than merely increasing paper DPS.
- **Timing & Stamina:** Exposes wall-clock animation TTK in seconds and stamina spent per combo.
- **Stability & Control:** Evaluates opening actions that force flinch, interrupt, stagger, or knockdown states to safely neutralize attacking zombies.
- **Downed Bonus Multiplier:** Models the 2.0x (100% increased) damage dealt to knocked-down targets.
- **In-Game RNG Level-up Assistant:** Evaluates 3 rolled RNG perks on level-up against your active Responder's build and ranks them by practical marginal breakpoint improvements.
- **2D Breakpoint Matrix:** Interactive comparison table of all weapons against all zombie archetypes with 1-shot and 2-shot kill highlighting.
- **Zero-URL Sharing:** Compact, compressed, checksummed pasteable codes (`N2B1-`, `N2C1-`, `N2A1-`) without bloating browser URLs.

---

## 🏛️ Architecture Summary

```
Google Sheet Compendium + Official Patch Notes
                      │
           scripts/fetch-data.py
                      │
           scripts/normalize-data.py
                      │
┌───────────────────────────────────────────────┐
│     data/snapshots/1.0.4.0/ (Versioned JSON)  │
│  • weapons.json    • perks.json               │
│  • enemies.json    • mechanics.json           │
│  • provenance.json • manifest.json            │
└──────────────────────┬────────────────────────┘
                      │
          src/engine/ (Pure TypeScript)
          • Damage Pipeline & Modifiers
          • Stability & Posture Resolver
          • Pure State Transition Function
                      │
          src/solver/ (Graph Search)
          • Deterministic State-Space Search
          • Multiobjective Pareto Pruning
          • Constraint Enforcement
                      │
          src/planner/ & src/serialization/
          • Marginal Perk Breakpoint Evaluator
          • Base64URL + fflate Codecs (N2B1, N2C1)
                      │
          src/views/ (React 19 + TypeScript)
          • Optimizer • Build Planner • Perk Picker
          • Breakpoint Matrix • Data Methodology
                      │
       Cloudflare Workers Static Assets ($0/mo)
```

### Why the Solver Runs Browser-Side:
1. **Zero Recurring Infrastructure Costs:** Pure client-side execution means no servers, no database, and $0/month hosting on Cloudflare Workers / Pages.
2. **Instant Responsiveness:** Graph search completes in milliseconds in-browser, allowing real-time slider and constraint exploration.
3. **Offline & Privacy:** User builds and responder profiles remain 100% local in browser `localStorage`.

---

## 📊 Data Sources & Provenance Rules

| Source | Type | URL |
|---|---|---|
| **NMRiH2 Info Compendium** | Datamined / Game-file derived | [Google Sheet Compendium](https://docs.google.com/spreadsheets/d/e/2PACX-1vRYRiLDS0qkszc2GgVRzTiNy46i-JaatWB2qbgsufwzwpCbyZCBqcaQ3avoYnLEAiif-ZYJLD-OD5rW/pubhtml) |
| **Armageddon 1.0 Update Notes** | Official Patch Notes | [1.0 Notes](https://www.nmrih2.com/2026/08/10/armageddon-1-0-update-notes/) |
| **Hotfix 1.0.4.0 Notes** | Official Patch Notes | [1.0.4.0 Notes](https://www.nmrih2.com/2026/08/25/hotfix-notes-1-0-4-0/) |

### Damage Formula:
$$\text{Final Damage} = (\text{Base Damage} + \text{Additive Perks}) \times (1 + \sum \text{Multiplicative Perks}) \times (\text{Downed ? } 2.0 : 1.0) \times (1 - \text{Armor Resistance})$$

### Stability & Posture Thresholds:
- **0 – 19 Stability:** Flinch (minor visual reaction)
- **20 – 49 Stability:** Interrupt (cancels zombie attack swings, e.g. Shove deals 20 stability)
- **50 – 99 Stability:** Stagger (long stumble animation)
- **100+ Stability:** Knockdown (target falls to ground and receives **2.0x damage** from all subsequent hits)

---

## 💻 WSL2 Setup & Commands

### Prerequisites:
- Ubuntu on WSL2
- Node.js 22 LTS (`nvm install 22`)
- Python 3

### Installation:
```bash
# Clone and enter directory
cd ~/git/nmrih2-loadout

# Use Node 22
nvm use 22

# Install dependencies
npm install
```

### Development & Testing:
```bash
# Start local development server (Vite)
npm run dev

# Run unit test suite (Vitest)
npm test

# Run typechecker
npm run typecheck

# Build production SPA bundle (dist/)
npm run build

# Preview production build locally
npm run preview
```

### Upstream Data Pipeline:
```bash
# Fetch latest raw CSVs from published Compendium
npm run data:fetch

# Normalize into versioned snapshot (data/snapshots/1.0.4.0/)
npm run data:normalize

# Full data update
npm run data:update
```

---

## 📦 Import / Export Share Code Formats

Share codes use compact JSON envelopes compressed with `fflate` (Deflate), encoded in Base64URL (RFC 4648 §5), and verified with an 8-byte checksum tag:

| Prefix | Content | Example Shape |
|---|---|---|
| `N2B1-` | Single Loadout / Weapon Build | `N2B1-<payload>.<checksum>` |
| `N2C1-` | Responder Character Profile | `N2C1-<payload>.<checksum>` |
| `N2A1-` | Full Application Backup | `N2A1-<payload>.<checksum>` |

- **Patch Awareness:** Share codes encode the game version (`g: "1.0.4.0"`). If imported under a newer balance patch, a warning is displayed while preserving data integrity.
- **Zero URL Bloat:** No query strings or user state in URLs.

---

## 🚀 Cloudflare Deployment ($0 Free Tier)

Deploy as static assets to Cloudflare Workers with free `workers.dev` subdomain:

```bash
# 1. Login to Cloudflare (one-time)
npx wrangler login

# 2. Deploy to Cloudflare Workers Static Assets
npm run deploy
```

`wrangler.jsonc` configuration:
```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "nmrih2-optimizer",
  "compatibility_date": "2026-08-30",
  "assets": {
    "directory": "./dist",
    "not_found_handling": "single-page-application"
  }
}
```

---

## 🔒 Privacy & Analytics

- **Offline by Default:** Core optimizer works completely offline without telemetry.
- **Optional PostHog:** Configure `VITE_POSTHOG_KEY` and `VITE_POSTHOG_HOST` in `.env` if anonymous usage event tracking is desired. No custom build codes or personal data are ever tracked.

---

## ⚠️ Known Unresolved Mechanics

- **Limb Dismemberment Dismount Timing:** Detailed animation frames for leg removal crawler transition are community-measured and subject to future hotfix timing adjustments.
- **Armor Multi-layer Penetration on Riot Helmets:** Penetration logic follows the 1.0 datamined compendium rules.
