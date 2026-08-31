# V6 Current Armor Values & Source Conflict Resolution (Sections 11 & 12)

**Date**: 2026-08-30  
**Target Game Version**: 1.0.4.0  

---

## 1. Armor & Helmet Durability Comparison Matrix

| Enemy Profile | Helmet / Armor Name | Compendium Value (1.0.4.0) | Historical Official Material | Penetration Requirement | Selected Production Value | Source Classification | Status / Conflict Notes |
|---|---|---|---|---|---|---|---|
| **Construction** | Construction Helmet | **30 HP** | ~70 HP | **1** | **30 HP** | `COMPENDIUM` | Conflicted (30 HP from compendium row 0 vs 70 HP historical). |
| **Firefighter** | Firefighter Helmet | **30 HP** | ~75 HP | **1** | **30 HP** | `COMPENDIUM` | Conflicted (30 HP from compendium row 0 vs 75 HP historical). |
| **Riot Police** | Riot Helmet | **60 HP** | ~60 HP | **2** | **60 HP** | `COMPENDIUM` | Corroborated (Shield: 200 HP). |
| **National Guard**| NG Ballistic Helmet | **90 HP** | ~130 HP | **3** | **90 HP** | `COMPENDIUM` | Conflicted (90 HP from compendium row 0 vs 130 HP historical). |

---

## 2. Unresolved Armor Mechanics Documentation

1. **Non-Penetrating Breaking-Hit Overflow (`UNRESOLVED`)**:
   - *Hypothesis A (Model Default)*: Excess non-penetrating damage spills into the underlying zombie head HP when the helmet breaks.
   - *Hypothesis B (Gameplay Observation)*: Intact helmets consume 100% of the breaking hit, discarding any excess overkill.
   - *Status*: **UNRESOLVED**. Documented explicitly; not presented as authoritative truth.
2. **Penetrating Projectile Pass-Through (`UNRESOLVED`)**:
   - *Hypothesis A*: Penetration $\ge$ threshold yields 100% direct headshot damage.
   - *Hypothesis B*: Penetration $\ge$ threshold passes through with fractional damage mitigation.
   - *Status*: **UNRESOLVED**.
3. **Stability Damage Through Armor (`UNRESOLVED`)**:
   - Unsourced 50% flat resistance has been removed from production calculations.
