import React, { useState, useMemo } from 'react';
import type { CombatRecipe, Weapon } from '../types';
import { enemies, getMeleeWeapons, getFirearms, mechanics, getPerkById } from '../data/loader';
import { solveCombat } from '../solver';
import { StepBreakdownModal } from '../components/StepBreakdownModal';

interface CompareMatrixViewProps {
  selectedPerkIds: number[];
}

export const CompareMatrixView: React.FC<CompareMatrixViewProps> = ({ selectedPerkIds }) => {
  const [activeBreakdownRecipe, setActiveBreakdownRecipe] = useState<CombatRecipe | null>(null);
  const [weaponTypeFilter, setWeaponTypeFilter] = useState<'all' | 'melee' | 'firearms'>('all');

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
          constraints: {
            requireFirstInterrupt: false,
            safeOpener: false,
            preChargedOpener: true,
            requireKnockdownBeforeKill: false,
            minStaminaReserve: 0,
            allowShove: true,
            allowKick: true,
            allowCharged: true,
            allowLimb: false,
            targetHitZone: 'head',
            difficulty: 'normal'
          },
          objective: 'fastest_kill',
          maxActions: 6
        });
        data[w.id][e.id] = recipes[0] ?? null;
      }
    }
    return data;
  }, [displayedWeapons, coreEnemies, activePerks]);

  return (
    <div className="main-container">
      <div className="card">
        <div className="card-title">
          <div>
            <span>📊 Breakpoint Comparison Matrix</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
              Fewest Actions to Kill with Headshots (Click any cell to inspect legal combo)
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <div className="tri-state-group">
              <button
                className={`tri-btn ${weaponTypeFilter === 'all' ? 'active-std' : ''}`}
                onClick={() => setWeaponTypeFilter('all')}
              >
                All ({displayedWeapons.length})
              </button>
              <button
                className={`tri-btn ${weaponTypeFilter === 'melee' ? 'active-std' : ''}`}
                onClick={() => setWeaponTypeFilter('melee')}
              >
                Melee ({meleeWeapons.length})
              </button>
              <button
                className={`tri-btn ${weaponTypeFilter === 'firearms' ? 'active-std' : ''}`}
                onClick={() => setWeaponTypeFilter('firearms')}
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

                    const isOneShot = recipe.totalActions === 1;
                    const isTwoShot = recipe.totalActions === 2;
                    const isFirearm = w.category === 'firearm';

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
                              {recipe.totalActions} {recipe.totalActions === 1 ? 'shot' : 'shots'}
                            </span>
                          ) : (
                            <span>
                              {recipe.totalActions} {recipe.totalActions === 1 ? 'hit' : 'hits'} (~{(recipe.lethalImpactTimeMs / 1000).toFixed(2)}s)
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
