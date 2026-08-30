import React, { useState, useMemo } from 'react';
import type { Responder, OptimizerObjective, OptimizerConstraints } from '../types';
import { weapons, perks, mechanics, getWeaponById, getPerkById } from '../data/loader';
import { evaluateOfferedPerks } from '../planner/perk-picker';

interface PerkPickerViewProps {
  activeResponder: Responder;
}

export const PerkPickerView: React.FC<PerkPickerViewProps> = ({ activeResponder }) => {
  const [weaponId, setWeaponId] = useState<number>(11); // Cleaver
  const [choice1, setChoice1] = useState<number>(29); // Headhunter
  const [choice2, setChoice2] = useState<number>(37); // Hitman
  const [choice3, setChoice3] = useState<number>(7);  // Athlete

  const [objective] = useState<OptimizerObjective>('fewest_attacks');
  const [constraints] = useState<OptimizerConstraints>({
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

  const selectedWeapon = useMemo(() => getWeaponById(weaponId) || weapons[0], [weaponId]);

  const currentEquippedPerks = useMemo(() => {
    return activeResponder.perkIds.map(id => getPerkById(id)).filter(Boolean) as any[];
  }, [activeResponder]);

  const evaluatedChoices = useMemo(() => {
    const offered = [choice1, choice2, choice3].filter(id => id > 0);
    return evaluateOfferedPerks({
      weapon: selectedWeapon,
      currentPerks: currentEquippedPerks,
      offeredPerkIds: offered,
      mechanics,
      constraints,
      objective
    });
  }, [selectedWeapon, currentEquippedPerks, choice1, choice2, choice3, constraints, objective]);

  const availablePerks = useMemo(() => {
    return perks.filter(p => p.tier !== 'retired' && !activeResponder.perkIds.includes(p.id));
  }, [activeResponder]);

  return (
    <div className="main-container">
      <div className="card">
        <div className="card-title">
          <div>
            <span>🎲 In-Game RNG Perk Choice Assistant</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
              Marginal Breakpoint Analysis for {activeResponder.name} ({currentEquippedPerks.length}/10 slots used)
            </span>
          </div>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
          When the game offers you 3 RNG perk choices on level-up, select them below. The engine runs a full combat sequence search across benchmark zombie archetypes to determine which perk actually crosses a critical combat breakpoint (fewer hits to kill or safer control).
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="form-group">
            <label className="form-label">Primary Weapon to Benchmark</label>
            <select
              className="form-select"
              value={weaponId}
              onChange={e => setWeaponId(Number(e.target.value))}
            >
              {weapons.map(w => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.category})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Option #1 Rolled</label>
            <select
              className="form-select"
              value={choice1}
              onChange={e => setChoice1(Number(e.target.value))}
            >
              {availablePerks.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.tier})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Option #2 Rolled</label>
            <select
              className="form-select"
              value={choice2}
              onChange={e => setChoice2(Number(e.target.value))}
            >
              {availablePerks.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.tier})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Option #3 Rolled</label>
            <select
              className="form-select"
              value={choice3}
              onChange={e => setChoice3(Number(e.target.value))}
            >
              {availablePerks.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.tier})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results & Recommendation Cards */}
        <div>
          <h3 style={{ fontSize: '1rem', color: '#fff', marginBottom: '0.75rem' }}>
            Marginal Utility & Recommendation Ranking:
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {evaluatedChoices.map((choice, rank) => {
              const isBest = rank === 0;
              return (
                <div
                  key={choice.perk.id}
                  className={`card ${isBest ? 'top-pick' : ''}`}
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    border: isBest ? '1px solid var(--accent-green)' : '1px solid var(--border-color)',
                    padding: '1.25rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.15rem', fontWeight: 700, color: isBest ? 'var(--accent-green)' : 'var(--accent-blue)' }}>
                        #{rank + 1}
                      </span>
                      <strong style={{ fontSize: '1.05rem', color: '#fff' }}>{choice.perk.name}</strong>
                      <span className={`badge ${choice.perk.tier === 'expert' ? 'badge-community' : 'badge-official'}`}>
                        {choice.perk.tier}
                      </span>
                    </div>

                    {isBest && (
                      <span className="badge badge-official" style={{ fontSize: '0.8rem', padding: '0.25rem 0.6rem' }}>
                        ⭐ Best Pick
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '0.85rem', color: isBest ? 'var(--accent-green)' : 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.75rem' }}>
                    {choice.recommendationReason}
                  </div>

                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                    {choice.perk.description}
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.65rem' }}>
                    {choice.deltas.map((delta, dIdx) => (
                      <div
                        key={dIdx}
                        style={{
                          backgroundColor: '#161922',
                          border: delta.hasBreakpointGain ? '1px solid var(--accent-green)' : '1px solid var(--border-color)',
                          padding: '0.6rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem'
                        }}
                      >
                        <div style={{ fontWeight: 600, color: '#fff', marginBottom: '0.2rem' }}>
                          vs. {delta.enemyName}
                        </div>
                        <div style={{ color: delta.hasBreakpointGain ? 'var(--accent-green)' : 'var(--text-secondary)' }}>
                          {delta.summary}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
