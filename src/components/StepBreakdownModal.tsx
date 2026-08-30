import React from 'react';
import type { CombatRecipe } from '../types';

interface StepBreakdownModalProps {
  recipe: CombatRecipe | null;
  onClose: () => void;
}

export const StepBreakdownModal: React.FC<StepBreakdownModalProps> = ({ recipe, onClose }) => {
  if (!recipe) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '750px' }}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '1.15rem', color: '#fff' }}>Combat Recipe & Formula Breakdown</h3>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {recipe.weapon.name} • {recipe.totalActions} Actions • Lethal Impact: ~{(recipe.lethalImpactTimeMs / 1000).toFixed(2)}s • Ready: ~{(recipe.readyAfterKillMs / 1000).toFixed(2)}s • {recipe.weapon.category === 'firearm' ? `${recipe.totalAmmoSpent} rounds` : `${recipe.totalStaminaSpent} stamina`}
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            STEP-BY-STEP DAMAGE & POSTURE PIPELINE:
          </div>

          {recipe.logs.map((log, idx) => (
            <div key={idx} className="step-item">
              <div className="step-header">
                <div>
                  <span style={{ color: 'var(--accent-blue)', marginRight: '0.4rem', fontWeight: 700 }}>#{log.stepIndex}</span>
                  <span style={{ color: '#fff', fontWeight: 600 }}>{log.inputDescription}</span>
                  <span style={{ color: 'var(--accent-cyan)', marginLeft: '0.4rem' }}>→ {log.resolvedActionName}</span>
                  <span style={{ color: 'var(--text-muted)', marginLeft: '0.4rem' }}>({log.hitZone})</span>
                </div>
                <div>
                  <span style={{ color: varColor(log.postureAfter), fontWeight: 700 }}>
                    {log.postureAfter.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="step-details">
                <div>Base Damage: <strong>{log.baseDamage}</strong></div>
                <div>Flat Additive Perks: <strong>+{log.additiveFlat}</strong></div>
                <div>Multiplicative Perks: <strong>+{Math.round(log.multiplicativeBonus * 100)}%</strong></div>
                <div>Downed Multiplier: <strong>{log.downedMultiplier}x</strong> {log.isDownedHit && '🔥'}</div>
                {log.armorDamage > 0 && (
                  <div>Armor Durability: <strong>-{log.armorDamage} ({log.armorHpAfter} HP left)</strong> {log.armorBrokenNow && '💥 BROKEN'}</div>
                )}
                <div>Final Damage Dealt: <strong style={{ color: 'var(--accent-green)' }}>{log.finalDamage}</strong></div>
                <div>Stability Damage: <strong>{log.stabilityDamageDealt}</strong></div>
                <div>Enemy HP: <strong>{log.hpBefore} → {log.hpAfter}</strong></div>
                <div>Player Stamina: <strong>{log.staminaBefore} → {log.staminaAfter}</strong></div>
                <div>Impact Timing: <strong>~{(log.impactElapsedMs / 1000).toFixed(2)}s</strong></div>
                <div>Next Action Ready: <strong>~{(log.readyElapsedMs / 1000).toFixed(2)}s</strong></div>
              </div>

              {log.notes.length > 0 && (
                <div className="step-notes">
                  {log.notes.map((n, nIdx) => (
                    <div key={nIdx}>• {n}</div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'right' }}>
          <button className="btn btn-primary" onClick={onClose}>Close Breakdown</button>
        </div>
      </div>
    </div>
  );
};

function varColor(posture: string): string {
  switch (posture) {
    case 'downed': return 'var(--accent-red)';
    case 'staggered': return 'var(--accent-amber)';
    case 'interrupted': return 'var(--accent-purple)';
    case 'flinched': return 'var(--accent-cyan)';
    default: return 'var(--text-secondary)';
  }
}
