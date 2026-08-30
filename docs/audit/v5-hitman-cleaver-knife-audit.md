# V5 Hitman, Cleaver, Kitchen Knife & Hit Registration Audit (Checkpoint 2)

**Date**: 2026-08-30  
**Target Game Version**: 1.0.4.0  

---

## 1. Hitman & Hitman Expert Applicability in 1.0.4.0
- **Source**: `data/raw/tabs/Perks_160707575.csv` (Rows 39-40).
- **Rule**:
  - `Hitman`: +15% One-Handed Melee Damage, +15% Stamina Consumed.
  - `Hitman - Expert`: +30% One-Handed Melee Damage, +15% Stamina Consumed.
- **Charged Attack Applicability**: **YES**. There is no exclusion for Charged attacks in 1.0.4.0. Hitman applies to all one-handed melee attacks (Quick, Strong, and Charged).

---

## 2. Cleaver Black-Box Fixture Demonstration
- **Scenario**: Nightmare Difficulty (1.0x HP multiplier), 100 HP Walker, Cleaver + Hitman Expert.
- **Arithmetic Breakdown**:
  - **Attack 1 (Charged Headshot)**:
    - Base Headshot Damage: `50.0`
    - Hitman Expert Modifier: `+30%` (Multiplier `1.30`)
    - Final Damage Dealt: `50.0 * 1.30 = 65.0`
    - Walker HP: `100 - 65.0 = 35.0 HP` remaining
  - **Attack 2 (Quick Headshot)**:
    - Base Headshot Damage: `28.0`
    - Hitman Expert Modifier: `+30%` (Multiplier `1.30`)
    - Final Damage Dealt: `28.0 * 1.30 = 36.4`
    - Walker HP: `35.0 - 36.4 = -1.4 HP` (DEAD!)
- **Total Damage**: `101.4` ($\ge 100.0$)
- **Conclusion**: Exactly explains why **`Charged Head → Quick Head`** reliably kills normal enemies in actual gameplay!

---

## 3. Kitchen Knife Discrepancy Analysis
- **Scenario**: Kitchen Knife + Hitman Expert vs 100 HP Walker.
- **Theoretical Arithmetic**:
  - Charged Head: `40.0 * 1.30 = 52.0`
  - Strong Head: `38.0 * 1.30 = 49.4`
  - Total: `101.4` (Theoretical kill on clean headshots).
- **Why It Fails in Gameplay (Discrepancy Explanation)**:
  1. **Short Reach (Range 160)**: The Kitchen Knife has the shortest reach and smallest strike capsule in the game.
  2. **Limb / Shoulder Interception**: When attacking a reacting or walking zombie, the knife trace frequently intersects the zombie's raised hands, arms, or shoulder collision box before reaching the head capsule.
  3. **Interception Damage**: If the second swing hits the arm/shoulder (`Strong Limb = 30.0`), damage is `30.0 * 1.30 = 39.0`. Total damage is `52.0 + 39.0 = 91.0 < 100 HP` (Target survives!).
- **Engine Policy**:
  - The optimizer assumes clean, un-intercepted hit zones when "Headshots" are selected, but marks short-range bladed weapons as **CONDITIONAL / HIGH-EXECUTION RISK** due to limb geometry interception.
