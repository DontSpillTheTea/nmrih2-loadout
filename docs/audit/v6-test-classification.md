# V6 Test Taxonomy & Comprehensive Test Classification (Sections 21 & 22)

**Date**: 2026-08-30  
**Total Tests**: 45 passed (across 8 test files)  

---

## 1. Classification Categories & Criteria

- **`ENGINE_SYNTHETIC`**: Tests generic engine logic (codecs, graph frontiers, profile serialization) using arbitrary or synthetic fixture data. Does NOT prove game truth.
- **`SOURCE_CONFORMANCE`**: Tests that engine transitions and solver outputs conform to imported 1.0.4.0 compendium tables and patch values.
- **`OFFICIAL_REGRESSION`**: Verifies explicit official patch notes and developer-stated rules (e.g. Shove 15 stam, Downed 2.0x modifier).
- **`SHIPPING_GAME_VERIFICATION`**: Verifies values directly extracted from local shipping game assets.
- **`BLACK_BOX_GAMEPLAY`**: Verifies controlled in-game observations (e.g. Cleaver + Hitman Expert 2-hit Nightmare kill).

---

## 2. Test-by-Test Classification Table

| Test File | Test Name | Classification Category | Provenance Reference |
|---|---|---|---|
| `tests/combat-verification.test.ts` | Case A: Cleaver One-Shot walker with Charged Head | **SOURCE_CONFORMANCE** | `compendium:melee:cleaver` |
| `tests/combat-verification.test.ts` | Case B: Baseball Bat Two-Shot walker with Quick Head | **SOURCE_CONFORMANCE** | `compendium:melee:baseball-bat` |
| `tests/combat-verification.test.ts` | Case C: Pipe Small requires 5 Quick head hits | **SOURCE_CONFORMANCE** | `compendium:melee:pipe-small` |
| `tests/combat-verification.test.ts` | Case D: Fire Axe Charged headshot kills in 1 hit | **SOURCE_CONFORMANCE** | `compendium:melee:fire-axe` |
| `tests/combat-verification.test.ts` | Case E: Shovel 3-hit combo | **SOURCE_CONFORMANCE** | `compendium:melee:shovel` |
| `tests/combat-verification.test.ts` | Case F: Knockdown 2x Damage Multiplier | **OFFICIAL_REGRESSION** | Official 1.0 Patchnotes |
| `tests/combat-verification.test.ts` | Case G: Stamina Starvation Penalty | **SOURCE_CONFORMANCE** | `compendium:melee:unarmed` |
| `tests/combat-verification.test.ts` | Case H: Cleaver + Hitman Expert 2-hit kill on Nightmare | **BLACK_BOX_GAMEPLAY** | Human in-game testing |
| `tests/control-dominance.test.ts` | TEST A: Kick alone dominates Shove -> Kick | **SOURCE_CONFORMANCE** | Solver candidate dominance |
| `tests/control-dominance.test.ts` | TEST B: Target already Downed rejects zero-damage Shove | **SOURCE_CONFORMANCE** | Solver candidate dominance |
| `tests/control-dominance.test.ts` | TEST C: Target already Downed rejects second Kick | **SOURCE_CONFORMANCE** | Solver candidate dominance |
| `tests/control-dominance.test.ts` | TEST D: Shove with declarative damage perk is generated | **ENGINE_SYNTHETIC** | Synthetic perk test |
| `tests/control-dominance.test.ts` | TEST E: Kick with Foreman perk is generated | **SOURCE_CONFORMANCE** | `compendium:perk:foreman` |
| `tests/control-dominance.test.ts` | TEST F: Firearm scenario allows Kick -> Shoot with 2x | **SOURCE_CONFORMANCE** | `compendium:melee:unarmed` |
| `tests/control-dominance.test.ts` | TEST G: Firearm Safe Opener rejects repeated Shoves | **SOURCE_CONFORMANCE** | Solver candidate dominance |
| `tests/control-dominance.test.ts` | Sequence formatter outputs unicode arrow | **ENGINE_SYNTHETIC** | UI pure helper |
| `tests/control-dominance.test.ts` | Firearms lowest_stamina ranks lowest rounds used | **SOURCE_CONFORMANCE** | Firearm solver objective |
| `tests/control-dominance.test.ts` | Helmeted enemies reduce stability damage if sourced | **ENGINE_SYNTHETIC** | Synthetic stability test |
| `tests/armor-firearms.test.ts` | M14 Battle Rifle penetrates NG helmet | **SOURCE_CONFORMANCE** | `compendium:weapon:m14` |
| `tests/armor-firearms.test.ts` | Low-penetration firearm absorbs into helmet HP | **SOURCE_CONFORMANCE** | `compendium:weapon:gruber` |
| `tests/armor-firearms.test.ts` | Excess non-penetrating damage breaks helmet (Model) | **ENGINE_SYNTHETIC** | Model behavior test |
| `tests/armor-firearms.test.ts` | Shotgun pellets and spread calculation | **SOURCE_CONFORMANCE** | `compendium:weapon:m590a1` |
| `tests/combo.test.ts` | (6 tests: combo state transitions) | **SOURCE_CONFORMANCE** | Combo state machine |
| `tests/transition.test.ts` | (6 tests: state transitions & postures) | **SOURCE_CONFORMANCE** | Engine transition logic |
| `tests/solver.test.ts` | (3 tests: Pareto multi-objective search) | **ENGINE_SYNTHETIC** | Solver frontier graph |
| `tests/codec.test.ts` | (7 tests: base64/URL loadout serialization) | **ENGINE_SYNTHETIC** | Codec serializer |
| `tests/planner.test.ts` | (1 test: profile & loadout CRUD operations) | **ENGINE_SYNTHETIC** | Profile storage |

---

## 3. Summary of Test Counts by Category
- **SOURCE_CONFORMANCE**: **26 tests**
- **ENGINE_SYNTHETIC**: **17 tests**
- **OFFICIAL_REGRESSION**: **1 test**
- **BLACK_BOX_GAMEPLAY**: **1 test**
- **SHIPPING_GAME_VERIFICATION**: **0 tests** (Frame-by-frame anim notifies pending extraction)
- **Total Tests**: **45 passed (0 failed)**
