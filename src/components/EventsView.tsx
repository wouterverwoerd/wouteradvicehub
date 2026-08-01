import React, { useState } from 'react';
import { Calendar, Plus, Database, Edit2, Trash2, FileText, ChevronDown, ChevronRight, Layers, X, Search } from 'lucide-react';
import { AppEvent, Advice, User, CombinedAdviceEvent } from '../types';

interface EventsViewProps {
  events: AppEvent[];
  advices: Advice[];
  users: User[];
  combinedEvents: CombinedAdviceEvent[];
  onRefresh: () => void;
}

export const EventsView: React.FC<EventsViewProps> = ({
  events,
  advices,
  users,
  combinedEvents,
  onRefresh,
}) => {
  const [viewMode, setViewMode] = useState<'combined' | 'all'>('combined');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedAdviceIds, setExpandedAdviceIds] = useState<number[]>(
    combinedEvents.map((c) => c.adviceID)
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AppEvent | null>(null);

  const [formData, setFormData] = useState({
    description: '',
    userid: users[0]?.id || 1,
    adviceid: advices[0]?.id || 1,
    eventDate: new Date().toISOString().split('T')[0],
    eventFilename: '',
  });

  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleAdviceExpand = (id: number) => {
    setExpandedAdviceIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleOpenAddModal = (adviceId?: number) => {
    setEditingEvent(null);
    setFormData({
      description: '',
      userid: users[0]?.id || 1,
      adviceid: adviceId || advices[0]?.id || 1,
      eventDate: new Date().toISOString().split('T')[0],
      eventFilename: 'event_log.pdf',
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (ev: AppEvent) => {
    setEditingEvent(ev);
    setFormData({
      description: ev.description,
      userid: ev.userid,
      adviceid: ev.adviceid,
      eventDate: ev.eventDate,
      eventFilename: ev.eventFilename,
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const url = editingEvent ? `/events/${editingEvent.id}` : '/events';
      const method = editingEvent ? 'PUT' : 'POST';

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
      setErrorMsg(err.message || 'Failed to save event');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
      const res = await fetch(`/events/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to delete');
      }
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredEvents = events.filter(
    (e) =>
      e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.eventFilename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-emerald-600" />
            <span>Events & Relational Timeline</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Track event milestones linked to specific Advice records using <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-700">/events/combined</code> endpoint logic.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View Toggle */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center space-x-1">
            <button
              id="view-combined-btn"
              onClick={() => setViewMode('combined')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'combined'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Combined View</span>
            </button>
            <button
              id="view-all-events-btn"
              onClick={() => setViewMode('all')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'all'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Flat Events ({events.length})</span>
            </button>
          </div>

          <button
            id="add-event-btn"
            onClick={() => handleOpenAddModal()}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm rounded-xl transition-all shadow-md shadow-emerald-600/20 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>New Event</span>
          </button>
        </div>
      </div>

      {/* Mode 1: Combined Relational View */}
      {viewMode === 'combined' && (
        <div className="space-y-4">
          <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4 flex items-center justify-between text-xs text-emerald-800">
            <span className="flex items-center space-x-2">
              <Database className="w-4 h-4 text-emerald-600" />
              <span>
                Simulates <strong>wouteradvicenode</strong> query aggregating Advice entries with child Events arrays.
              </span>
            </span>
            <span className="font-mono bg-emerald-200/50 px-2 py-0.5 rounded text-[11px]">GET /events/combined</span>
          </div>

          <div className="space-y-4">
            {combinedEvents.map((item) => {
              const isExpanded = expandedAdviceIds.includes(item.adviceID);

              return (
                <div key={item.adviceID} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div
                    onClick={() => toggleAdviceExpand(item.adviceID)}
                    className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="mt-0.5 p-2 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                            Advice #{item.adviceID}
                          </span>
                          <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                            📎 {item.adviceFilename}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-slate-800 line-clamp-1">{item.adviceDescription}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                        {item.Events.length} Event{item.Events.length !== 1 ? 's' : ''}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenAddModal(item.adviceID);
                        }}
                        className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 rounded-lg transition-colors font-medium"
                      >
                        + Add Event
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="bg-slate-50/70 p-5 border-t border-slate-100 space-y-3">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Nested Events for Advice #{item.adviceID}
                      </h4>

                      {item.Events.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-2">No events logged for this advice yet.</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {item.Events.map((ev) => {
                            const fullEv = events.find((e) => e.id === ev.eventID);

                            return (
                              <div
                                key={ev.eventID}
                                className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-emerald-300 transition-all"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                    Event #{ev.eventID}
                                  </span>
                                  <span className="text-xs font-mono text-slate-500">{ev.eventDate}</span>
                                </div>

                                <p className="text-xs font-medium text-slate-800 mb-3">{ev.eventDescription}</p>

                                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                                  <span className="font-mono truncate max-w-[150px]">📎 {ev.eventFilename}</span>
                                  {fullEv && (
                                    <div className="flex items-center space-x-1">
                                      <button
                                        onClick={() => handleOpenEditModal(fullEv)}
                                        className="p-1 text-slate-400 hover:text-emerald-600 rounded"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDelete(ev.eventID)}
                                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
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

      {/* Mode 2: Flat List View */}
      {viewMode === 'all' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEvents.map((ev) => (
              <div
                key={ev.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-100">
                      Event #{ev.id}
                    </span>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleOpenEditModal(ev)}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-100"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(ev.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-sm font-medium text-slate-800 mb-4">{ev.description}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-500">
                  <div className="flex items-center justify-between">
                    <span>Linked Advice: <strong>#{ev.adviceid}</strong></span>
                    <span>Date: <strong>{ev.eventDate}</strong></span>
                  </div>
                  <div className="font-mono text-[11px] bg-slate-50 p-2 rounded-lg truncate">
                    📎 {ev.eventFilename}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <h3 className="text-lg font-bold text-slate-900">
                {editingEvent ? `Edit Event #${editingEvent.id}` : 'Create New Event'}
              </h3>
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Event Description *</label>
                <textarea
                  required
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe event accomplishment or timeline update..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Parent Advice (adviceid) *</label>
                  <select
                    value={formData.adviceid}
                    onChange={(e) => setFormData({ ...formData, adviceid: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    {advices.map((a) => (
                      <option key={a.id} value={a.id}>
                        Advice #{a.id}: {a.content.substring(0, 25)}...
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Logged By User (userid) *</label>
                  <select
                    value={formData.userid}
                    onChange={(e) => setFormData({ ...formData, userid: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.firstName} {u.lastName} (ID: {u.id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Event Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.eventDate}
                    onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Attachment Filename *</label>
                  <input
                    type="text"
                    required
                    value={formData.eventFilename}
                    onChange={(e) => setFormData({ ...formData, eventFilename: e.target.value })}
                    placeholder="e.g. log_2026.pdf"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
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
                  className="px-4 py-2 text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl font-medium text-xs shadow-md shadow-emerald-600/20"
                >
                  {isSubmitting ? 'Saving...' : editingEvent ? 'Update Event' : 'Save Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
