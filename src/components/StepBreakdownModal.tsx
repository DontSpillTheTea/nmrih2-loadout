import React from 'react';
import type { CombatRecipe } from '../types';

interface StepBreakdownModalProps {
  recipe: CombatRecipe | null;
  onClose: () => void;
  onReport?: () => void;
}

export const StepBreakdownModal: React.FC<StepBreakdownModalProps> = ({ recipe, onClose, onReport }) => {
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

              <div className="step-stats">
                <span>Dmg: <strong>{log.finalDamage.toFixed(1)}</strong></span>
                <span>Target HP: <strong>{log.hpAfter.toFixed(1)}</strong></span>
                <span>Stability Dmg: <strong>{log.stabilityDamageDealt.toFixed(0)}</strong></span>
                <span>Stam Cost: <strong>{log.staminaCost.toFixed(2)}</strong></span>
                {log.armorDamage > 0 && (
                  <span style={{ color: '#f87171' }}>Armor Dmg: <strong>{log.armorDamage.toFixed(1)}</strong> (Rem: {log.armorHpAfter.toFixed(1)})</span>
                )}
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

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {onReport ? (
            <button
              className="btn btn-sm"
              onClick={onReport}
              style={{ borderColor: 'rgba(234, 179, 8, 0.4)', color: '#fde047' }}
            >
              📝 Report This Result
            </button>
          ) : <div />}
          <button className="btn btn-primary btn-sm" onClick={onClose}>Close Breakdown</button>
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
