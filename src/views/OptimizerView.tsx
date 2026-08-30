import React, { useState, useMemo } from 'react';
import type { Weapon, Enemy, Perk, OptimizerObjective, OptimizerConstraints, CombatRecipe } from '../types';
import { weapons, enemies, perks, mechanics, getWeaponById, getEnemyById, getMeleeWeapons, getFirearms } from '../data/loader';
import { solveCombat } from '../solver';
import { StepBreakdownModal } from '../components/StepBreakdownModal';
import { analytics } from '../analytics';

interface OptimizerViewProps {
  selectedPerkIds: number[];
  onTogglePerk: (perkId: number) => void;
}

export const OptimizerView: React.FC<OptimizerViewProps> = ({ selectedPerkIds, onTogglePerk }) => {
  const [selectedWeaponId, setSelectedWeaponId] = useState<number>(11); // Cleaver
  const [selectedEnemyId, setSelectedEnemyId] = useState<number>(1);   // Walker
  const [objective, setObjective] = useState<OptimizerObjective>('fewest_attacks');
  const [constraints, setConstraints] = useState<OptimizerConstraints>({
    requireFirstInterrupt: false,
    requireKnockdownBeforeKill: false,
    minStaminaReserve: 0,
    allowShove: true,
    allowKick: true,
    allowCharged: true,
    allowLimb: false,
    targetHitZone: 'head',
    difficulty: 'normal'
  });

  const [activeBreakdownRecipe, setActiveBreakdownRecipe] = useState<CombatRecipe | null>(null);

  const selectedWeapon = useMemo(() => getWeaponById(selectedWeaponId) || weapons[0], [selectedWeaponId]);
  const selectedEnemy = useMemo(() => getEnemyById(selectedEnemyId) || enemies[0], [selectedEnemyId]);

  const activePerks = useMemo(() => {
    return perks.filter(p => selectedPerkIds.includes(p.id));
  }, [selectedPerkIds]);

  const recipes = useMemo(() => {
    analytics.capture({
      name: 'optimizer_run',
      properties: {
        enemySlug: selectedEnemy.slug,
        weaponSlug: selectedWeapon.slug,
        objective,
        perkCount: activePerks.length,
        allowKick: constraints.allowKick,
        allowShove: constraints.allowShove
      }
    });

    return solveCombat({
      weapon: selectedWeapon,
      perks: activePerks,
      enemy: selectedEnemy,
      mechanics,
      constraints,
      objective,
      maxActions: 6
    });
  }, [selectedWeapon, selectedEnemy, activePerks, constraints, objective]);

  const meleeList = useMemo(() => getMeleeWeapons(), []);
  const firearmsList = useMemo(() => getFirearms(), []);

  return (
    <div className="main-container">
      <div className="grid-2col">
        {/* Left Column: Controls & Assumptions */}
        <div className="sidebar">
          {/* Weapon & Enemy Selection */}
          <div className="card">
            <div className="card-title">Target & Weapon</div>

            <div className="form-group">
              <label className="form-label">Target Enemy</label>
              <select
                className="form-select"
                value={selectedEnemyId}
                onChange={e => setSelectedEnemyId(Number(e.target.value))}
              >
                {enemies.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.baseHp} HP)
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Active Weapon</label>
              <select
                className="form-select"
                value={selectedWeaponId}
                onChange={e => setSelectedWeaponId(Number(e.target.value))}
              >
                <optgroup label="Melee Weapons">
                  {meleeList.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.meleeCategory || 'Melee'}, {w.handedness})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Firearms">
                  {firearmsList.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.gunCategory})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Game Difficulty</label>
              <select
                className="form-select"
                value={constraints.difficulty}
                onChange={e => setConstraints({ ...constraints, difficulty: e.target.value as any })}
              >
                <option value="beginner">Beginner (0.7x Enemy HP)</option>
                <option value="normal">Normal (1.0x Enemy HP)</option>
                <option value="hard">Hard (Standard HP)</option>
                <option value="nightmare">Nightmare (Standard HP)</option>
              </select>
            </div>
          </div>

          {/* Objective Selection */}
          <div className="card">
            <div className="card-title">Optimization Goal</div>
            <div className="form-group">
              <label className="form-label">Primary Objective</label>
              <select
                className="form-select"
                value={objective}
                onChange={e => setObjective(e.target.value as OptimizerObjective)}
              >
                <option value="fewest_attacks">🎯 Fewest Attacks (Lowest Action Count)</option>
                <option value="fastest_kill">⚡ Fastest Kill (Lowest Animation TTK)</option>
                <option value="lowest_stamina">💧 Lowest Stamina Spent</option>
                <option value="safest_kill">🛡️ Safest Kill (Earliest Stun / Control)</option>
                <option value="balanced">⚖️ Balanced (Pareto Optimization)</option>
              </select>
            </div>
          </div>

          {/* Combat Toggles & Safety Constraints */}
          <div className="card">
            <div className="card-title">Combat Constraints</div>

            <div className="form-group">
              <label className="form-label">Hit Zone</label>
              <select
                className="form-select"
                value={constraints.targetHitZone}
                onChange={e => setConstraints({ ...constraints, targetHitZone: e.target.value as any })}
              >
                <option value="head">Headshots Assumed (High Damage)</option>
                <option value="body">Body Hits (Center Mass)</option>
                <option value="auto">Auto / Mixed (Solver Choice)</option>
                <option value="limb">Limb / Dismemberment</option>
              </select>
            </div>

            <div className="toggle-item">
              <div>
                <div className="toggle-label">Require First Interrupt</div>
                <div className="toggle-desc">Action 1 must flinch/interrupt enemy attack</div>
              </div>
              <input
                type="checkbox"
                checked={constraints.requireFirstInterrupt}
                onChange={e => setConstraints({ ...constraints, requireFirstInterrupt: e.target.checked })}
              />
            </div>

            <div className="toggle-item">
              <div>
                <div className="toggle-label">Require Knockdown</div>
                <div className="toggle-desc">Forces knockdown for 2.0x downed bonus</div>
              </div>
              <input
                type="checkbox"
                checked={constraints.requireKnockdownBeforeKill}
                onChange={e => setConstraints({ ...constraints, requireKnockdownBeforeKill: e.target.checked })}
              />
            </div>

            <div className="toggle-item">
              <div>
                <div className="toggle-label">Allow Shove</div>
                <div className="toggle-desc">15 Stamina, 20 Stability (Interrupt)</div>
              </div>
              <input
                type="checkbox"
                checked={constraints.allowShove}
                onChange={e => setConstraints({ ...constraints, allowShove: e.target.checked })}
              />
            </div>

            <div className="toggle-item">
              <div>
                <div className="toggle-label">Allow Kick</div>
                <div className="toggle-desc">50 Stamina, 100 Stability (Instant Knockdown)</div>
              </div>
              <input
                type="checkbox"
                checked={constraints.allowKick}
                onChange={e => setConstraints({ ...constraints, allowKick: e.target.checked })}
              />
            </div>

            <div className="toggle-item">
              <div>
                <div className="toggle-label">Allow Charged Attacks</div>
                <div className="toggle-desc">Heavier windup, massive headshot damage</div>
              </div>
              <input
                type="checkbox"
                checked={constraints.allowCharged}
                onChange={e => setConstraints({ ...constraints, allowCharged: e.target.checked })}
              />
            </div>
          </div>

          {/* Quick Active Perks Selector */}
          <div className="card">
            <div className="card-title">
              <span>Active Perks ({activePerks.length}/10)</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {perks.slice(0, 30).filter(p => p.effects.length > 0).map(p => {
                const isActive = selectedPerkIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    className={`btn btn-sm ${isActive ? 'btn-primary' : ''}`}
                    style={{ fontSize: '0.75rem' }}
                    onClick={() => onTogglePerk(p.id)}
                  >
                    {isActive ? '✓ ' : '+ '} {p.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Ranked Combat Recipes */}
        <div className="results-column">
          <div className="card">
            <div className="card-title">
              <div>
                <span>Ranked Combat Recipes</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
                  Against {selectedEnemy.name} • {selectedWeapon.name}
                </span>
              </div>
              <span className="badge badge-official">Exact Graph Search</span>
            </div>

            {recipes.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                No legal sequence found satisfying all active constraints. Try relaxing constraints (e.g. allow charged attacks or shove/kick).
              </div>
            ) : (
              <div>
                {recipes.map((recipe, idx) => {
                  const isTop = idx === 0;
                  return (
                    <div
                      key={recipe.id}
                      className={`recipe-card ${isTop ? 'top-pick' : ''}`}
                      onClick={() => setActiveBreakdownRecipe(recipe)}
                    >
                      <div className="recipe-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{
                            color: isTop ? 'var(--accent-green)' : 'var(--accent-blue)',
                            fontWeight: 700
                          }}>
                            #{idx + 1}
                          </span>
                          <div className="recipe-sequence">
                            {recipe.actions.map((act, aIdx) => {
                              const isCharged = act.attack.attackType === 'charged';
                              const isControl = act.attack.source === 'shove' || act.attack.source === 'kick';
                              return (
                                <React.Fragment key={aIdx}>
                                  <span className={`action-pill ${isCharged ? 'charged' : ''} ${isControl ? 'control' : ''}`}>
                                    {act.attack.name} ({act.hitZone})
                                  </span>
                                  {aIdx < recipe.actions.length - 1 && (
                                    <span style={{ color: 'var(--text-muted)' }}>→</span>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          {recipe.downedMultiplierUsed && (
                            <span className="badge badge-downed">2x Downed Bonus</span>
                          )}
                          {isTop && (
                            <span className="badge badge-official">Best Option</span>
                          )}
                        </div>
                      </div>

                      <div className="metrics-grid">
                        <div className="metric-box">
                          <div className="metric-label">Total Actions</div>
                          <div className={`metric-value ${isTop ? 'highlight' : ''}`}>
                            {recipe.totalActions} {recipe.totalActions === 1 ? 'hit' : 'hits'}
                          </div>
                        </div>

                        <div className="metric-box">
                          <div className="metric-label">Kill Time (TTK)</div>
                          <div className="metric-value">
                            {(recipe.totalTimeMs / 1000).toFixed(2)}s
                          </div>
                        </div>

                        <div className="metric-box">
                          <div className="metric-label">Stamina Spent</div>
                          <div className="metric-value">
                            {recipe.totalStaminaSpent}
                          </div>
                        </div>

                        <div className="metric-box">
                          <div className="metric-label">First Control</div>
                          <div className="metric-value" style={{ color: 'var(--accent-purple)' }}>
                            {recipe.timeToFirstControlMs !== null ? `${(recipe.timeToFirstControlMs / 1000).toFixed(2)}s` : 'None'}
                          </div>
                        </div>
                      </div>

                      <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--accent-cyan)', textAlign: 'right' }}>
                        Click to view step-by-step damage formula breakdown &raquo;
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <StepBreakdownModal
        recipe={activeBreakdownRecipe}
        onClose={() => setActiveBreakdownRecipe(null)}
      />
    </div>
  );
};
