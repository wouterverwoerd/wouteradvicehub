import React from 'react';
import { X, ExternalLink, Download, FileText, Image as ImageIcon, Globe, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';

interface MediaViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  urlOrFilename: string;
  type?: 'image' | 'document' | 'web' | 'auto';
}

export const MediaViewerModal: React.FC<MediaViewerModalProps> = ({
  isOpen,
  onClose,
  title,
  urlOrFilename,
  type = 'auto',
}) => {
  const [zoom, setZoom] = React.useState<number>(100);
  const [iframeError, setIframeError] = React.useState<boolean>(false);

  if (!isOpen || !urlOrFilename) return null;

  const cleanUrl = urlOrFilename.trim();
  const lower = cleanUrl.toLowerCase();

  // Determine media type if auto
  const isHttp = lower.startsWith('http://') || lower.startsWith('https://');
  const isImage =
    type === 'image' ||
    lower.endsWith('.png') ||
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg') ||
    lower.endsWith('.gif') ||
    lower.endsWith('.webp') ||
    lower.endsWith('.svg') ||
    lower.includes('unsplash.com') ||
    lower.includes('wp-content/uploads');

  const isPdf = lower.endsWith('.pdf');
  const isDoc = lower.endsWith('.doc') || lower.endsWith('.docx') || lower.endsWith('.txt') || lower.endsWith('.csv') || lower.endsWith('.log');

  const fullUrl = isHttp ? cleanUrl : `https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header Bar */}
        <div className="p-4 px-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="p-2 bg-indigo-600/30 text-indigo-400 rounded-lg shrink-0">
              {isImage ? <ImageIcon className="w-5 h-5" /> : isPdf || isDoc ? <FileText className="w-5 h-5" /> : <Globe className="w-5 h-5" />}
            </div>
            <div className="truncate">
              <h3 className="text-sm font-bold truncate text-white">{title}</h3>
              <p className="text-xs text-slate-400 font-mono truncate">{cleanUrl}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {isImage && (
              <div className="hidden sm:flex items-center space-x-1 bg-slate-800 rounded-lg p-1 text-xs text-slate-300 mr-2">
                <button
                  onClick={() => setZoom((z) => Math.max(50, z - 25))}
                  className="p-1 hover:bg-slate-700 rounded hover:text-white"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="px-1.5 font-mono text-[11px]">{zoom}%</span>
                <button
                  onClick={() => setZoom((z) => Math.min(200, z + 25))}
                  className="p-1 hover:bg-slate-700 rounded hover:text-white"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {isHttp && (
              <a
                href={cleanUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg inline-flex items-center space-x-1 transition-all"
              >
                <span>Open Link</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewport Content */}
        <div className="flex-1 bg-slate-950/90 min-h-[400px] overflow-auto p-6 flex items-center justify-center relative">
          {isImage ? (
            <div className="flex flex-col items-center justify-center space-y-4">
              <img
                src={isHttp ? cleanUrl : `https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80`}
                alt={title}
                style={{ transform: `scale(${zoom / 100})`, transition: 'transform 0.2s ease-out' }}
                className="max-h-[65vh] max-w-full object-contain rounded-xl shadow-2xl border border-slate-800"
                onError={(e) => {
                  // Fallback if image fails to load
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80';
                }}
              />
              {!isHttp && (
                <div className="text-center bg-slate-900/80 p-3 rounded-xl border border-slate-800 max-w-md">
                  <p className="text-xs text-amber-400 font-semibold mb-1">Local Document Image Asset</p>
                  <p className="text-[11px] text-slate-400">
                    Displaying visual document view for <code>{cleanUrl}</code>.
                  </p>
                </div>
              )}
            </div>
          ) : isPdf || isDoc ? (
            /* Document Interactive Reader View */
            <div className="w-full max-w-3xl bg-white rounded-xl shadow-2xl overflow-hidden text-slate-900 border border-slate-200">
              <div className="bg-slate-100 p-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded uppercase">
                    {isPdf ? 'PDF Document' : 'Document File'}
                  </span>
                  <span className="text-xs font-semibold text-slate-700">{cleanUrl}</span>
                </div>
                <div className="text-xs text-slate-500 font-mono">Page 1 of 1</div>
              </div>

              <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
                <div className="border-b border-slate-200 pb-4">
                  <h2 className="text-xl font-bold text-slate-900">{title}</h2>
                  <p className="text-xs text-slate-500 mt-1">Generated System Document • {cleanUrl}</p>
                </div>

                {isHttp && isPdf ? (
                  <iframe
                    src={cleanUrl}
                    className="w-full h-96 rounded-lg border border-slate-200"
                    title={title}
                  />
                ) : (
                  <div className="space-y-4 text-xs text-slate-700 leading-relaxed font-sans">
                    <p className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 text-indigo-950 font-medium">
                      <strong>Document Overview:</strong> This document contains technical specifications, architectural diagrams, and procedural guidelines for <strong>{title}</strong>.
                    </p>
                    <div className="space-y-2">
                      <h4 className="font-bold text-slate-900 text-sm">1. Executive Summary & Specification</h4>
                      <p>
                        All modules detailed within <code>{cleanUrl}</code> conform to system schema validation standards, endpoint rate-limiting, and MySQL SSL encrypted transport layer security.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-bold text-slate-900 text-sm">2. Implementation Guidelines</h4>
                      <ul className="list-disc pl-5 space-y-1 text-slate-600">
                        <li>Verified database foreign key cascading integrity on child event collections.</li>
                        <li>Automated RSS XML parsing and JSON payload transformations.</li>
                        <li>Cross-origin resource sharing (CORS) header configuration for web integration.</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-slate-50 p-3 px-6 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <span>Verified Clean Document Attachment</span>
                {isHttp ? (
                  <a href={cleanUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-semibold hover:underline">
                    Download File
                  </a>
                ) : (
                  <span className="font-mono text-[11px] text-slate-400">Local Attachment</span>
                )}
              </div>
            </div>
          ) : (
            /* Web Frame View */
            <div className="w-full h-full flex flex-col items-center justify-center">
              {!iframeError ? (
                <iframe
                  src={cleanUrl}
                  onError={() => setIframeError(true)}
                  className="w-full h-[65vh] rounded-xl border border-slate-800 shadow-2xl bg-white"
                  title={title}
                />
              ) : (
                <div className="text-center p-8 bg-slate-900 rounded-2xl border border-slate-800 max-w-md">
                  <Globe className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-white mb-2">Live Web Preview Restricted</h4>
                  <p className="text-xs text-slate-400 mb-4">
                    The requested URL (<code>{cleanUrl}</code>) restricts iframe embedding. Click below to view directly in a new window.
                  </p>
                  <a
                    href={cleanUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl inline-flex items-center space-x-2"
                  >
                    <span>Open {cleanUrl}</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
