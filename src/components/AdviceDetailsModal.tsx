import React, { useState } from 'react';
import {
  X,
  MessageSquare,
  User,
  Calendar,
  FileText,
  ExternalLink,
  Copy,
  Check,
  Tag,
  Clock,
  Layers,
  Plus,
  Server,
  Database,
  ArrowRight
} from 'lucide-react';
import { User as UserType } from '../types';
import { MediaPreview } from './MediaPreview';

export interface AdviceModalData {
  id: number;
  content: string;
  userid: string | number;
  touserid: string | number;
  filename: string;
  createdAt?: string;
  updatedAt?: string;
  source?: 'database' | 'external';
  isExternal?: boolean;
  events?: Array<{
    eventID: number;
    eventDescription: string;
    eventDate: string;
    eventFilename: string;
    userid?: number | string;
  }>;
}

interface AdviceDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  advice: AdviceModalData | null;
  users: UserType[];
  onAddEvent?: (adviceId: number) => void;
}

export const AdviceDetailsModal: React.FC<AdviceDetailsModalProps> = ({
  isOpen,
  onClose,
  advice,
  users,
  onAddEvent,
}) => {
  const [copiedJson, setCopiedJson] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'json'>('details');

  if (!isOpen || !advice) return null;

  const sender = users.find((u) => String(u.id) === String(advice.userid));
  const recipient = users.find((u) => String(u.id) === String(advice.touserid));

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Not recorded';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(advice.content);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(advice, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const isExternal = advice.isExternal || advice.source === 'external';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/70">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">
                Advice #{advice.id}
              </span>
              {isExternal ? (
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>wouteradvicenode</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                  <Database className="w-3 h-3 text-slate-500" />
                  <span>Local DB</span>
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-slate-900">Full Advice Details</h3>
            <p className="text-xs text-slate-500">
              Detailed metadata, participants, document attachments, and linked events.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 border-b border-slate-100 flex items-center space-x-6 text-xs font-semibold text-slate-500">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'details'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent hover:text-slate-800'
            }`}
          >
            Overview & Details
          </button>
          <button
            onClick={() => setActiveTab('json')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'json'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent hover:text-slate-800'
            }`}
          >
            Raw JSON Record
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {activeTab === 'details' ? (
            <>
              {/* Advice Content Box */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span className="flex items-center space-x-1.5 text-indigo-600">
                    <MessageSquare className="w-4 h-4" />
                    <span>Advice Guidance & Recommendation</span>
                  </span>
                  <button
                    onClick={handleCopyText}
                    className="flex items-center space-x-1 text-slate-500 hover:text-indigo-600 font-normal transition-colors"
                    title="Copy advice text"
                  >
                    {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedText ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="text-slate-800 text-sm font-medium leading-relaxed bg-white p-3.5 rounded-xl border border-slate-200/60 shadow-sm">
                  "{advice.content}"
                </p>
              </div>

              {/* Participants Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Advisor (From) */}
                <div className="bg-indigo-50/40 rounded-xl p-4 border border-indigo-100/80 space-y-2">
                  <div className="flex items-center space-x-1.5 text-xs font-semibold text-indigo-800">
                    <User className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Advisor (Sender / From)</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-sm">
                      {sender
                        ? `${sender.firstName?.[0] || ''}${sender.lastName?.[0] || ''}`.toUpperCase()
                        : `#${advice.userid}`}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate">
                        {sender
                          ? `${sender.title ? sender.title + ' ' : ''}${sender.firstName} ${sender.lastName}`
                          : `User #${advice.userid}`}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{sender?.email || `User ID: ${advice.userid}`}</p>
                      {sender?.role && (
                        <span className="inline-block mt-0.5 px-2 py-0.2 rounded text-[10px] font-semibold bg-indigo-100 text-indigo-700">
                          {sender.role}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Advisee (To) */}
                <div className="bg-emerald-50/40 rounded-xl p-4 border border-emerald-100/80 space-y-2">
                  <div className="flex items-center space-x-1.5 text-xs font-semibold text-emerald-800">
                    <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Recipient (Target / To)</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-sm">
                      {recipient
                        ? `${recipient.firstName?.[0] || ''}${recipient.lastName?.[0] || ''}`.toUpperCase()
                        : `#${advice.touserid}`}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate">
                        {recipient
                          ? `${recipient.title ? recipient.title + ' ' : ''}${recipient.firstName} ${recipient.lastName}`
                          : `User #${advice.touserid}`}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{recipient?.email || `User ID: ${advice.touserid}`}</p>
                      {recipient?.role && (
                        <span className="inline-block mt-0.5 px-2 py-0.2 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                          {recipient.role}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Document Attachment & Media Preview */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span className="flex items-center space-x-1.5">
                    <FileText className="w-4 h-4 text-slate-500" />
                    <span>Attached Reference Document</span>
                  </span>
                  <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700 text-[11px]">
                    {advice.filename || 'None'}
                  </span>
                </div>

                {advice.filename && advice.filename !== '-' && (
                  <MediaPreview
                    urlOrFilename={advice.filename}
                    title={`Advice #${advice.id}: ${advice.content}`}
                    label="Advice Document Attachment"
                    compact={false}
                    baseImageUrl="https://wouterverwoerd.github.io/advicefiles/"
                  />
                )}
              </div>

              {/* Timestamps & Technical Details */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2 text-xs text-slate-600">
                <h4 className="font-semibold text-slate-800 text-xs flex items-center space-x-1.5 mb-2">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Metadata & Timestamps</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400">Created:</span>{' '}
                    <strong className="text-slate-700">{formatDate(advice.createdAt)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Updated:</span>{' '}
                    <strong className="text-slate-700">{formatDate(advice.updatedAt)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Data Source:</span>{' '}
                    <strong className="text-slate-700">
                      {isExternal ? 'wouteradvicenode REST API' : 'Local MySQL / SQLite Database'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Linked Events:</span>{' '}
                    <strong className="text-slate-700">
                      {advice.events ? advice.events.length : 0} event{advice.events && advice.events.length === 1 ? '' : 's'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Associated Events List */}
              {advice.events && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center space-x-1.5">
                      <Layers className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Associated Events ({advice.events.length})</span>
                    </h4>

                    {onAddEvent && (
                      <button
                        onClick={() => {
                          onClose();
                          onAddEvent(advice.id);
                        }}
                        className="inline-flex items-center space-x-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Event for this Advice</span>
                      </button>
                    )}
                  </div>

                  {advice.events.length === 0 ? (
                    <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                      No events currently associated with Advice #{advice.id}.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {advice.events.map((ev) => (
                        <div
                          key={ev.eventID}
                          className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-semibold text-slate-800">#{ev.eventID}: {ev.eventDescription}</span>
                            <span className="block text-[11px] text-slate-400 mt-0.5">Date: {ev.eventDate}</span>
                          </div>
                          {ev.eventFilename && ev.eventFilename !== '-' && (
                            <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-500">
                              {ev.eventFilename}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Raw JSON representation of this advice:</span>
                <button
                  onClick={handleCopyJson}
                  className="inline-flex items-center space-x-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedJson ? 'Copied to Clipboard' : 'Copy JSON'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-slate-900 text-emerald-400 font-mono text-xs overflow-x-auto border border-slate-800">
                {JSON.stringify(advice, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Advice ID: <strong className="text-slate-700">#{advice.id}</strong>
          </div>

          <div className="flex items-center space-x-2">
            {onAddEvent && (
              <button
                onClick={() => {
                  onClose();
                  onAddEvent(advice.id);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold inline-flex items-center space-x-1.5 transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Event</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
