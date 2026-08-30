import type {
  Weapon,
  Perk,
  Enemy,
  MechanicsConfig,
  OptimizerConstraints,
  OptimizerObjective,
  CombatRecipe
} from '../types';
import { solveCombat } from '../solver';
import { enemies, getPerkById } from '../data/loader';

export interface BreakpointDelta {
  enemyId: number;
  enemyName: string;
  baselineHits: number;
  newHits: number;
  hitDelta: number;
  baselineLethalTimeMs: number;
  newLethalTimeMs: number;
  timeSavedMs: number;
  staminaSaved: number;
  hasBreakpointGain: boolean;
  summary: string;
}

export interface EvaluatedPerkChoice {
  perk: Perk;
  score: number;
  deltas: BreakpointDelta[];
  recommendationReason: string;
  totalHitsSaved: number;
  totalTimeSavedMs: number;
  totalStaminaSaved: number;
}

export interface PerkPickerOptions {
  weapon: Weapon;
  currentPerks: Perk[];
  offeredPerkIds: number[];
  mechanics: MechanicsConfig;
  constraints: OptimizerConstraints;
  objective: OptimizerObjective;
}

export function evaluateOfferedPerks(options: PerkPickerOptions): EvaluatedPerkChoice[] {
  const {
    weapon,
    currentPerks,
    offeredPerkIds,
    mechanics,
    constraints,
    objective
  } = options;

  // Benchmark against standard core enemies
  const benchmarkEnemies: Enemy[] = enemies.slice(0, 4);

  // Baseline recipes with current perks
  const baselineRecipes = new Map<number, CombatRecipe>();
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
    if (recipes.length > 0) {
      baselineRecipes.set(enemy.id, recipes[0]);
    }
  }

  const results: EvaluatedPerkChoice[] = [];

  for (const perkId of offeredPerkIds) {
    const perk = getPerkById(perkId);
    if (!perk) continue;

    const candidatePerks = [...currentPerks, perk];
    const deltas: BreakpointDelta[] = [];
    let totalHitsSaved = 0;
    let totalTimeSavedMs = 0;
    let totalStaminaSaved = 0;

    for (const enemy of benchmarkEnemies) {
      const baseline = baselineRecipes.get(enemy.id);
      const newRecipes = solveCombat({
        weapon,
        perks: candidatePerks,
        enemy,
        mechanics,
        constraints,
        objective,
        maxActions: 6
      });
      const newRecipe = newRecipes[0];

      if (baseline && newRecipe) {
        const hitDelta = baseline.totalActions - newRecipe.totalActions;
        const timeSavedMs = Math.max(0, baseline.lethalImpactTimeMs - newRecipe.lethalImpactTimeMs);
        const staminaSaved = Math.max(0, baseline.totalStaminaSpent - newRecipe.totalStaminaSpent);
        const hasGain = hitDelta > 0 || (timeSavedMs > 100 && hitDelta >= 0);

        let summary = '';
        if (hitDelta > 0) {
          summary = `Kills in ${newRecipe.totalActions} hits instead of ${baseline.totalActions} (${hitDelta} fewer hit!)`;
        } else if (timeSavedMs > 100) {
          summary = `Saves ${(timeSavedMs / 1000).toFixed(2)}s kill time with equal hits (${newRecipe.totalActions} hits)`;
        } else if (staminaSaved > 2) {
          summary = `Saves ${staminaSaved.toFixed(1)} stamina per kill`;
        } else {
          summary = `No major breakpoint shift vs ${enemy.name.split(' ')[0]} (${newRecipe.totalActions} hits)`;
        }

        totalHitsSaved += Math.max(0, hitDelta);
        totalTimeSavedMs += timeSavedMs;
        totalStaminaSaved += staminaSaved;

        deltas.push({
          enemyId: enemy.id,
          enemyName: enemy.name,
          baselineHits: baseline.totalActions,
          newHits: newRecipe.totalActions,
          hitDelta,
          baselineLethalTimeMs: baseline.lethalImpactTimeMs,
          newLethalTimeMs: newRecipe.lethalImpactTimeMs,
          timeSavedMs,
          staminaSaved,
          hasBreakpointGain: hasGain,
          summary
        });
      }
    }

    // Explicit scoring rule: Hits saved weighted highest, then time saved, then stamina
    const score = (totalHitsSaved * 1000) + (totalTimeSavedMs / 10) + totalStaminaSaved;

    let recommendationReason = '';
    if (totalHitsSaved > 0) {
      recommendationReason = `⭐ Reduces hits to kill across ${totalHitsSaved} target archetype(s)`;
    } else if (totalTimeSavedMs > 200) {
      recommendationReason = `⚡ Accelerates kill timing by ${(totalTimeSavedMs / 1000).toFixed(2)}s across benchmarks`;
    } else if (totalStaminaSaved > 5) {
      recommendationReason = `💧 Saves ${totalStaminaSaved.toFixed(0)} stamina across benchmark kills`;
    } else {
      recommendationReason = `Utility / incremental stat increase without immediate breakpoint shift`;
    }

    results.push({
      perk,
      score,
      deltas,
      recommendationReason,
      totalHitsSaved,
      totalTimeSavedMs,
      totalStaminaSaved
    });
  }

  // Sort ranked by highest marginal utility score
  results.sort((a, b) => b.score - a.score);

  return results;
}
