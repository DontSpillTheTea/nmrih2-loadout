import React, { useState, useRef } from 'react';
import { decodeCode, encodeBuild, encodeScenario, createShareUrl, extractShareCode } from '../serialization/codec';
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
  const [clipboardBlocked, setClipboardBlocked] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  let exportCode = '';
  if ((mode === 'export_build' || mode === 'export_responder') && (activeResponder || activeLoadout)) {
    exportCode = encodeBuild({
      name: activeResponder?.name ?? activeLoadout?.name ?? 'Lead Responder',
      level: activeResponder?.level ?? 1,
      perkIds: activeResponder?.perkIds ?? activeLoadout?.perkIds ?? [],
      loadoutItemIds: activeResponder?.loadoutItemIds ?? activeLoadout?.loadoutItemIds ?? [null, null, null],
      weaponId: activeLoadout?.weaponId ?? 11,
      secondaryWeaponId: activeLoadout?.secondaryWeaponId,
      constraints: activeLoadout?.constraints,
      objective: activeLoadout?.objective
    });
  } else if (mode === 'export_scenario' && activeScenario) {
    exportCode = encodeScenario(activeScenario);
  }

  const exportUrl = exportCode ? createShareUrl(exportCode) : '';

  const handleCopyLink = async () => {
    setClipboardBlocked(false);
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(exportUrl);
        setCopiedType('link');
        setTimeout(() => setCopiedType(null), 2500);
      } else {
        throw new Error('Clipboard API unavailable');
      }
    } catch {
      setClipboardBlocked(true);
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }
  };

  const handleCopyCode = async () => {
    setClipboardBlocked(false);
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(exportCode);
        setCopiedType('code');
        setTimeout(() => setCopiedType(null), 2500);
      } else {
        throw new Error('Clipboard API unavailable');
      }
    } catch {
      setClipboardBlocked(true);
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }
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
            {mode === 'import' ? 'Import Build / Scenario' : 'Share Build Configuration'}
          </h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        {mode !== 'import' ? (
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
              Share this direct link. Anyone opening it will instantly load your exact build (responder, perks, and 3 loadout items):
            </p>
            <input
              ref={inputRef}
              className="form-input"
              readOnly
              value={exportUrl}
              style={{ fontFamily: 'monospace', fontSize: '0.8rem', marginBottom: '0.75rem' }}
              onClick={e => (e.target as HTMLInputElement).select()}
            />
            {clipboardBlocked && (
              <div style={{ color: 'var(--accent-amber)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                ⚠️ Clipboard blocked by browser/extension — press Ctrl+C to copy link.
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={handleCopyLink}>
                {copiedType === 'link' ? '✅ Link Copied!' : '🔗 Copy Share Link'}
              </button>
              <a
                className="btn"
                href={exportUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Open share link directly"
              >
                ↗️ Open Link
              </a>
              <button className="btn" onClick={handleCopyCode} title="Copy raw compressed code">
                {copiedType === 'code' ? '✅ Code Copied!' : '📋 Copy Raw Code'}
              </button>
              <button className="btn" onClick={onClose}>Close</button>
            </div>
          </div>
        ) : (
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
              Paste a share link (e.g. <code>https://nmrih2-loadouts.site/build/...</code>) or code (<code>N2B2-...</code>, <code>N2B1-...</code>, <code>N2C1-...</code>, <code>N2S1-...</code>, <code>N2A1-...</code>):
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

