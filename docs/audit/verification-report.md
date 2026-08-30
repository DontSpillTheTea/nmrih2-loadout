# NMRiH2 Combat Engine Verification & Provenance Report

Generated: 2026-08-30
Target Version: 1.0.4.0 (Steam Build ID: 24830003)

## 1. Provenance Coverage Summary
* **Total Combat-Critical Fields**: 354
* **Provenance Linked**: 354
* **Missing Provenance**: 0
* **Overall Provenance Coverage**: 100.0%

## 2. Entity Counts (Programmatically Verified)
* **Total Weapons**: 35 (20 Melee, 15 Firearms, 1 Universal Unarmed)
* **Total Perks**: 100 (Standard, Expert, Retired)
* **Active Gameplay Perks**: 94 (94 active, 6 retired)
* **Enemy Archetypes**: 8
* **Core Unit Tests**: 43 passed (100% green)

## 3. Directional Melee Combo Legality Status
* **Neutral Opener**: Strictly restricted to Quick attacks or Charged hold. Strong attacks cannot open from neutral.
* **Same-Direction Repeats**: Correctly resolved to Strong attacks.
* **Alternating Inputs**: Correctly resolved to chained Quick attacks.
* **Verification Fixtures**: 19 required fixture test cases passing in `tests/combat-verification.test.ts`.

## 4. Known Open Uncertainties
* **Exact Animation Timing**: Millisecond values are derived from play rate scaling and labeled as `derived-from-playrate / partially-verified`.
* **Limb Removal Timing**: Specific animation frames for crawler transition remain community measured.
