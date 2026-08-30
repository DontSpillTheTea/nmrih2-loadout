import React, { useState } from 'react';
import { encodeFullBackup, decodeCode } from '../serialization/codec';
import { resetAppState } from '../storage';
import type { AppState } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  appState: AppState;
  onStateUpdate: (newState: AppState) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  appState,
  onStateUpdate
}) => {
  const [backupCode, setBackupCode] = useState('');
  const [importBackupCode, setImportBackupCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerateBackup = () => {
    const code = encodeFullBackup(appState);
    setBackupCode(code);
    navigator.clipboard.writeText(code);
    setMessage('Full application backup code (N2A1) copied to clipboard!');
  };

  const handleRestoreBackup = () => {
    setError(null);
    try {
      const decoded = decodeCode(importBackupCode);
      if (decoded.type !== 'A') {
        throw new Error('Provided code is not a full application backup (N2A1).');
      }
      onStateUpdate(decoded.data as AppState);
      setMessage('Application state restored successfully!');
      setTimeout(() => onClose(), 1500);
    } catch (e: any) {
      setError(e.message || 'Failed to restore backup code.');
    }
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all local responder profiles and saved loadouts? This cannot be undone.')) {
      const initial = resetAppState();
      onStateUpdate(initial);
      setMessage('Local data reset to initial factory settings.');
      setTimeout(() => onClose(), 1500);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ fontSize: '1.15rem', color: '#fff' }}>Settings & Full App Backup</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="form-group">
          <label className="form-label">Full Application Backup (N2A1)</label>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
            Export all saved responders, builds, and settings in one compressed code:
          </p>
          <button className="btn btn-primary btn-sm" onClick={handleGenerateBackup}>
            📦 Generate & Copy Full Backup Code
          </button>
          {backupCode && (
            <textarea
              className="form-input"
              rows={3}
              readOnly
              value={backupCode}
              style={{ marginTop: '0.5rem', fontFamily: 'monospace', fontSize: '0.75rem' }}
            />
          )}
        </div>

        <div className="form-group" style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <label className="form-label">Restore Full Backup</label>
          <textarea
            className="form-input"
            rows={3}
            placeholder="Paste N2A1-... backup code here"
            value={importBackupCode}
            onChange={e => setImportBackupCode(e.target.value)}
            style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
          />
          <div style={{ marginTop: '0.5rem' }}>
            <button className="btn btn-sm" onClick={handleRestoreBackup}>
              🔄 Restore Application State
            </button>
          </div>
        </div>

        <div className="form-group" style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <label className="form-label">Privacy & Telemetry</label>
          <div className="toggle-item">
            <div>
              <div className="toggle-label">Anonymous Zero-Cost Telemetry</div>
              <div className="toggle-desc">No personal data or builds transmitted. Core app always runs offline.</div>
            </div>
            <input
              type="checkbox"
              checked={appState.settings.enableAnalytics}
              onChange={e => {
                const updated = {
                  ...appState,
                  settings: { ...appState.settings, enableAnalytics: e.target.checked }
                };
                onStateUpdate(updated);
              }}
            />
          </div>
        </div>

        <div className="form-group" style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <label className="form-label">Reset Local Data</label>
          <button className="btn btn-danger btn-sm" onClick={handleReset}>
            🗑️ Factory Reset All Data
          </button>
        </div>

        {message && (
          <div style={{ color: 'var(--accent-green)', marginTop: '0.5rem', fontSize: '0.85rem' }}>
            ✅ {message}
          </div>
        )}

        {error && (
          <div style={{ color: 'var(--accent-red)', marginTop: '0.5rem', fontSize: '0.85rem' }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ marginTop: '1.25rem', textAlign: 'right' }}>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};
