import React, { useState } from 'react';
import { decodeCode, encodeBuild, encodeResponder } from '../serialization/codec';
import type { Loadout, Responder, AppState } from '../types';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'import' | 'export_build' | 'export_responder';
  activeLoadout?: Loadout;
  activeResponder?: Responder;
  appState?: AppState;
  onImportSuccess: (result: any) => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  mode,
  activeLoadout,
  activeResponder,
  onImportSuccess
}) => {
  const [importCode, setImportCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  let exportCode = '';
  if (mode === 'export_build' && activeLoadout) {
    exportCode = encodeBuild(activeLoadout);
  } else if (mode === 'export_responder' && activeResponder) {
    exportCode = encodeResponder(activeResponder);
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(exportCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImport = () => {
    setError(null);
    setWarning(null);
    try {
      const decoded = decodeCode(importCode);
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
            {mode === 'import' ? 'Import Build / Responder' : 'Share & Export Code'}
          </h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        {mode !== 'import' ? (
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
              Copy this compact, compressed code to share your configuration. It contains no query strings, personal data, or bloated URLs:
            </p>
            <textarea
              className="form-input"
              rows={4}
              readOnly
              value={exportCode}
              style={{ fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-all' }}
            />
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button className="btn btn-primary" onClick={handleCopy}>
                {copied ? '✅ Copied to Clipboard!' : '📋 Copy Code'}
              </button>
              <button className="btn" onClick={onClose}>Close</button>
            </div>
          </div>
        ) : (
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
              Paste any valid NMRiH2 code (e.g. <code>N2B1-...</code> for Build, <code>N2C1-...</code> for Character, or <code>N2A1-...</code> for Backup):
            </p>
            <textarea
              className="form-input"
              rows={4}
              placeholder="Paste code starting with N2B1-, N2C1-, or N2A1-..."
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
