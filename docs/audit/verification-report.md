# NMRiH2 Combat Engine Verification & Provenance Report

Generated: 2026-08-30
Target Version: 1.0.4.0 (Steam Build ID: 24830003)

## 1. Provenance & Verification Summary
* **Total Combat-Critical Fields**: 354
* **Source-Linked Fields**: 354 (100.0% provenance coverage)
* **Official / Patch Notes Corroborated**: 36
* **Extracted Compendium Data**: 30
* **Community-Measured (Timing / Posture)**: 288
* **Unresolved**: 0

## 2. Programmatically Verified Entities
* **Total Weapons**: 35 (20 Melee, 15 Firearms, 1 Universal Unarmed)
* **Active Gameplay Perks**: 94 (94 active across 52 logical base perk cards)
* **Enemy Archetypes**: 8 (including Armored National Guard with NG Helmet & Body Armor, and Riot Police)
* **Core Unit Tests**: 35 passed (100% green across 7 test suites)

## 3. Solver Correctness & State Equivalence
* **Exact Stability**: State key includes exact accumulated stability (`0` to `100+`) to prevent premature state merges.
* **Layered Armor**: Helmet durability and broken flags are tracked independently per hitZone.
* **Pre-Charged Opener**: Models preparation out-of-range vs threat-exposed active hit window.
* **Safe Opener Default**: Defaulted to `true` across all new loadouts and scenarios.
