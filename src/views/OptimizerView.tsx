import React, { useState, useMemo } from 'react';
import type { Weapon, Enemy, Perk, OptimizerObjective, OptimizerConstraints, CombatRecipe, PlayerInput } from '../types';
import {
  weapons,
  enemies,
  perks,
  mechanics,
  getWeaponById,
  getEnemyById,
  getMeleeBySubcategory,
  getFirearmsBySubcategory,
  getLogicalPerkGroups,
  type LogicalPerkGroup
} from '../data/loader';
import { solveCombat } from '../solver';
import { formatActionPill, formatActionSequence } from '../utils/format';
import { StepBreakdownModal } from '../components/StepBreakdownModal';
import { ReportResultModal } from '../components/ReportResultModal';

interface OptimizerViewProps {
  selectedWeaponId: number;
  onSelectWeaponId: (id: number) => void;
  selectedEnemyId: number;
  onSelectEnemyId: (id: number) => void;
  objective: OptimizerObjective;
  onSelectObjective: (obj: OptimizerObjective) => void;
  constraints: OptimizerConstraints;
  onUpdateConstraints: (c: OptimizerConstraints) => void;
  selectedPerkIds: number[];
  onSetPerkTier: (baseSlug: string, tier: 'off' | 'standard' | 'expert') => void;
}

export const OptimizerView: React.FC<OptimizerViewProps> = ({
  selectedWeaponId,
  onSelectWeaponId,
  selectedEnemyId,
  onSelectEnemyId,
  objective,
  onSelectObjective,
  constraints,
  onUpdateConstraints,
  selectedPerkIds,
  onSetPerkTier
}) => {
  const [activeBreakdownRecipe, setActiveBreakdownRecipe] = useState<CombatRecipe | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportTargetRecipe, setReportTargetRecipe] = useState<CombatRecipe | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');

  const selectedWeapon = getWeaponById(selectedWeaponId) || weapons[0];
  const selectedEnemy = getEnemyById(selectedEnemyId) || enemies[0];

  const meleeGroups = useMemo(() => getMeleeBySubcategory(), []);
  const firearmGroups = useMemo(() => getFirearmsBySubcategory(), []);
  const logicalPerks = useMemo(() => getLogicalPerkGroups(), []);

  const activePerks = useMemo(() => {
    return perks.filter(p => selectedPerkIds.includes(p.id));
  }, [selectedPerkIds]);

  const filteredPerkGroups = useMemo(() => {
    return logicalPerks.filter(group => {
      const matchesSearch = group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTag = selectedTag === 'all' || group.tags.includes(selectedTag);
      return matchesSearch && matchesTag;
    });
  }, [logicalPerks, searchTerm, selectedTag]);

  const recipes = useMemo(() => {
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

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const g of logicalPerks) {
      for (const t of g.tags) set.add(t);
    }
    return Array.from(set);
  }, [logicalPerks]);

  const isArmoredEnemy = (selectedEnemy.armor && selectedEnemy.armor.length > 0) || false;

  const handleOpenReport = (recipe?: CombatRecipe) => {
    setReportTargetRecipe(recipe || recipes[0]);
    setIsReportModalOpen(true);
  };

  return (
    <div className="tab-pane active">
      <div className="grid grid-3">
        {/* Left Column: Enemy & Weapon Selection + Constraints */}
        <div className="selection-column">
          <div className="card">
            <h2 className="card-title">Enemy and Weapon</h2>

            <div className="form-group">
              <label className="form-label">Difficulty</label>
              <div className="pill-selector">
                {(['normal', 'hard', 'nightmare'] as const).map(diff => (
                  <button
                    key={diff}
                    className={`pill-btn ${constraints.difficulty === diff ? 'active' : ''}`}
                    onClick={() => onUpdateConstraints({ ...constraints, difficulty: diff })}
                  >
                    {diff.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Enemy</label>
              <select
                className="form-select"
                value={selectedEnemyId}
                onChange={e => onSelectEnemyId(Number(e.target.value))}
              >
                {enemies.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.baseHp} HP)
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Weapon</label>
              <select
                className="form-select"
                value={selectedWeaponId}
                onChange={e => onSelectWeaponId(Number(e.target.value))}
              >
                <optgroup label="Melee: Bladed">
                  {meleeGroups.bladed.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.handedness})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Melee: Blunt">
                  {meleeGroups.blunt.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.handedness})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Firearms: Handguns">
                  {firearmGroups.handguns.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.ammoType || 'Handgun'})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Firearms: SMGs">
                  {firearmGroups.smgs.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.ammoType || 'SMG'})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Firearms: Shotguns">
                  {firearmGroups.shotguns.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.name} (12 Gauge)
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Firearms: Rifles">
                  {firearmGroups.rifles.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.ammoType || 'Rifle'})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {selectedWeapon.category === 'firearm' && (
              <div className="stat-row" style={{ marginTop: '0.5rem' }}>
                <span className="stat-label">Penetration:</span>
                <span className="stat-value">Tier {selectedWeapon.penetration ?? 0}</span>
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="card-title">Goal</h2>
            <div className="objective-grid">
              <button
                className={`objective-card ${objective === 'lowest_stamina' ? 'active' : ''}`}
                onClick={() => onSelectObjective('lowest_stamina')}
              >
                <div className="objective-title">💧 Efficient Kill</div>
                <div className="objective-desc">Minimizes resource consumption (stamina for melee, rounds for guns)</div>
              </button>
              <button
                className={`objective-card ${objective === 'fastest_kill' ? 'active' : ''}`}
                onClick={() => onSelectObjective('fastest_kill')}
              >
                <div className="objective-title">⚡ Fast Kill</div>
                <div className="objective-desc">Minimizes hit count and PlayRate execution time</div>
              </button>
              <button
                className={`objective-card ${objective === 'safest_kill' ? 'active' : ''}`}
                onClick={() => onSelectObjective('safest_kill')}
              >
                <div className="objective-title">🛡️ Safe Control</div>
                <div className="objective-desc">Fastest route to interrupt or stagger the enemy</div>
              </button>
              <button
                className={`objective-card ${objective === 'fewest_attacks' ? 'active' : ''}`}
                onClick={() => onSelectObjective('fewest_attacks')}
              >
                <div className="objective-title">🎯 Fewest Hits</div>
                <div className="objective-desc">Strict minimum number of weapon attacks</div>
              </button>
            </div>

            <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
              <label className="form-label">Hit Zone</label>
              <div className="pill-selector">
                {(['auto', 'head', 'body', 'limb'] as const).map(hz => (
                  <button
                    key={hz}
                    className={`pill-btn ${constraints.targetHitZone === hz ? 'active' : ''}`}
                    onClick={() => onUpdateConstraints({ ...constraints, targetHitZone: hz })}
                  >
                    {hz.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="toggle-item" style={{ marginTop: '0.75rem' }}>
              <div>
                <div className="toggle-label">🛡️ Safe Opener</div>
                <div className="toggle-desc">Hit 1 must flinch/interrupt or kill enemy</div>
              </div>
              <input
                type="checkbox"
                checked={constraints.safeOpener ?? constraints.requireFirstInterrupt}
                onChange={e => onUpdateConstraints({
                  ...constraints,
                  safeOpener: e.target.checked,
                  requireFirstInterrupt: e.target.checked
                })}
              />
            </div>

            <div className="toggle-item">
              <div>
                <div className="toggle-label">⚡ Pre-Charge Opener</div>
                <div className="toggle-desc">Hold Charged out of range; release on entry</div>
              </div>
              <input
                type="checkbox"
                checked={constraints.preChargedOpener}
                onChange={e => onUpdateConstraints({ ...constraints, preChargedOpener: e.target.checked })}
              />
            </div>

            <div className="toggle-item">
              <div>
                <div className="toggle-label">Require Knockdown</div>
                <div className="toggle-desc">Forces knockdown for 2x damage</div>
              </div>
              <input
                type="checkbox"
                checked={constraints.requireKnockdownBeforeKill}
                onChange={e => onUpdateConstraints({ ...constraints, requireKnockdownBeforeKill: e.target.checked })}
              />
            </div>

            <div className="toggle-item">
              <div>
                <div className="toggle-label">Allow Shove</div>
                <div className="toggle-desc">15 Stamina, 20 Stability</div>
              </div>
              <input
                type="checkbox"
                checked={constraints.allowShove}
                onChange={e => onUpdateConstraints({ ...constraints, allowShove: e.target.checked })}
              />
            </div>

            <div className="toggle-item">
              <div>
                <div className="toggle-label">Allow Kick</div>
                <div className="toggle-desc">50 Stamina, 100 Stability</div>
              </div>
              <input
                type="checkbox"
                checked={constraints.allowKick}
                onChange={e => onUpdateConstraints({ ...constraints, allowKick: e.target.checked })}
              />
            </div>
          </div>
        </div>

        {/* Center Column: Optimal Attacks */}
        <div className="results-column">
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 className="card-title" style={{ margin: 0 }}>Optimal Attacks</h2>
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <button
                  className="btn btn-sm"
                  onClick={() => handleOpenReport()}
                  title="Report a discrepancy or in-game result mismatch"
                  style={{ fontSize: '0.75rem', borderColor: 'rgba(234, 179, 8, 0.4)', color: '#fde047' }}
                >
                  📝 Report Result
                </button>
                <span className="badge badge-official">Combo State Enforced</span>
                {isArmoredEnemy && (
                  <span className="badge" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }} title="Armor mechanics (break overflow/pass-through) are based on current model assumptions">
                    Armor Model Incomplete
                  </span>
                )}
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
                  const isFirearm = recipe.weapon.category === 'firearm';
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
                            {recipe.actions.map((act, aIdx) => {
                              const pill = formatActionPill(act.input, act.hitZone, act.resolvedAttack?.name);
                              return (
                                <React.Fragment key={aIdx}>
                                  <span className={`action-pill ${pill.isCharged ? 'charged' : ''} ${pill.isControl ? 'control' : ''}`}>
                                    {pill.label} {pill.icon}
                                  </span>
                                  {aIdx < recipe.actions.length - 1 && (
                                    <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>→</span>
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
                          {recipe.armorBroken && (
                            <span className="badge" style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#f87171' }}>
                              Armor Broken
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                        Sequence: <strong style={{ color: '#fff' }}>{formatActionSequence(recipe)}</strong>
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
                            PlayRate Est • Ready: ~{(recipe.readyAfterKillMs / 1000).toFixed(2)}s
                          </div>
                        </div>

                        <div className="metric-box">
                          <div className="metric-label">
                            {isFirearm ? 'Rounds Used' : 'Stamina Spent'}
                          </div>
                          <div className="metric-value">
                            {isFirearm ? `${recipe.totalAmmoSpent} rds` : recipe.totalStaminaSpent}
                          </div>
                        </div>

                        <div className="metric-box">
                          <div className="metric-label">First Control</div>
                          <div className="metric-value" style={{ color: 'var(--accent-purple)' }}>
                            {recipe.timeToFirstControlMs !== null ? `~${(recipe.timeToFirstControlMs / 1000).toFixed(2)}s` : 'None'}
                          </div>
                        </div>
                      </div>

                      {/* Dimension-Specific Confidence Indicators */}
                      <div style={{ display: 'flex', gap: '0.6rem', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                        <span>Damage <strong style={{ color: '#4ade80' }}>✓</strong></span>
                        <span>{isFirearm ? 'Ammo' : 'Stamina'} <strong style={{ color: '#4ade80' }}>✓</strong></span>
                        <span>Timing <strong style={{ color: '#fbbf24' }}>~Est</strong></span>
                        {isArmoredEnemy ? (
                          <span>Armor <strong style={{ color: '#f87171' }}>Experimental</strong></span>
                        ) : (
                          <span>Armor <strong style={{ color: 'var(--text-muted)' }}>N/A</strong></span>
                        )}
                      </div>

                      <div style={{ marginTop: '0.65rem', fontSize: '0.75rem', color: 'var(--accent-cyan)', textAlign: 'right', fontWeight: 600 }}>
                        Why this works & formula breakdown →
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Perks Rail */}
        <div className="perk-rail">
          <div className="card">
            <h2 className="card-title">Perks</h2>

            <div style={{ marginBottom: '0.75rem' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search perks..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ fontSize: '0.8rem' }}
              />
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.85rem' }}>
              <button
                className={`pill-btn ${selectedTag === 'all' ? 'active' : ''}`}
                style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
                onClick={() => setSelectedTag('all')}
              >
                All
              </button>
              {allTags.map(tag => (
                <button
                  key={tag}
                  className={`pill-btn ${selectedTag === tag ? 'active' : ''}`}
                  style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
                  onClick={() => setSelectedTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>

            <div className="perk-list" style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
              {filteredPerkGroups.map(group => {
                const stdId = group.standardPerk?.id;
                const expId = group.expertPerk?.id;

                let currentTier: 'off' | 'standard' | 'expert' = 'off';
                if (expId && selectedPerkIds.includes(expId)) {
                  currentTier = 'expert';
                } else if (stdId && selectedPerkIds.includes(stdId)) {
                  currentTier = 'standard';
                }

                return (
                  <div key={group.baseSlug} className="perk-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                      <span className="perk-name">{group.name}</span>
                      <div className="tier-toggle">
                        <button
                          className={`tier-btn ${currentTier === 'off' ? 'active' : ''}`}
                          onClick={() => onSetPerkTier(group.baseSlug, 'off')}
                        >
                          OFF
                        </button>
                        {group.standardPerk && (
                          <button
                            className={`tier-btn ${currentTier === 'standard' ? 'active' : ''}`}
                            onClick={() => onSetPerkTier(group.baseSlug, 'standard')}
                          >
                            STD
                          </button>
                        )}
                        {group.expertPerk && (
                          <button
                            className={`tier-btn ${currentTier === 'expert' ? 'active' : ''}`}
                            onClick={() => onSetPerkTier(group.baseSlug, 'expert')}
                          >
                            EXP
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="perk-desc">{group.description}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {activeBreakdownRecipe && (
        <StepBreakdownModal
          recipe={activeBreakdownRecipe}
          onClose={() => setActiveBreakdownRecipe(null)}
          onReport={() => {
            const r = activeBreakdownRecipe;
            setActiveBreakdownRecipe(null);
            handleOpenReport(r);
          }}
        />
      )}

      {isReportModalOpen && (
        <ReportResultModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          weapon={selectedWeapon}
          enemy={selectedEnemy}
          perks={activePerks}
          objective={objective}
          constraints={constraints}
          recipe={reportTargetRecipe}
        />
      )}
    </div>
  );
};
