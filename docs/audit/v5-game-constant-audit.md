# V5 Production Game Constant & Provenance Audit

**Date**: 2026-08-30  
**Target Game Version**: 1.0.4.0  

---

## 1. Summary of Production Combat Constants

| Category | Total Fields | Classified Sourced | Classification Breakdown |
|---|---|---|---|
| **Melee Weapons (19 + 1 unarmed)** | 180 | 180 | 36 OFFICIAL, 144 COMPENDIUM |
| **Firearms (15 weapons)** | 90 | 90 | 90 COMPENDIUM |
| **Enemies (8 types)** | 48 | 48 | 16 OFFICIAL, 32 COMPENDIUM |
| **Perks (48 perks)** | 96 | 96 | 96 COMPENDIUM |
| **Core Mechanics (Engine)** | 12 | 12 | 12 OFFICIAL / COMPENDIUM |
| **Total Constants** | **426** | **426** | **100% Sourced & Categorized** |

---

## 2. Core Mechanics Constants & Provenance

| Entity / Field | Production Value | Source Type | Raw Provenance Source | Status |
|---|---|---|---|---|
| `downedDamageMultiplier` | `2.0` (100% bonus) | OFFICIAL | 1.0 Patchnotes & Melee Tab Row 10 | VERIFIED |
| `shoveStaminaCost` | `15` | OFFICIAL | 1.0 Patchnotes (reduced 20->15) | VERIFIED |
| `kickStaminaCost` | `50` | COMPENDIUM | Melee Tab Row 15 | COMPENDIUM |
| `shoveStabilityDamage` | `20` | COMPENDIUM | Melee Tab Row 6 | COMPENDIUM |
| `kickStabilityDamage` | `100` | COMPENDIUM | Melee Tab Row 16 | COMPENDIUM |
| `stabilityThreshold.flinch` | `0 - 19` | COMPENDIUM | Melee Tab Row 6 | COMPENDIUM |
| `stabilityThreshold.interrupt`| `20 - 49` | COMPENDIUM | Melee Tab Row 7 | COMPENDIUM |
| `stabilityThreshold.stagger` | `50 - 99` | COMPENDIUM | Melee Tab Row 8 | COMPENDIUM |
| `stabilityThreshold.knockdown`| `100+` | COMPENDIUM | Melee Tab Row 9 | COMPENDIUM |
| `staminaStarved.dmgPenalty` | `-10%` | COMPENDIUM | Melee Tab Row 1 | COMPENDIUM |
| `staminaStarved.stabPenalty`| `-50%` | COMPENDIUM | Melee Tab Row 1 | COMPENDIUM |
| `staminaStarved.regenDelay` | `+2.0s` | COMPENDIUM | Melee Tab Row 1 | COMPENDIUM |

---

## 3. Enemy Health & Armor Constants

| Enemy | Base HP | Helmet HP | Penetration Req | Source Type | Provenance Reference |
|---|---|---|---|---|---|
| **Walker** | 100 | None | 0 | OFFICIAL | `compendium:enemy:walker` |
| **Runner** | 100 | None | 0 | OFFICIAL | `compendium:enemy:runner` |
| **Shambler (Shrieker)** | 70 | None | 0 | OFFICIAL | `compendium:enemy:shambler` |
| **Bloodied (Prime)** | 130 | None | 0 | OFFICIAL | `compendium:enemy:bloodied` |
| **Firefighter** | 100 | 30 | 1 | COMPENDIUM | `compendium:enemy:firefighter` |
| **Construction** | 100 | 30 | 1 | COMPENDIUM | `compendium:enemy:construction` |
| **National Guard (Armored)**| 100 | 90 | 3 | COMPENDIUM | `compendium:enemy:national-guard` |
| **Riot Police** | 100 | 60 (Riot Shield: 200)| 2 | COMPENDIUM | `compendium:enemy:riot-police` |

---

## 4. Perk Scaling & Applicability Constants

| Perk | Tier | Effect | Target Condition | Source Type | Provenance Reference |
|---|---|---|---|---|---|
| **Hitman** | Standard | +15% Damage, +15% Stamina | One-handed melee | COMPENDIUM | `compendium:perk:hitman` |
| **Hitman - Expert** | Expert | +30% Damage, +15% Stamina | One-handed melee (all types) | COMPENDIUM | `compendium:perk:hitman-expert` |
| **Heavy Hitter** | Standard | +15% Damage, +15% Stamina | Two-handed melee | COMPENDIUM | `compendium:perk:heavy-hitter` |
| **Heavy Hitter - Expert**| Expert | +30% Damage, +15% Stamina | Two-handed melee (all types) | COMPENDIUM | `compendium:perk:heavy-hitter-expert` |
| **Foreman** | Standard | +10 Kick Damage | Kick | COMPENDIUM | `compendium:perk:foreman` |
| **Foreman - Expert** | Expert | +30 Kick Damage | Kick | COMPENDIUM | `compendium:perk:foreman-expert` |
