import type { Weapon, Perk, Enemy, MechanicsConfig, OptimizerConstraints, OptimizerObjective, CombatRecipe } from '../types';
import { solveCombat } from '../solver';
import { enemies, getWeaponById, getPerkById } from '../data/loader';

export interface BreakpointDelta {
  enemySlug: string;
  enemyName: string;
  weaponName: string;
  baselineRecipe: CombatRecipe | null;
  newRecipe: CombatRecipe | null;
  actionsDelta: number; // e.g. -1 means 1 fewer attack needed (breakpoint gained!)
  timeSavedMs: number;
  staminaSaved: number;
  hasBreakpointGain: boolean;
  summary: string;
}

export interface EvaluatedPerkChoice {
  perk: Perk;
  score: number;
  breakpointGainsCount: number;
  deltas: BreakpointDelta[];
  recommendationReason: string;
}

export interface PerkPickerInput {
  weapon: Weapon;
  currentPerks: Perk[];
  offeredPerkIds: number[];
  mechanics: MechanicsConfig;
  constraints: OptimizerConstraints;
  objective: OptimizerObjective;
}

export function evaluateOfferedPerks(input: PerkPickerInput): EvaluatedPerkChoice[] {
  const {
    weapon,
    currentPerks,
    offeredPerkIds,
    mechanics,
    constraints,
    objective
  } = input;

  // Benchmark targets: Walker (Normal), Shambler, Prime, Runner
  const benchmarkEnemies = enemies.filter(e => ['walker', 'shambler', 'prime', 'runner'].includes(e.slug));

  // Compute baseline recipes for all benchmark targets
  const baselineMap = new Map<number, CombatRecipe | null>();
  for (const enemy of benchmarkEnemies) {
    const recipes = solveCombat({
      weapon,
      perks: currentPerks,
      enemy,
      mechanics,
      constraints,
      objective,
      maxActions: 6
    });
    baselineMap.set(enemy.id, recipes[0] ?? null);
  }

  const results: EvaluatedPerkChoice[] = [];

  for (const perkId of offeredPerkIds) {
    const perk = getPerkById(perkId);
    if (!perk) continue;

    const candidatePerks = [...currentPerks, perk];
    const deltas: BreakpointDelta[] = [];
    let totalScore = 0;
    let breakpointCount = 0;

    for (const enemy of benchmarkEnemies) {
      const baseline = baselineMap.get(enemy.id) ?? null;
      const newRecipes = solveCombat({
        weapon,
        perks: candidatePerks,
        enemy,
        mechanics,
        constraints,
        objective,
        maxActions: 6
      });
      const newRecipe = newRecipes[0] ?? null;

      let actionsDelta = 0;
      let timeSavedMs = 0;
      let staminaSaved = 0;
      let hasBreakpointGain = false;
      let summary = 'No change in combat breakpoint';

      if (baseline && newRecipe) {
        actionsDelta = newRecipe.totalActions - baseline.totalActions;
        timeSavedMs = baseline.totalTimeMs - newRecipe.totalTimeMs;
        staminaSaved = baseline.totalStaminaSpent - newRecipe.totalStaminaSpent;

        if (actionsDelta < 0) {
          hasBreakpointGain = true;
          breakpointCount += Math.abs(actionsDelta);
          totalScore += 50 * Math.abs(actionsDelta);
          summary = `Breakpoint gained! Reduces kill from ${baseline.totalActions} to ${newRecipe.totalActions} attacks (${(timeSavedMs / 1000).toFixed(2)}s faster)`;
        } else if (timeSavedMs > 100 || staminaSaved > 5) {
          totalScore += (timeSavedMs / 50) + (staminaSaved * 1.5);
          summary = `Same attack count (${newRecipe.totalActions}), but ${(timeSavedMs / 1000).toFixed(2)}s faster and saves ${staminaSaved.toFixed(1)} stamina`;
        }
      }

      deltas.push({
        enemySlug: enemy.slug,
        enemyName: enemy.name,
        weaponName: weapon.name,
        baselineRecipe: baseline,
        newRecipe,
        actionsDelta,
        timeSavedMs,
        staminaSaved,
        hasBreakpointGain,
        summary
      });
    }

    let recommendationReason = 'Provides general utility or stats without immediate kill breakpoint shift for current weapon.';
    if (breakpointCount > 0) {
      recommendationReason = `⭐ Top Recommendation! Gained ${breakpointCount} practical breakpoint(s) (fewer hits to kill) against benchmark enemies!`;
    } else if (totalScore > 10) {
      recommendationReason = `Improves attack execution speed and stamina efficiency on current weapon.`;
    }

    results.push({
      perk,
      score: totalScore,
      breakpointGainsCount: breakpointCount,
      deltas,
      recommendationReason
    });
  }

  // Sort by highest score / most breakpoint gains
  results.sort((a, b) => b.score - a.score || b.breakpointGainsCount - a.breakpointGainsCount);

  return results;
}
