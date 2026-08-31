import React, { useState } from 'react';
import { decodeCode, encodeBuild, encodeResponder, encodeScenario, createShareUrl, extractShareCode } from '../serialization/codec';
import type { Loadout, Responder, CombatScenario, AppState } from '../types';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'import' | 'export_build' | 'export_responder' | 'export_scenario';
  activeLoadout?: Loadout;
  activeResponder?: Responder;
  activeScenario?: CombatScenario;
  appState?: AppState;
  onImportSuccess: (result: any) => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  mode,
  activeLoadout,
  activeResponder,
  activeScenario,
  onImportSuccess
}) => {
  const [importCode, setImportCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [copiedType, setCopiedType] = useState<'link' | 'code' | null>(null);

  if (!isOpen) return null;

  let exportCode = '';
  if (mode === 'export_build' && activeLoadout) {
    exportCode = encodeBuild(activeLoadout);
  } else if (mode === 'export_responder' && activeResponder) {
    exportCode = encodeResponder(activeResponder);
  } else if (mode === 'export_scenario' && activeScenario) {
    exportCode = encodeScenario(activeScenario);
  }

  const exportUrl = exportCode ? createShareUrl(exportCode) : '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(exportUrl);
    setCopiedType('link');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(exportCode);
    setCopiedType('code');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleImport = () => {
    setError(null);
    setWarning(null);
    try {
      const codeToDecode = extractShareCode(importCode);
      const decoded = decodeCode(codeToDecode);
      if (decoded.warning) {
        setWarning(decoded.warning);
      }
      onImportSuccess(decoded);
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to decode import code.');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ fontSize: '1.15rem', color: '#fff' }}>
            {mode === 'import' ? 'Import Build / Responder / Scenario' : 'Share Configuration'}
          </h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        {mode !== 'import' ? (
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
              Share this direct link. Anyone opening it will instantly load your exact configuration:
            </p>
            <input
              className="form-input"
              readOnly
              value={exportUrl}
              style={{ fontFamily: 'monospace', fontSize: '0.8rem', marginBottom: '0.75rem' }}
              onClick={e => (e.target as HTMLInputElement).select()}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button className="btn btn-primary" onClick={handleCopyLink}>
                {copiedType === 'link' ? '✅ Link Copied!' : '🔗 Copy Share Link'}
              </button>
              <button className="btn" onClick={handleCopyCode} title="Copy raw compressed code">
                {copiedType === 'code' ? '✅ Code Copied!' : '📋 Copy Raw Code'}
              </button>
              <button className="btn" onClick={onClose}>Close</button>
            </div>
          </div>
        ) : (
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
              Paste a share link (e.g. <code>https://nmrih2-loadouts.site/build/...</code>) or raw code (<code>N2B1-...</code>, <code>N2C1-...</code>, <code>N2S1-...</code>, <code>N2A1-...</code>):
            </p>
            <textarea
              className="form-input"
              rows={4}
              placeholder="Paste share link or code here..."
              value={importCode}
              onChange={e => setImportCode(e.target.value)}
              style={{ fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-all' }}
            />

            {error && (
              <div style={{ color: 'var(--accent-red)', marginTop: '0.75rem', fontSize: '0.85rem' }}>
                ⚠️ {error}
              </div>
            )}

            {warning && (
              <div style={{ color: 'var(--accent-amber)', marginTop: '0.75rem', fontSize: '0.85rem' }}>
                ⚠️ {warning}
              </div>
            )}

            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button className="btn btn-primary" onClick={handleImport}>
                📥 Import Configuration
              </button>
              <button className="btn" onClick={onClose}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

