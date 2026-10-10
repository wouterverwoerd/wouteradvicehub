import React, { useState } from 'react';
import {
  MessageSquare,
  Plus,
  Search,
  Edit2,
  Trash2,
  FileText,
  UserCheck,
  X,
  Info,
  Layers,
  LayoutGrid,
  ChevronDown,
  ChevronRight,
  Database,
  Clock,
  ArrowRight
} from 'lucide-react';
import { Advice, User, CombinedAdviceEvent, AppEvent } from '../types';
import { MediaPreview } from './MediaPreview';
import { AdviceDetailsModal, AdviceModalData } from './AdviceDetailsModal';

interface AdvicesViewProps {
  advices: Advice[];
  users: User[];
  combinedEvents?: CombinedAdviceEvent[];
  events?: AppEvent[];
  onRefresh: () => void;
}

export const AdvicesView: React.FC<AdvicesViewProps> = ({
  advices,
  users,
  combinedEvents = [],
  events = [],
  onRefresh,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'combined'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAdvice, setEditingAdvice] = useState<Advice | null>(null);
  const [selectedAdviceForDetails, setSelectedAdviceForDetails] = useState<AdviceModalData | null>(null);
  const [expandedAdviceIds, setExpandedAdviceIds] = useState<number[]>(
    advices.map((a) => a.id)
  );

  const [formData, setFormData] = useState({
    content: '',
    userid: users[0]?.id ? String(users[0].id) : '1',
    touserid: users[1]?.id ? String(users[1].id) : '2',
    filename: '',
  });

  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenAddModal = () => {
    setEditingAdvice(null);
    setFormData({
      content: '',
      userid: users[0]?.id ? String(users[0].id) : '1',
      touserid: users[1]?.id ? String(users[1].id) : '2',
      filename: 'guidance_doc.pdf',
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (advice: Advice) => {
    setEditingAdvice(advice);
    setFormData({
      content: advice.content,
      userid: advice.userid,
      touserid: advice.touserid,
      filename: advice.filename,
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const url = editingAdvice ? `/advices/${editingAdvice.id}` : '/advices';
      const method = editingAdvice ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Operation failed');

      setIsModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save advice');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this advice item?')) return;
    try {
      const res = await fetch(`/advices/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to delete');
      }
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredAdvices = advices.filter(
    (a) =>
      a.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-indigo-600" />
            <span>Advices Directory</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage peer advice, recommendations, and document references.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View Toggle */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center space-x-1">
            <button
              id="advices-grid-btn"
              onClick={() => setViewMode('grid')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'grid'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards Grid</span>
            </button>
            <button
              id="advices-combined-btn"
              onClick={() => setViewMode('combined')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'combined'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Combined View</span>
            </button>
          </div>

          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search advice content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          <button
            id="add-advice-btn"
            onClick={handleOpenAddModal}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-xl transition-all shadow-md shadow-indigo-600/20 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>New Advice</span>
          </button>
        </div>
      </div>

      {/* Mode 1: Standard Cards Grid */}
      {viewMode === 'grid' && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredAdvices.map((advice) => {
          const sender = users.find((u) => String(u.id) === advice.userid);
          const recipient = users.find((u) => String(u.id) === advice.touserid);
            const linkedEvents = (combinedEvents.find((c) => c.adviceID === advice.id)?.Events) ||
              events.filter((e) => String(e.adviceid) === String(advice.id)).map((e) => ({
                eventID: e.id,
                eventDescription: e.description,
                eventDate: e.eventDate,
                eventFilename: e.eventFilename,
                userid: e.userid,
              }));

            const adviceModalData: AdviceModalData = {
              id: advice.id,
              content: advice.content,
              userid: advice.userid,
              touserid: advice.touserid,
              filename: advice.filename,
              createdAt: advice.createdAt,
              updatedAt: advice.updatedAt,
              source: advice.source,
              isExternal: advice.isExternal,
              events: linkedEvents,
            };

          return (
            <div
              key={advice.id}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                    Advice #{advice.id}
                  </span>
                    {advice.isExternal ? (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <span>wouteradvicenode</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                        <span>Local DB</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                        type="button"
                        onClick={() => setSelectedAdviceForDetails(adviceModalData)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition-colors"
                        title="View Full Advice Details"
                      >
                        <Info className="w-4 h-4" />
                      </button>
                      <button
                      onClick={() => handleOpenEditModal(advice)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition-colors"
                      title="Edit Advice"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(advice.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors"
                      title="Delete Advice"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-slate-800 text-sm font-normal leading-relaxed mb-4">{advice.content}</p>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="flex items-center space-x-1">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                    <span>From: <strong>{sender ? `${sender.firstName} ${sender.lastName}` : `ID ${advice.userid}`}</strong></span>
                  </span>
                  <span>To: <strong>{recipient ? `${recipient.firstName} ${recipient.lastName}` : `ID ${advice.touserid}`}</strong></span>
                </div>

                <MediaPreview
                  urlOrFilename={advice.filename}
                  title={`Advice #${advice.id}: ${advice.content}`}
                  label="Document Attachment"
                    baseImageUrl="https://wouterverwoerd.github.io/advicefiles/"
                />
              </div>
            </div>
          );
        })}

        {filteredAdvices.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-dashed border-slate-300">
            <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium text-sm">No advices found.</p>
            <p className="text-xs text-slate-400 mt-1">Try adding a new advice item or updating your search.</p>
          </div>
        )}
      </div>
      )}

      {/* Mode 2: Combined Advice & Events View */}
      {viewMode === 'combined' && (
        <div className="space-y-4">
          <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4 flex items-center justify-between text-xs text-indigo-900">
            <span className="flex items-center space-x-2">
              <Database className="w-4 h-4 text-indigo-600" />
              <span>
                <strong>Advice Combined View:</strong> Showing complete advice details alongside associated child events.
              </span>
            </span>
            <span className="font-mono bg-indigo-200/50 px-2 py-0.5 rounded text-[11px] text-indigo-800">
              GET /events/combined
            </span>
          </div>

          <div className="space-y-4">
            {filteredAdvices.map((advice) => {
              const isExpanded = expandedAdviceIds.includes(advice.id);
              const sender = users.find((u) => String(u.id) === advice.userid);
              const recipient = users.find((u) => String(u.id) === advice.touserid);
              const linkedEvents = (combinedEvents.find((c) => c.adviceID === advice.id)?.Events) ||
                events.filter((e) => String(e.adviceid) === String(advice.id)).map((e) => ({
                  eventID: e.id,
                  eventDescription: e.description,
                  eventDate: e.eventDate,
                  eventFilename: e.eventFilename,
                  userid: e.userid,
                }));

              const adviceModalData: AdviceModalData = {
                id: advice.id,
                content: advice.content,
                userid: advice.userid,
                touserid: advice.touserid,
                filename: advice.filename,
                createdAt: advice.createdAt,
                updatedAt: advice.updatedAt,
                source: advice.source,
                isExternal: advice.isExternal,
                events: linkedEvents,
              };

              const toggleExpand = () => {
                setExpandedAdviceIds((prev) =>
                  prev.includes(advice.id) ? prev.filter((i) => i !== advice.id) : [...prev, advice.id]
                );
              };

              return (
                <div key={advice.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div
                    onClick={toggleExpand}
                    className="p-5 cursor-pointer hover:bg-slate-50/80 transition-colors space-y-4"
                  >
                    {/* Advice Top Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </div>
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                          Advice #{advice.id}
                        </span>
                        {advice.isExternal ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span>wouteradvicenode</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            <Database className="w-3 h-3 text-slate-400" />
                            <span>Local DB</span>
                          </span>
                        )}
                        {advice.createdAt && (
                          <span className="hidden sm:inline-flex items-center space-x-1 text-[11px] text-slate-400">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(advice.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </span>
                        )}
                      </div>

                      {/* Advice Details Modal Trigger & Actions */}
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAdviceForDetails(adviceModalData);
                          }}
                          className="inline-flex items-center space-x-1.5 px-3 py-1 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-colors border border-indigo-200/60 shadow-xs"
                          title="View complete advice details modal"
                        >
                          <Info className="w-3.5 h-3.5" />
                          <span>Advice Details</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditModal(advice);
                          }}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition-colors"
                          title="Edit Advice"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Advice Guidance Section */}
                    <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/60 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                        <span className="flex items-center space-x-1.5 text-indigo-600">
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Advice Guidance & Recommendation</span>
                        </span>
                        {advice.filename && (
                          <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-500">
                            ?? {advice.filename}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-slate-900 leading-relaxed">
                        "{advice.content}"
                      </p>
                    </div>

                    {/* Advice Participants Row (From & To) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center space-x-2 p-2 rounded-lg bg-indigo-50/40 border border-indigo-100/60">
                        <UserCheck className="w-4 h-4 text-indigo-500 shrink-0" />
                        <div className="min-w-0">
                          <span className="text-[10px] uppercase font-bold text-indigo-400 block tracking-wider">Advisor (From)</span>
                          <span className="font-semibold text-slate-800 truncate block">
                            {sender ? `${sender.title ? sender.title + ' ' : ''}${sender.firstName} ${sender.lastName}` : `User #${advice.userid}`}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 p-2 rounded-lg bg-emerald-50/40 border border-emerald-100/60">
                        <ArrowRight className="w-4 h-4 text-emerald-500 shrink-0" />
                        <div className="min-w-0">
                          <span className="text-[10px] uppercase font-bold text-emerald-400 block tracking-wider">Recipient (To)</span>
                          <span className="font-semibold text-slate-800 truncate block">
                            {recipient ? `${recipient.title ? recipient.title + ' ' : ''}${recipient.firstName} ${recipient.lastName}` : `User #${advice.touserid}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Document Preview (if any) */}
                    {advice.filename && advice.filename !== '-' && (
                      <div className="mt-1">
                        <MediaPreview
                          urlOrFilename={advice.filename}
                          title={`Advice #${advice.id}: ${advice.content}`}
                          label="Advice Document Attachment"
                          compact={true}
                          baseImageUrl="https://wouterverwoerd.github.io/advicefiles/"
                        />
                      </div>
                    )}

                    {/* Sub-row: Linked Events Count */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                          {linkedEvents.length} Linked Event{linkedEvents.length !== 1 ? 's' : ''}
                        </span>
                        <span className="text-slate-400 text-xs hidden sm:inline">
                          {isExpanded ? '(Click to collapse)' : '(Click to expand events)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Nested Events */}
                  {isExpanded && (
                    <div className="bg-slate-50/70 p-5 border-t border-slate-100 space-y-3">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Linked Events for Advice #{advice.id}
                      </h4>

                      {linkedEvents.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-2">No events logged for this advice yet.</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {linkedEvents.map((ev) => (
                            <div
                              key={ev.eventID}
                              className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-xs space-y-2"
                            >
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-slate-800">Event #{ev.eventID}</span>
                                <span className="font-mono text-slate-400 text-[11px]">{ev.eventDate}</span>
                              </div>
                              <p className="text-xs text-slate-700 leading-snug">{ev.eventDescription}</p>
                              {ev.eventFilename && ev.eventFilename !== '-' && (
                                <MediaPreview
                                  urlOrFilename={ev.eventFilename}
                                  title={`Event #${ev.eventID}: ${ev.eventDescription}`}
                                  label="Event Attachment"
                                  compact={true}
                                  baseImageUrl="https://wouterverwoerd.github.io/advicefiles/"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div>
              <h3 className="text-lg font-bold text-slate-900">
                {editingAdvice ? `Edit Advice #${editingAdvice.id}` : 'Create New Advice'}
              </h3>
                <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Target Preference: <strong>https://wouteradvicenode.onrender.com</strong> (live sync with local fallback)</span>
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 text-rose-700 text-xs font-medium border border-rose-200">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Advice Content *</label>
                <textarea
                  required
                  rows={4}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Enter detailed advice or recommendation..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Sender User (userid) *</label>
                  <select
                    value={formData.userid}
                    onChange={(e) => setFormData({ ...formData, userid: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={String(u.id)}>
                        {u.firstName} {u.lastName} (ID: {u.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Recipient User (touserid) *</label>
                  <select
                    value={formData.touserid}
                    onChange={(e) => setFormData({ ...formData, touserid: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={String(u.id)}>
                        {u.firstName} {u.lastName} (ID: {u.id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reference Filename *</label>
                <input
                  type="text"
                  required
                  value={formData.filename}
                  onChange={(e) => setFormData({ ...formData, filename: e.target.value })}
                  placeholder="e.g. advice_report_v1.pdf"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl font-medium text-xs shadow-md shadow-indigo-600/20"
                >
                  {isSubmitting ? 'Saving...' : editingAdvice ? 'Update Advice' : 'Save Advice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Advice Details Modal */}
      <AdviceDetailsModal
        isOpen={Boolean(selectedAdviceForDetails)}
        onClose={() => setSelectedAdviceForDetails(null)}
        advice={selectedAdviceForDetails}
        users={users}
      />
    </div>
  );
};
