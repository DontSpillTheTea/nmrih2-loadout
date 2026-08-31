import React, { useState } from 'react';
import { encodeFullBackup, decodeCode } from '../serialization/codec';
import { resetAppState } from '../storage';
import { CURRENT_GAME_VERSION, APP_VERSION, APP_BUILD_NAME } from '../data/loader';
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
          <h3 style={{ fontSize: '1.15rem', color: '#fff' }}>Settings & Information</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        {/* Application & Environment Info */}
        <div className="form-group">
          <label className="form-label">Version & Environment Information</label>
          <div
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              padding: '0.75rem 1rem',
              fontSize: '0.82rem',
              lineHeight: '1.5'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>App Version:</span>
              <strong style={{ color: '#93c5fd' }}>{APP_VERSION} ({APP_BUILD_NAME})</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Game Patch:</span>
              <strong style={{ color: '#fff' }}>{CURRENT_GAME_VERSION}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Steam Build ID:</span>
              <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>24830003 (App 292000)</span>
            </div>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.76rem', marginTop: '0.5rem', lineHeight: '1.4' }}>
            NMRiH2 Loadouts is an early public alpha. Combat values are being cross-checked against NMRiH2 1.0.4.0 game files and official data. Exact attack timing and some armored-enemy interactions remain under active investigation.
          </p>
        </div>

        {/* Full Application Backup */}
        <div className="form-group" style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
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

        {/* Restore Full Backup */}
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

        {/* Factory Reset */}
        <div className="form-group" style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <label className="form-label" style={{ color: '#f87171' }}>Reset Application Data</label>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
            Wipe all local builds and responder profiles to reset back to factory defaults.
          </p>
          <button className="btn btn-sm" onClick={handleReset} style={{ color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.4)' }}>
            ⚠️ Reset All Data
          </button>
        </div>

        {message && (
          <div className="status-badge" style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', marginTop: '1rem', textAlign: 'center' }}>
            {message}
          </div>
        )}

        {error && (
          <div className="status-badge" style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#f87171', marginTop: '1rem', textAlign: 'center' }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
};
