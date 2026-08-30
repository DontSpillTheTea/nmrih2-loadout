# V5 Test Suite Classification & Provenance Audit (Checkpoint 5)

**Date**: 2026-08-30  
**Total Tests**: 45 passed (across 8 test files)  

---

## 1. Test Suite Classification Summary

| Test Suite File | Total Tests | Classification | Description & Provenance |
|---|---|---|---|
| `tests/combat-verification.test.ts` | 8 | **GAME_VERIFICATION** | Verifies Cases A-F against official compendium breakpoints (Cleaver, Bat, Pipe, Fire Axe, Shovel). |
| `tests/armor-firearms.test.ts` | 4 | **GAME_VERIFICATION** | Verifies helmet absorption, M14 penetration (Pen 3), low-pen firearms against NG armored zombies. |
| `tests/control-dominance.test.ts` | 10 | **GAME_VERIFICATION** | Tests A-G for control action dominance, zero-damage shove/kick pruning, firearm ammo ranking, helmet stability. |
| `tests/combo.test.ts` | 6 | **GAME_VERIFICATION** | Verifies directional input resolution (`Tap L -> Tap L = Strong`, `Tap L -> Tap R = Quick`, `Hold = Charged`). |
| `tests/transition.test.ts` | 6 | **GAME_VERIFICATION** | Verifies posture transitions (Flinch, Interrupt, Stagger, Downed) and stamina starvation mechanics. |
| `tests/solver.test.ts` | 3 | **GAME_VERIFICATION** | Verifies Pareto multi-objective search, constraint filtering (Safe Opener, Stamina reserve). |
| `tests/codec.test.ts` | 7 | **ENGINE_SYNTHETIC** | Tests URL encoding/decoding and base64 serialization for loadout sharing. |
| `tests/planner.test.ts` | 1 | **ENGINE_SYNTHETIC** | Tests Responder profile and loadout CRUD state persistence. |

---

## 2. Test Breakdown by Category
- **GAME_VERIFICATION Tests**: **37 tests** (Source-linked to 1.0.4.0 verified compendium tables & patch notes).
- **ENGINE_SYNTHETIC Tests**: **8 tests** (Generic algorithm, data codec, and local persistence tests).
- **Invalid / Invented Tests Removed**: **0** (All test fixtures mapped to verified 1.0.4.0 game data).
