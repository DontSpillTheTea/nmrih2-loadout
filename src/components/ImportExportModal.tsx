import React, { useState, useEffect, useRef } from 'react';
import {
  decodeCode,
  encodeBuild,
  encodeScenario,
  createShareUrl,
  createShortBuildUrl,
  extractShareCode,
  parseShareUrlOrPath
} from '../serialization/codec';
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
  const [copiedType, setCopiedType] = useState<'link' | 'portable' | 'code' | null>(null);
  const [clipboardBlocked, setClipboardBlocked] = useState(false);
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [isShortening, setIsShortening] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const portableUrl = exportCode ? createShareUrl(exportCode) : '';

  // Request short D1-backed URL when opening build export
  useEffect(() => {
    if (!isOpen) {
      setShortUrl(null);
      setIsShortening(false);
      setCopiedType(null);
      setClipboardBlocked(false);
      return;
    }

    if (mode === 'export_build' && exportCode) {
      let mounted = true;
      setIsShortening(true);

      fetch('/api/builds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: exportCode })
      })
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then(data => {
          if (mounted && data?.url) {
            setShortUrl(data.url);
          }
        })
        .catch(err => {
          console.warn('Could not generate short link, using portable link fallback:', err);
        })
        .finally(() => {
          if (mounted) setIsShortening(false);
        });

      return () => {
        mounted = false;
      };
    }
  }, [isOpen, mode, exportCode]);

  if (!isOpen) return null;

  const displayUrl = shortUrl || portableUrl;

  const copyToClipboard = async (text: string, type: 'link' | 'portable' | 'code') => {
    setClipboardBlocked(false);
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setCopiedType(type);
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

  const handleImport = async () => {
    setError(null);
    setWarning(null);
    setIsImporting(true);

    try {
      const trimmed = importCode.trim();
      const parsedPath = parseShareUrlOrPath(trimmed);

      let codeToDecode = trimmed;

      // Handle short link import: /b/<id> or https://nmrih2-loadouts.site/b/<id>
      if (parsedPath.type === 'short_build' && parsedPath.shortId) {
        const res = await fetch(`/api/builds/${parsedPath.shortId}`);
        if (!res.ok) {
          throw new Error(res.status === 404 ? 'Short build link not found or expired.' : `Failed to lookup build: HTTP ${res.status}`);
        }
        const data = await res.json();
        if (!data?.code) {
          throw new Error('Invalid response from build lookup API.');
        }
        codeToDecode = data.code;
      } else {
        codeToDecode = extractShareCode(trimmed);
      }

      const decoded = decodeCode(codeToDecode);
      if (decoded.warning) {
        setWarning(decoded.warning);
      }
      onImportSuccess(decoded);
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to decode import code.');
    } finally {
      setIsImporting(false);
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                {shortUrl
                  ? 'Short durable link (D1-backed):'
                  : isShortening
                  ? 'Generating short share link...'
                  : 'Self-contained portable link:'}
              </p>
              {shortUrl && (
                <span className="badge badge-official" style={{ fontSize: '0.7rem' }}>
                  Short URL
                </span>
              )}
            </div>

            <input
              ref={inputRef}
              className="form-input"
              readOnly
              value={displayUrl}
              style={{ fontFamily: 'monospace', fontSize: '0.8rem', marginBottom: '0.75rem' }}
              onClick={e => (e.target as HTMLInputElement).select()}
            />

            {clipboardBlocked && (
              <div style={{ color: 'var(--accent-amber)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                ⚠️ Clipboard blocked by browser/extension — press Ctrl+C to copy link.
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary"
                onClick={() => copyToClipboard(displayUrl, 'link')}
              >
                {copiedType === 'link' ? '✅ Link Copied!' : '🔗 Copy Share Link'}
              </button>

              <a
                className="btn"
                href={displayUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Open share link directly"
              >
                ↗️ Open Link
              </a>

              {shortUrl && (
                <button
                  className="btn"
                  onClick={() => copyToClipboard(portableUrl, 'portable')}
                  title="Copy full self-contained URL without D1 dependency"
                >
                  {copiedType === 'portable' ? '✅ Portable Link Copied!' : '📦 Copy Portable Link'}
                </button>
              )}

              <button
                className="btn"
                onClick={() => copyToClipboard(exportCode, 'code')}
                title="Copy raw compressed code"
              >
                {copiedType === 'code' ? '✅ Code Copied!' : '📋 Copy Raw Code'}
              </button>

              <button className="btn" onClick={onClose}>Close</button>
            </div>
          </div>
        ) : (
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
              Paste a short link (<code>/b/...</code>), portable link (<code>/build/...</code>), or code (<code>N2B2-...</code>, <code>N2B1-...</code>, <code>N2C1-...</code>, <code>N2S1-...</code>, <code>N2A1-...</code>):
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
              <button className="btn btn-primary" onClick={handleImport} disabled={isImporting}>
                {isImporting ? '⏳ Resolving...' : '📥 Import Configuration'}
              </button>
              <button className="btn" onClick={onClose}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

