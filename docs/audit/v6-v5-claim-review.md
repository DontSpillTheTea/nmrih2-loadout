# V6 Review of V5 Claims & Evidence Audit (Section 2)

**Date**: 2026-08-30  

---

## Critical Claims Review Table

| Claim | Claimed Value in V5 | Production File | Provenance Record | Raw Source Evidence | Status / Disposition in V6 |
|---|---|---|---|---|---|
| **Tire Iron Base Stamina** | 5 Quick / 7 Strong / 13 Charged | `weapons.json` | `compendium:melee:tire-iron` | `data/raw/tabs/Melee_545299304.csv` Row 144-146 | **RETAINED** (Source-backed by compendium). |
| **Hitman Expert Modifier** | +30% Damage, +15% Stamina consumed | `perks.json` | `compendium:perk:hitman-expert` | `data/raw/tabs/Perks_160707575.csv` Row 40 | **RETAINED** (Source-backed by compendium). |
| **Cleaver Headshot Damage**| 28 Quick / 50 Charged | `weapons.json` | `compendium:melee:cleaver` | `data/raw/tabs/Melee_545299304.csv` Row 36-39 | **RETAINED** (Source-backed by compendium; explains 2-hit Nightmare kill). |
| **National Guard Helmet HP**| 90 HP | `enemies.json` | `compendium:enemy:national-guard` | `data/raw/tabs/Zombies_1426584761.csv` Row 0 | **CONFLICTED** (Compendium says 90 HP; Historical official material mentions ~130 HP). Documented as Compendium source. |
| **Firefighter / Construction Helmet HP** | 30 HP | `enemies.json` | `compendium:enemy:firefighter` | `data/raw/tabs/Zombies_1426584761.csv` Row 0 | **CONFLICTED** (Compendium says 30 HP; Historical official material mentions 70-75 HP). Documented as Compendium source. |
| **Helmet Stability Resistance** | 50% reduction | `damage.ts` | Unsourced | None (Hypothesized constant) | **REMOVED FROM PRODUCTION** (Marked UNKNOWN; unsourced 0.5 removed from calculations). |
| **Non-Penetrating Breaking-Hit Overflow** | Excess damage spills to zombie HP | `damage.ts` | Unsourced | Hypothesized in V5 | **MARKED UNRESOLVED** (Human gameplay suggests helmet may consume full hit without spillover). |
| **Penetrating Firearm Damage** | 100% full damage directly to head | `damage.ts` | Unsourced | Hypothesized in V5 | **MARKED UNRESOLVED** (Historical descriptions suggest penetration reduces damage on pass-through). |
| **Kitchen Knife Hand/Shoulder Interception** | Short range causes hand/shoulder hit | V5 report | Unsourced | Theoretical hypothesis | **WITHDRAWN AS CAUSAL CLAIM** (Marked as UNRESOLVED GAMEPLAY DISCREPANCY). |
