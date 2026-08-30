import React, { useState, useMemo } from 'react';
import type { CombatRecipe } from '../types';
import { enemies, getMeleeWeapons, mechanics, getPerkById } from '../data/loader';
import { solveCombat } from '../solver';
import { StepBreakdownModal } from '../components/StepBreakdownModal';

interface CompareMatrixViewProps {
  selectedPerkIds: number[];
}

export const CompareMatrixView: React.FC<CompareMatrixViewProps> = ({ selectedPerkIds }) => {
  const [activeBreakdownRecipe, setActiveBreakdownRecipe] = useState<CombatRecipe | null>(null);

  const meleeWeapons = useMemo(() => getMeleeWeapons(), []);
  const coreEnemies = useMemo(() => enemies, []);

  const activePerks = useMemo(() => {
    return selectedPerkIds.map(id => getPerkById(id)).filter(Boolean) as any[];
  }, [selectedPerkIds]);

  const matrixData = useMemo(() => {
    const data: Record<string, Record<string, CombatRecipe | null>> = {};

    for (const w of meleeWeapons) {
      data[w.id] = {};
      for (const e of coreEnemies) {
        const recipes = solveCombat({
          weapon: w,
          perks: activePerks,
          enemy: e,
          mechanics,
          constraints: {
            requireFirstInterrupt: false,
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
          maxActions: 5
        });
        data[w.id][e.id] = recipes[0] ?? null;
      }
    }
    return data;
  }, [meleeWeapons, coreEnemies, activePerks]);

  return (
    <div className="main-container">
      <div className="card">
        <div className="card-title">
          <div>
            <span>📊 Melee Breakpoint Comparison Matrix</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
              Fewest Actions to Kill with Headshots (Click any cell to inspect legal combo)
            </span>
          </div>
          <span className="badge badge-official">Headshots Assumed</span>
        </div>

        <div className="matrix-table-wrapper">
          <table className="matrix-table">
            <thead>
              <tr>
                <th>Weapon</th>
                <th>Type</th>
                {coreEnemies.map(e => (
                  <th key={e.id}>
                    {e.name.split(' ')[0]} ({e.baseHp} HP)
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {meleeWeapons.map(w => (
                <tr key={w.id}>
                  <td>
                    <strong style={{ color: '#fff' }}>{w.name}</strong>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    {w.meleeCategory} ({w.handedness})
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

                    return (
                      <td key={e.id}>
                        <div
                          className={`matrix-cell ${isOneShot ? 'one-shot' : isTwoShot ? 'two-shot' : ''}`}
                          style={{ cursor: 'pointer' }}
                          title={`Click to view combo: ${recipe.actions.map(a => a.input.kind).join(' → ')}`}
                          onClick={() => setActiveBreakdownRecipe(recipe)}
                        >
                          {recipe.totalActions} hits ({(recipe.lethalImpactTimeMs / 1000).toFixed(2)}s)
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
