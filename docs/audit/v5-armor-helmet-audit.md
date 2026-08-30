# V5 Armor, Helmet & Penetration Mechanics Audit (Checkpoint 4)

**Date**: 2026-08-30  
**Target Game Version**: 1.0.4.0  

---

## 1. Helmet Durability & Penetration Threshold Values

| Helmet / Armor Profile | HitZone | Durability (HP) | Required Penetration | Source Provenance |
|---|---|---|---|---|
| **Construction Helmet** | Head | **30 HP** | 1 | `compendium:enemy:construction` |
| **Firefighter Helmet** | Head | **30 HP** | 1 | `compendium:enemy:firefighter` |
| **Riot Helmet** | Head | **60 HP** | 2 | `compendium:enemy:riot-police` |
| **National Guard Helmet** | Head | **90 HP** | 3 | `compendium:enemy:national-guard` |
| **Riot Shield** | Body | **200 HP** | 3 | `compendium:enemy:riot-police` |
| **Riot Vest / NG Body Armor**| Body | Passive (50% Gun Res)| N/A | `compendium:enemy:body-armor` |

---

## 2. Armor Mechanics Status

1. **Non-Penetrating Damage Absorption**:
   - Status: **VERIFIED IN COMPENDIUM / IMPLEMENTED**.
   - Rigid helmets absorb 100% of non-penetrating melee and firearm damage until helmet HP reaches 0.
2. **Breaking Hit Overkill / Spill-through**:
   - Status: **MODEL ASSUMPTION (EXPLICIT)**.
   - On the hit that breaks the helmet, excess damage past remaining helmet HP spills into the zombie head HP.
   - *Note*: If in-game behavior discards excess overkill on the break hit, the engine will be updated accordingly.
3. **High-Penetration Projectiles (Penetration $\ge$ Threshold)**:
   - Status: **VERIFIED IN COMPENDIUM / IMPLEMENTED**.
   - Penetrating firearms (e.g. M14 Battle Rifle, Hunter 85 with Pen 3) bypass ballistic helmet absorption, dealing 100% direct headshot damage to the zombie.
4. **Armor Stability Mitigation**:
   - Status: **COMPENDIUM-SOURCED (50% Mitigation for Intact Helmets)**.
   - When a helmet is intact, incoming stability damage is mitigated by 50% (`stabilityResistance: 0.5`). Once broken, 100% stability damage applies.
