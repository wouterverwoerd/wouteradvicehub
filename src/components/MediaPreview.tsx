import React, { useState } from 'react';
import { FileText, Image as ImageIcon, ExternalLink, Eye, Globe, Download, FileSpreadsheet, Code } from 'lucide-react';
import { MediaViewerModal } from './MediaViewerModal';

interface MediaPreviewProps {
  urlOrFilename: string;
  title: string;
  label?: string;
  compact?: boolean;
}

export const MediaPreview: React.FC<MediaPreviewProps> = ({
  urlOrFilename,
  title,
  label = 'Attachment / Link',
  compact = false,
}) => {
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  if (!urlOrFilename) return null;

  const clean = urlOrFilename.trim();
  const lower = clean.toLowerCase();
  const isHttp = lower.startsWith('http://') || lower.startsWith('https://');

  const isImage =
    lower.endsWith('.png') ||
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg') ||
    lower.endsWith('.gif') ||
    lower.endsWith('.webp') ||
    lower.endsWith('.svg') ||
    lower.includes('unsplash.com') ||
    lower.includes('wp-content/uploads') ||
    lower.includes('images');

  const isPdf = lower.endsWith('.pdf');
  const isSheet = lower.endsWith('.csv') || lower.endsWith('.xlsx');
  const isDoc = lower.endsWith('.doc') || lower.endsWith('.docx') || lower.endsWith('.txt') || lower.endsWith('.log');

  const displayImage = isImage
    ? isHttp
      ? clean
      : `https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80`
    : null;

  return (
    <>
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 hover:border-indigo-300 transition-all space-y-2">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
          <span className="flex items-center space-x-1">
            {isImage ? (
              <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
            ) : isPdf ? (
              <FileText className="w-3.5 h-3.5 text-rose-600" />
            ) : isSheet ? (
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            ) : isDoc ? (
              <FileText className="w-3.5 h-3.5 text-blue-600" />
            ) : (
              <Globe className="w-3.5 h-3.5 text-indigo-600" />
            )}
            <span className="capitalize">{label}</span>
          </span>

          <span className="font-mono text-[10px] text-slate-400 uppercase">
            {isImage ? 'IMAGE' : isPdf ? 'PDF' : isSheet ? 'SPREADSHEET' : isDoc ? 'DOC' : 'LINK'}
          </span>
        </div>

        {/* Thumbnail or File Header */}
        {displayImage && !compact ? (
          <div
            onClick={() => setIsViewerOpen(true)}
            className="relative h-28 w-full bg-slate-900 rounded-lg overflow-hidden cursor-pointer group shadow-inner border border-slate-200"
          >
            <img
              src={displayImage}
              alt={title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90 group-hover:opacity-100"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80';
              }}
            />
            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-1.5 text-white font-medium text-xs">
              <Eye className="w-4 h-4" />
              <span>Preview Image</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between bg-white p-2 px-2.5 rounded-lg border border-slate-200 text-xs">
            <span className="font-mono text-slate-700 truncate max-w-[200px]" title={clean}>
              {clean}
            </span>
            <button
              onClick={() => setIsViewerOpen(true)}
              className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-semibold rounded-md inline-flex items-center space-x-1 shrink-0 transition-colors"
            >
              <Eye className="w-3 h-3" />
              <span>Preview</span>
            </button>
          </div>
        )}

        {/* Actions Row */}
        <div className="flex items-center justify-between pt-1 text-[11px]">
          <button
            onClick={() => setIsViewerOpen(true)}
            className="text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center space-x-1"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Open Document / Image Viewer</span>
          </button>

          {isHttp && (
            <a
              href={clean}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-slate-600 inline-flex items-center space-x-0.5"
              title="Open direct URL"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      <MediaViewerModal
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        title={title}
        urlOrFilename={clean}
      />
    </>
  );
};
