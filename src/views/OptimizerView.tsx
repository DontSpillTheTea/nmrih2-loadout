import React, { useState, useMemo } from 'react';
import type { Weapon, Enemy, Perk, OptimizerObjective, OptimizerConstraints, CombatRecipe, PlayerInput } from '../types';
import {
  weapons,
  enemies,
  perks,
  mechanics,
  getWeaponById,
  getEnemyById,
  getMeleeWeapons,
  getFirearms,
  getLogicalPerkGroups,
  type LogicalPerkGroup
} from '../data/loader';
import { solveCombat } from '../solver';
import { StepBreakdownModal } from '../components/StepBreakdownModal';
import { analytics } from '../analytics';

interface OptimizerViewProps {
  selectedPerkIds: number[];
  onSetPerkTier: (baseSlug: string, tier: 'off' | 'standard' | 'expert') => void;
}

export const OptimizerView: React.FC<OptimizerViewProps> = ({ selectedPerkIds, onSetPerkTier }) => {
  const [selectedWeaponId, setSelectedWeaponId] = useState<number>(11); // Cleaver
  const [selectedEnemyId, setSelectedEnemyId] = useState<number>(1);   // Walker
  const [objective, setObjective] = useState<OptimizerObjective>('fastest_kill');
  const [constraints, setConstraints] = useState<OptimizerConstraints>({
    requireFirstInterrupt: true,
    safeOpener: true,
    preChargedOpener: true,
    requireKnockdownBeforeKill: false,
    minStaminaReserve: 0,
    allowShove: true,
    allowKick: true,
    allowCharged: true,
    allowLimb: false,
    targetHitZone: 'head',
    difficulty: 'normal'
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('all');
  const [activeBreakdownRecipe, setActiveBreakdownRecipe] = useState<CombatRecipe | null>(null);

  const selectedWeapon = useMemo(() => getWeaponById(selectedWeaponId) || weapons[0], [selectedWeaponId]);
  const selectedEnemy = useMemo(() => getEnemyById(selectedEnemyId) || enemies[0], [selectedEnemyId]);

  const activePerks = useMemo(() => {
    return perks.filter(p => selectedPerkIds.includes(p.id));
  }, [selectedPerkIds]);

  const logicalPerks = useMemo(() => getLogicalPerkGroups(), []);

  const filteredLogicalPerks = useMemo(() => {
    return logicalPerks.filter(group => {
      const matchesSearch = group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTag = selectedTag === 'all' || group.tags.includes(selectedTag);
      return matchesSearch && matchesTag;
    });
  }, [logicalPerks, searchTerm, selectedTag]);

  const recipes = useMemo(() => {
    analytics.capture({
      name: 'optimizer_run',
      properties: {
        enemySlug: selectedEnemy.slug,
        weaponSlug: selectedWeapon.slug,
        objective,
        perkCount: activePerks.length,
        safeOpener: constraints.safeOpener,
        preChargedOpener: constraints.preChargedOpener
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

  const getPerkTierState = (group: LogicalPerkGroup): 'off' | 'standard' | 'expert' => {
    if (group.expertPerk && selectedPerkIds.includes(group.expertPerk.id)) {
      return 'expert';
    }
    if (group.standardPerk && selectedPerkIds.includes(group.standardPerk.id)) {
      return 'standard';
    }
    return 'off';
  };

  return (
    <div className="main-container">
      <div className="grid-3col">
        {/* Left Column: Target & Scenario Controls */}
        <div className="sidebar">
          {/* Target & Weapon */}
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
              <label className="form-label">Difficulty</label>
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

          {/* Goal & Priority */}
          <div className="card">
            <div className="card-title">Goal & Optimization Priority</div>
            <div className="form-group">
              <label className="form-label">Objective</label>
              <select
                className="form-select"
                value={objective}
                onChange={e => setObjective(e.target.value as OptimizerObjective)}
              >
                <option value="fastest_kill">⚡ Fast Kill (Minimum Lethal Kill Time)</option>
                <option value="lowest_stamina">💧 Stamina-Efficient Kill</option>
                <option value="safest_kill">🛡️ Fast Control (Earliest Stun / Interruption)</option>
                <option value="efficient_control">⚖️ Stamina-Efficient Control</option>
                <option value="fewest_attacks">🎯 Advanced: Fewest Actions</option>
                <option value="balanced">📊 Advanced: Balanced Pareto Metric</option>
              </select>
            </div>
          </div>

          {/* Combat Toggles & Safety Constraints */}
          <div className="card">
            <div className="card-title">Combat Constraints</div>

            <div className="form-group">
              <label className="form-label">Target Hit Zone</label>
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
                <div className="toggle-label">🛡️ Safe Opener</div>
                <div className="toggle-desc">Target must be killed or stunned immediately</div>
              </div>
              <input
                type="checkbox"
                checked={constraints.safeOpener}
                onChange={e => setConstraints({
                  ...constraints,
                  safeOpener: e.target.checked,
                  requireFirstInterrupt: e.target.checked
                })}
              />
            </div>

            <div className="toggle-item">
              <div>
                <div className="toggle-label">⚡ Pre-Charge Opener</div>
                <div className="toggle-desc">Hold Charged outside range; release on entry</div>
              </div>
              <input
                type="checkbox"
                checked={constraints.preChargedOpener}
                onChange={e => setConstraints({ ...constraints, preChargedOpener: e.target.checked })}
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
                <div className="toggle-desc">50 Stamina, 100 Stability (Knockdown)</div>
              </div>
              <input
                type="checkbox"
                checked={constraints.allowKick}
                onChange={e => setConstraints({ ...constraints, allowKick: e.target.checked })}
              />
            </div>
          </div>
        </div>

        {/* Center Column: Recommended & Ranked Combat Recipes */}
        <div className="results-column">
          <div className="card">
            <div className="card-title">
              <div>
                <span>Ranked Legal Combat Recipes</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
                  vs. {selectedEnemy.name} • {selectedWeapon.name}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <span className="badge badge-official">Combo State Enforced</span>
                <span className="badge" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
                  ~PlayRate Scaled
                </span>
              </div>
            </div>

            {recipes.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                No legal input sequence found satisfying all active constraints. Try relaxing constraints (e.g. toggle Safe Opener or allow charged attacks).
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
                            fontWeight: 800,
                            fontSize: '1rem'
                          }}>
                            {isTop ? '⭐ RECOMMENDED' : `#${idx + 1}`}
                          </span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.35rem' }}>
                            {recipe.actions.map((act, aIdx) => (
                              <React.Fragment key={aIdx}>
                                {renderActionToken(act.input, act.hitZone)}
                                {aIdx < recipe.actions.length - 1 && (
                                  <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>&rarr;</span>
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          {recipe.downedMultiplierUsed && (
                            <span className="badge badge-downed">2x Downed Bonus</span>
                          )}
                          {recipe.armorBroken && (
                            <span className="badge" style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#f87171' }}>
                              Armor Broken
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                        Resolves to:{' '}
                        <strong style={{ color: '#fff' }}>
                          {recipe.logs.map(l => `${l.resolvedActionName}`).join(' &rarr; ')}
                        </strong>
                      </div>

                      <div className="metrics-grid">
                        <div className="metric-box">
                          <div className="metric-label">Total Actions</div>
                          <div className={`metric-value ${isTop ? 'highlight' : ''}`}>
                            {recipe.totalActions} {recipe.totalActions === 1 ? 'hit' : 'hits'}
                          </div>
                        </div>

                        <div className="metric-box">
                          <div className="metric-label">Lethal Kill TTK</div>
                          <div className="metric-value">
                            ~{(recipe.lethalImpactTimeMs / 1000).toFixed(2)}s
                          </div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                            Ready: ~{(recipe.readyAfterKillMs / 1000).toFixed(2)}s
                          </div>
                        </div>

                        <div className="metric-box">
                          <div className="metric-label">
                            {recipe.weapon.category === 'firearm' ? 'Rounds Used' : 'Stamina Spent'}
                          </div>
                          <div className="metric-value">
                            {recipe.weapon.category === 'firearm' ? `${recipe.totalAmmoSpent} rds` : recipe.totalStaminaSpent}
                          </div>
                        </div>

                        <div className="metric-box">
                          <div className="metric-label">First Control</div>
                          <div className="metric-value" style={{ color: 'var(--accent-purple)' }}>
                            {recipe.timeToFirstControlMs !== null ? `~${(recipe.timeToFirstControlMs / 1000).toFixed(2)}s` : 'None'}
                          </div>
                        </div>
                      </div>

                      <div style={{ marginTop: '0.65rem', fontSize: '0.75rem', color: 'var(--accent-cyan)', textAlign: 'right', fontWeight: 600 }}>
                        Why this works & formula breakdown &raquo;
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Tri-State Perk Rail */}
        <div className="perk-rail">
          <div className="card">
            <div className="card-title">
              <span>Perks & Build Rail</span>
              <span className="badge badge-official">{activePerks.length}/10 Active</span>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.65rem' }}>
              Select tier to toggle in-place and immediately observe breakpoint shifts:
            </p>

            <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.75rem' }}>
              <input
                className="form-input"
                style={{ padding: '0.35rem 0.55rem', fontSize: '0.8rem' }}
                placeholder="Search perk..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              <select
                className="form-select"
                style={{ width: '120px', padding: '0.35rem 0.45rem', fontSize: '0.75rem' }}
                value={selectedTag}
                onChange={e => setSelectedTag(e.target.value)}
              >
                <option value="all">All Tags</option>
                <option value="damage">Damage</option>
                <option value="stamina">Stamina</option>
                <option value="melee">Melee</option>
                <option value="firearm">Guns</option>
                <option value="stability">Stability</option>
              </select>
            </div>

            <div style={{ maxHeight: '680px', overflowY: 'auto', paddingRight: '0.25rem' }}>
              {filteredLogicalPerks.map(group => {
                const tierState = getPerkTierState(group);
                const hasExpert = !!group.expertPerk;
                const isEquipped = tierState !== 'off';

                return (
                  <div
                    key={group.baseSlug}
                    className={`perk-row-card ${tierState === 'expert' ? 'equipped-expert' : isEquipped ? 'equipped' : ''}`}
                  >
                    <div style={{ marginRight: '0.5rem', flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#fff' }}>
                        {group.name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.2, marginTop: '2px' }}>
                        {group.description.split('\n')[0]}
                      </div>
                    </div>

                    <div className="tri-state-group">
                      <button
                        className={`tri-btn ${tierState === 'off' ? 'active-off' : ''}`}
                        title="Turn Off"
                        onClick={() => onSetPerkTier(group.baseSlug, 'off')}
                      >
                        OFF
                      </button>
                      <button
                        className={`tri-btn ${tierState === 'standard' ? 'active-std' : ''}`}
                        title="Standard Tier"
                        onClick={() => onSetPerkTier(group.baseSlug, 'standard')}
                      >
                        STD
                      </button>
                      {hasExpert && (
                        <button
                          className={`tri-btn ${tierState === 'expert' ? 'active-exp' : ''}`}
                          title="Expert Tier"
                          onClick={() => onSetPerkTier(group.baseSlug, 'expert')}
                        >
                          EXP
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
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

function renderActionToken(input: PlayerInput, hitZone: string) {
  const isCharged = input.kind === 'hold';
  const isControl = input.kind === 'shove' || input.kind === 'kick';
  const isShot = input.kind === 'firearm_shot';

  let label = '';
  if (input.kind === 'tap') {
    label = `Quick ${input.side === 'left' ? 'L' : 'R'}`;
  } else if (input.kind === 'hold') {
    label = `Charged ${input.side === 'left' ? 'L' : 'R'}`;
  } else if (input.kind === 'shove') {
    label = 'Shove';
  } else if (input.kind === 'kick') {
    label = 'Kick';
  } else if (input.kind === 'firearm_shot') {
    label = 'Shot';
  }

  const icon = hitZone === 'head' ? '🎯' : isCharged ? '⚡' : isControl ? '🛡️' : isShot ? '💥' : '';

  return (
    <span className={`action-pill ${isCharged ? 'charged' : ''} ${isControl ? 'control' : ''}`}>
      {label} {icon}
    </span>
  );
}
