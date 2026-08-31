# V6 Provenance Coverage & Metric Reconciliation (Section 24)

**Date**: 2026-08-30  
**Target Game Version**: 1.0.4.0  

---

## 1. Provenance Classification Breakdown

- **Total Production Sourced Fields**: **354 fields**
- **Official Corroborated**: **36 fields** (Patch notes, official core mechanics)
- **Compendium Sourced**: **318 fields** (Live 1.0.4.0 Compendium tables)
- **Local Game Extracted**: **0 fields** (Cooked IoStore animation notifies pending tool extraction)
- **Conflicted Fields**: **4 fields** (Helmet HP: 30/60/90 in Compendium vs 70/75/130 historical)
- **Unresolved Mechanics**: **3 mechanics** (Helmet overflow spillover, Penetrating firearm pass-through damage reduction, Kitchen Knife gameplay discrepancy)

---

## 2. Reconciliation: 426 Constants vs. 354 Provenance Fields

- **Why Constant Audit counts 426**:
  The Constant Audit (`docs/audit/v5-game-constant-audit.md`) counts every granular scalar across all JSON files:
  - 20 Melee Weapons $\times$ 9 attack stats (Body/Head/Limb damage, Stamina, Stability, Range, 3 PlayRates) = 180
  - 15 Firearms $\times$ 6 stats = 90
  - 8 Enemies $\times$ 6 stats (Base HP, 4 Stability thresholds, Speed) = 48
  - 48 Perks $\times$ 2 fields (Value, Stage) = 96
  - Core Mechanics = 12
  - **Total = 426 constants**.

- **Why Provenance Audit counts 354**:
  The Provenance Audit script (`scripts/audit-provenance.py`) checks primary combat-critical fields linked to provenance entities (filtering out default 1.0 multipliers and unreferenced helper fields).
