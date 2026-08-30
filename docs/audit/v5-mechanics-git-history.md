# V5 Mechanics Git History Audit

**Date**: 2026-08-30  

---

## Commit-by-Commit Mechanics Audit

### 1. Commit `b88cf51` — Directional Melee Combo Legality
- **Old Behavior**: Abstract free-standing Strong attacks selected freely in solver.
- **New Behavior**: Strict directional combo state where Strong attacks require repeating the same side tap (`Left -> Left` or `Right -> Right`).
- **Claimed Reason**: Game uses directional combo system where strong attacks depend on preceding input.
- **Evidence**: Verified in-game gameplay mechanics and combo state specifications.
- **Disposition**: **KEEP**.

### 2. Commit `925ffd6` — Exact State Key & Layered Armor
- **Old Behavior**: Coarse bucketing in solver equivalence key; binary armor.
- **New Behavior**: Exact state equivalence key tracking exact `accumulatedStability`, `armorLayers` durability/broken state, and `lastMeleeSide`.
- **Claimed Reason**: Solver was falsely merging non-equivalent stability/armor states.
- **Evidence**: Mathematical graph search correctness.
- **Disposition**: **KEEP**.

### 3. Commit `7a3624b` — Control Action Dominance (`getUsefulLegalActions`)
- **Old Behavior**: Zero-damage Shoves and Kicks evaluated in loops on Downed zombies.
- **New Behavior**: `getUsefulLegalActions` separates physical simulation legality from goal-directed useful actions. Zero-damage Shoves/Kicks pruned when target is already Downed.
- **Claimed Reason**: Eliminate nonsensical solver output like `Shove -> Shove -> Shoot`.
- **Evidence**: Control state dominance principles (Tests A-G in `tests/control-dominance.test.ts`).
- **Disposition**: **KEEP**.

### 4. Commit `ae62a10` & `796a76e` — Firearms Ammo Efficiency Ranking
- **Old Behavior**: Firearm recipes ranked primarily by stamina under `lowest_stamina`.
- **New Behavior**: Firearm recipes ranked primarily by `totalAmmoSpent` (rounds used).
- **Claimed Reason**: Bullets do not cost player stamina; ammo is the primary cost dimension for firearms.
- **Evidence**: User gameplay requirement and mechanical distinction between stamina-cost melee and ammo-cost firearms.
- **Disposition**: **KEEP**.

### 5. Commit `a309157` — Compare Matrix Dynamic Synchronization
- **Old Behavior**: Compare Matrix used hardcoded baseline parameters ignoring active perks/goal.
- **New Behavior**: Compare Matrix dynamically reflects active perks, goal/objective, difficulty, and safety constraints.
- **Disposition**: **KEEP**.
