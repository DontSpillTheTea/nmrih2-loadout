import React, { useState, useMemo } from 'react';
import type { Weapon, Enemy, Perk, OptimizerObjective, OptimizerConstraints, CombatRecipe } from '../types';
import { CURRENT_GAME_VERSION, APP_VERSION } from '../data/loader';
import { formatActionSequence } from '../utils/format';
import { encodeScenario } from '../serialization/codec';

interface ReportResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  weapon: Weapon;
  enemy: Enemy;
  perks: Perk[];
  objective: OptimizerObjective;
  constraints: OptimizerConstraints;
  recipe?: CombatRecipe;
}

export const ReportResultModal: React.FC<ReportResultModalProps> = ({
  isOpen,
  onClose,
  weapon,
  enemy,
  perks,
  objective,
  constraints,
  recipe
}) => {
  const [category, setCategory] = useState('Wrong damage / hits');
  const [userObservation, setUserObservation] = useState('');
  const [copied, setCopied] = useState(false);

  const scenarioCode = useMemo(() => {
    try {
      return encodeScenario({
        id: 'report-scenario',
        name: `${weapon.name} vs ${enemy.name}`,
        weaponId: weapon.id,
        enemyId: enemy.id,
        difficulty: constraints.difficulty,
        perkIds: perks.map(p => p.id),
        constraints,
        objective,
        gameVersion: CURRENT_GAME_VERSION
      });
    } catch {
      return 'N/A';
    }
  }, [weapon, enemy, perks, constraints, objective]);

  const isArmored = (enemy.armor && enemy.armor.length > 0) || false;

  const generatedReport = useMemo(() => {
    const sequenceStr = recipe ? formatActionSequence(recipe) : 'N/A';
    const actionsCount = recipe ? recipe.totalActions : 'N/A';
    const costStr = recipe
      ? (weapon.category === 'firearm' ? `${recipe.totalAmmoSpent} rds` : `${recipe.totalStaminaSpent} stamina`)
      : 'N/A';

    return `### NMRiH2 Loadouts Alpha Feedback Report
- **App Version**: ${APP_VERSION}
- **Game Patch**: ${CURRENT_GAME_VERSION} (Steam Build: 24830003)
- **Category**: ${category}

#### 1. Scenario
- **Enemy**: ${enemy.name} (${constraints.difficulty})
- **Weapon**: ${weapon.name} (${weapon.category})
- **Perks**: ${perks.map(p => p.name).join(', ') || 'None'}
- **Goal**: ${objective}
- **Constraints**: Safe Opener: ${constraints.safeOpener ? 'Yes' : 'No'}, Pre-Charge: ${constraints.preChargedOpener ? 'Yes' : 'No'}

#### 2. Calculated Result
- **Sequence**: ${sequenceStr}
- **Actions**: ${actionsCount}
- **Resource Cost**: ${costStr}
- **Downed Bonus Used**: ${recipe?.downedMultiplierUsed ? 'Yes' : 'No'}
- **Armor Broken**: ${recipe?.armorBroken ? 'Yes' : 'No'}

#### 3. Model Confidence Dimensions
- **Damage**: Supported (1.0.4.0 snapshot)
- **Stamina / Ammo**: Supported
- **Timing**: ~PlayRate Estimate (Exact frame notifies unverified)
- **Armor**: ${isArmored ? 'Experimental Model (Unresolved overflow/penetration)' : 'N/A (Unarmored Target)'}

#### 4. Scenario Code (N2S1)
\`${scenarioCode}\`

#### 5. What Happened In-Game
${userObservation.trim() || '[No observation entered]'}`;
  }, [category, userObservation, weapon, enemy, perks, objective, constraints, recipe, scenarioCode, isArmored]);

  if (!isOpen) return null;

  const handleCopyReport = () => {
    navigator.clipboard.writeText(generatedReport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenGitHubIssue = () => {
    const title = encodeURIComponent(`[Alpha Feedback] ${category}: ${weapon.name} vs ${enemy.name}`);
    const body = encodeURIComponent(generatedReport);
    const url = `https://github.com/DontSpillTheTea/nmrih2-loadout/issues/new?title=${title}&body=${body}`;
    window.open(url, '_blank');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        <div className="modal-header">
          <h3 style={{ fontSize: '1.15rem', color: '#fff' }}>📝 Report a Bad Result</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '0.85rem' }}>
          Help improve NMRiH2 Loadouts during public alpha. Describe what happened in actual gameplay below.
        </p>

        <div className="form-group">
          <label className="form-label">Issue Category</label>
          <select
            className="form-select"
            value={category}
            onChange={e => setCategory(e.target.value)}
          >
            <option value="Wrong damage / hits">Wrong damage / hits to kill</option>
            <option value="Wrong stamina / ammo">Wrong stamina consumption or rounds used</option>
            <option value="Wrong control / stun">Wrong stability, interrupt, or knockdown behavior</option>
            <option value="Wrong armor behavior">Wrong helmet or armor interaction</option>
            <option value="Wrong attack sequence">Illegal or impossible melee combo sequence</option>
            <option value="UI or data display problem">UI or data display issue</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">What happened in-game?</label>
          <textarea
            className="form-input"
            rows={3}
            placeholder="e.g. Cleaver Charged Head followed by Quick Head took 3 hits instead of 2 on Nightmare..."
            value={userObservation}
            onChange={e => setUserObservation(e.target.value)}
            style={{ fontSize: '0.82rem' }}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Generated Diagnostic Bundle</label>
          <textarea
            className="form-input"
            rows={6}
            readOnly
            value={generatedReport}
            style={{ fontFamily: 'monospace', fontSize: '0.72rem', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button className="btn btn-sm" onClick={handleOpenGitHubIssue}>
            🔗 Open GitHub Issue
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleCopyReport}>
            {copied ? '✓ Report Copied!' : '📋 Copy Report'}
          </button>
        </div>
      </div>
    </div>
  );
};
