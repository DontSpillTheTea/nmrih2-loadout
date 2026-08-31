import React, { useMemo } from 'react';
import type { CombatRecipe, Weapon, OptimizerConstraints, OptimizerObjective } from '../types';
import { enemies, getMeleeWeapons, getFirearms, mechanics, getPerkById } from '../data/loader';
import { solveCombat } from '../solver';
import { StepBreakdownModal } from '../components/StepBreakdownModal';

interface CompareMatrixViewProps {
  weaponTypeFilter: 'all' | 'melee' | 'firearms';
  onSelectWeaponTypeFilter: (filter: 'all' | 'melee' | 'firearms') => void;
  selectedPerkIds: number[];
  objective: OptimizerObjective;
  constraints: OptimizerConstraints;
  onSelectObjective?: (obj: OptimizerObjective) => void;
  onUpdateConstraints?: (c: OptimizerConstraints) => void;
}

export const CompareMatrixView: React.FC<CompareMatrixViewProps> = ({
  weaponTypeFilter,
  onSelectWeaponTypeFilter,
  selectedPerkIds,
  objective,
  constraints,
  onSelectObjective,
  onUpdateConstraints
}) => {
  const [activeBreakdownRecipe, setActiveBreakdownRecipe] = React.useState<CombatRecipe | null>(null);

  const meleeWeapons = useMemo(() => getMeleeWeapons(), []);
  const firearms = useMemo(() => getFirearms(), []);
  const coreEnemies = useMemo(() => enemies, []);

  const activePerks = useMemo(() => {
    return selectedPerkIds.map(id => getPerkById(id)).filter(Boolean) as any[];
  }, [selectedPerkIds]);

  const displayedWeapons: Weapon[] = useMemo(() => {
    if (weaponTypeFilter === 'melee') return meleeWeapons;
    if (weaponTypeFilter === 'firearms') return firearms;
    return [...meleeWeapons, ...firearms];
  }, [weaponTypeFilter, meleeWeapons, firearms]);

  const matrixData = useMemo(() => {
    const data: Record<string, Record<string, CombatRecipe | null>> = {};

    for (const w of displayedWeapons) {
      data[w.id] = {};
      for (const e of coreEnemies) {
        const recipes = solveCombat({
          weapon: w,
          perks: activePerks,
          enemy: e,
          mechanics,
          constraints,
          objective,
          maxActions: 7
        });
        data[w.id][e.id] = recipes[0] ?? null;
      }
    }
    return data;
  }, [displayedWeapons, coreEnemies, activePerks, constraints, objective]);

  const getObjectiveLabel = (obj: OptimizerObjective) => {
    switch (obj) {
      case 'fastest_kill': return '⚡ Fast Kill';
      case 'lowest_stamina': return '💧 Efficient Kill';
      case 'safest_kill': return '🛡️ Fast Control';
      case 'efficient_control': return '⚖️ Efficient Control';
      case 'fewest_attacks': return '🎯 Fewest Actions';
      case 'balanced': return '📊 Balanced';
      default: return obj;
    }
  };

  return (
    <div className="main-container">
      <div className="card">
        <div className="card-title">
          <div>
            <span>📊 Breakpoint Comparison Matrix</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
              Synchronized with active Perks ({activePerks.length}/10) • Goal: {getObjectiveLabel(objective)} • Difficulty: {constraints.difficulty.toUpperCase()}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {onSelectObjective && (
              <select
                className="form-select"
                style={{ width: '160px', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                value={objective}
                onChange={e => onSelectObjective(e.target.value as OptimizerObjective)}
              >
                <option value="fastest_kill">⚡ Fast Kill</option>
                <option value="lowest_stamina">💧 Efficient Kill</option>
                <option value="safest_kill">🛡️ Fast Control</option>
                <option value="efficient_control">⚖️ Efficient Control</option>
                <option value="fewest_attacks">🎯 Fewest Actions</option>
                <option value="balanced">📊 Balanced</option>
              </select>
            )}

            <div className="tri-state-group">
              <button
                className={`tri-btn ${weaponTypeFilter === 'all' ? 'active-std' : ''}`}
                onClick={() => onSelectWeaponTypeFilter('all')}
              >
                All ({meleeWeapons.length + firearms.length})
              </button>
              <button
                className={`tri-btn ${weaponTypeFilter === 'melee' ? 'active-std' : ''}`}
                onClick={() => onSelectWeaponTypeFilter('melee')}
              >
                Melee ({meleeWeapons.length})
              </button>
              <button
                className={`tri-btn ${weaponTypeFilter === 'firearms' ? 'active-std' : ''}`}
                onClick={() => onSelectWeaponTypeFilter('firearms')}
              >
                Firearms ({firearms.length})
              </button>
            </div>
            <span className="badge badge-official">Headshots Assumed</span>
          </div>
        </div>

        <div className="matrix-table-wrapper">
          <table className="matrix-table">
            <thead>
              <tr>
                <th>Weapon</th>
                <th>Category</th>
                {coreEnemies.map(e => (
                  <th key={e.id}>
                    {e.name.split(' ')[0]} ({e.baseHp} HP)
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayedWeapons.map(w => (
                <tr key={w.id}>
                  <td>
                    <strong style={{ color: '#fff' }}>{w.name}</strong>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    {w.category === 'melee'
                      ? `${w.meleeCategory || 'Melee'} (${w.handedness})`
                      : `${w.gunCategory || 'Firearm'}`}
                  </td>
                  {coreEnemies.map(e => {
                    const recipe = matrixData[w.id]?.[e.id];
                    if (!recipe) {
                      return (
                        <td key={e.id}>
                          <span style={{ color: 'var(--text-muted)' }}>-</span>
                        </td>
                      );
                    }

                    const isFirearm = w.category === 'firearm';
                    const rounds = recipe.totalAmmoSpent;
                    const stam = recipe.totalStaminaSpent;
                    const hits = recipe.totalActions;
                    const timeStr = `~${(recipe.lethalImpactTimeMs / 1000).toFixed(2)}s`;

                    const isOneShot = isFirearm ? rounds === 1 : hits === 1;
                    const isTwoShot = isFirearm ? rounds === 2 : hits === 2;

                    return (
                      <td key={e.id}>
                        <div
                          className={`matrix-cell ${isOneShot ? 'one-shot' : isTwoShot ? 'two-shot' : ''}`}
                          style={{ cursor: 'pointer' }}
                          title={`Click to view sequence: ${recipe.actions.map(a => a.input.kind).join(' → ')}`}
                          onClick={() => setActiveBreakdownRecipe(recipe)}
                        >
                          {isFirearm ? (
                            <span>
                              {rounds} {rounds === 1 ? 'rd' : 'rds'}
                              {stam > 0 && (
                                <span style={{ fontSize: '0.7rem', color: '#fbbf24', marginLeft: '3px' }}>
                                  ({stam}st)
                                </span>
                              )}
                            </span>
                          ) : (
                            <span>
                              {hits} {hits === 1 ? 'hit' : 'hits'}
                              {objective === 'lowest_stamina' ? ` (${stam}st)` : ` (${timeStr})`}
                            </span>
                          )}
                          {recipe.armorBroken && (
                            <span style={{ fontSize: '0.65rem', marginLeft: '3px', color: '#f87171' }}>💥</span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <StepBreakdownModal
        recipe={activeBreakdownRecipe}
        onClose={() => setActiveBreakdownRecipe(null)}
      />
    </div>
  );
};
