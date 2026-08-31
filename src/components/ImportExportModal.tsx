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
  const [shortLinkStatus, setShortLinkStatus] = useState<'idle' | 'loading' | 'success' | 'failed'>('idle');
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [shortError, setShortError] = useState<string | null>(null);
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
      setShortLinkStatus('idle');
      setShortError(null);
      setCopiedType(null);
      setClipboardBlocked(false);
      return;
    }

    if (mode === 'export_build' && exportCode) {
      let mounted = true;
      setShortLinkStatus('loading');
      setShortError(null);

      fetch('/api/builds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: exportCode })
      })
        .then(async res => {
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData?.error || `HTTP ${res.status}`);
          }
          return res.json();
        })
        .then(data => {
          if (mounted) {
            if (data?.url) {
              setShortUrl(data.url);
              setShortLinkStatus('success');
            } else {
              throw new Error('Invalid API response');
            }
          }
        })
        .catch(err => {
          if (mounted) {
            console.warn('Short link creation failed:', err);
            setShortError(err.message || 'Network/Server error');
            setShortLinkStatus('failed');
          }
        });

      return () => {
        mounted = false;
      };
    } else {
      setShortLinkStatus('idle');
    }
  }, [isOpen, mode, exportCode]);

  if (!isOpen) return null;

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
            {mode === 'export_build' ? (
              <div>
                {shortLinkStatus === 'loading' && (
                  <div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                      ⏳ Generating short share link...
                    </p>
                    <input
                      className="form-input"
                      readOnly
                      disabled
                      value="Generating short link..."
                      style={{ fontFamily: 'monospace', fontSize: '0.8rem', marginBottom: '0.75rem', opacity: 0.7 }}
                    />
                  </div>
                )}

                {shortLinkStatus === 'success' && shortUrl && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                        Short durable link (D1-backed):
                      </p>
                      <span className="badge badge-official" style={{ fontSize: '0.7rem' }}>
                        Short URL
                      </span>
                    </div>

                    <input
                      ref={inputRef}
                      className="form-input"
                      readOnly
                      value={shortUrl}
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
                        onClick={() => copyToClipboard(shortUrl, 'link')}
                      >
                        {copiedType === 'link' ? '✅ Link Copied!' : '🔗 Copy Share Link'}
                      </button>

                      <a
                        className="btn"
                        href={shortUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open share link directly"
                      >
                        ↗️ Open Link
                      </a>

                      <button
                        className="btn"
                        onClick={() => copyToClipboard(portableUrl, 'portable')}
                        title="Copy full self-contained URL without D1 dependency"
                      >
                        {copiedType === 'portable' ? '✅ Portable Link Copied!' : '📦 Copy Portable Link'}
                      </button>

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
                )}

                {shortLinkStatus === 'failed' && (
                  <div>
                    <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', padding: '0.75rem', marginBottom: '0.75rem' }}>
                      <div style={{ color: '#ef4444', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                        ⚠️ Short link unavailable ({shortError || 'backend unreachable'})
                      </div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                        Self-contained portable sharing is available below without server dependency:
                      </div>
                    </div>

                    <input
                      ref={inputRef}
                      className="form-input"
                      readOnly
                      value={portableUrl}
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
                        onClick={() => copyToClipboard(portableUrl, 'portable')}
                      >
                        {copiedType === 'portable' ? '✅ Portable Link Copied!' : '📦 Copy Portable Link'}
                      </button>

                      <a
                        className="btn"
                        href={portableUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open portable link directly"
                      >
                        ↗️ Open Portable Link
                      </a>

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
                )}
              </div>
            ) : (
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                  Self-contained portable link:
                </p>
                <input
                  ref={inputRef}
                  className="form-input"
                  readOnly
                  value={portableUrl}
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
                    onClick={() => copyToClipboard(portableUrl, 'portable')}
                  >
                    {copiedType === 'portable' ? '✅ Link Copied!' : '🔗 Copy Share Link'}
                  </button>
                  <a
                    className="btn"
                    href={portableUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open share link directly"
                  >
                    ↗️ Open Link
                  </a>
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
            )}
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

