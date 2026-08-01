import React, { useState } from 'react';
import { Lightbulb, Plus, Search, Edit2, Trash2, FileText, Calendar, X } from 'lucide-react';
import { Idea } from '../types';

interface IdeasViewProps {
  ideas: Idea[];
  onRefresh: () => void;
}

export const IdeasView: React.FC<IdeasViewProps> = ({ ideas, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null);

  const [formData, setFormData] = useState({
    description: '',
    ideaDate: new Date().toISOString().split('T')[0],
    ideaFilename: '',
  });

  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenAddModal = () => {
    setEditingIdea(null);
    setFormData({
      description: '',
      ideaDate: new Date().toISOString().split('T')[0],
      ideaFilename: 'idea_proposal.pdf',
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (idea: Idea) => {
    setEditingIdea(idea);
    setFormData({
      description: idea.description,
      ideaDate: idea.ideaDate,
      ideaFilename: idea.ideaFilename,
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const url = editingIdea ? `/ideas/${editingIdea.id}` : '/ideas';
      const method = editingIdea ? 'PUT' : 'POST';

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
      setErrorMsg(err.message || 'Failed to save idea');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this idea?')) return;
    try {
      const res = await fetch(`/ideas/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to delete');
      }
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredIdeas = ideas.filter(
    (i) =>
      i.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.ideaFilename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            <span>Ideas Wall</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Store product concepts, strategic ideas, and attachments.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search ideas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          <button
            id="add-idea-btn"
            onClick={handleOpenAddModal}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium text-sm rounded-xl transition-all shadow-md shadow-amber-500/20 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>New Idea</span>
          </button>
        </div>
      </div>

      {/* Ideas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredIdeas.map((idea) => (
          <div
            key={idea.id}
            className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/60">
                  Idea #{idea.id}
                </span>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleOpenEditModal(idea)}
                    className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-slate-100"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(idea.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-slate-800 text-sm font-medium leading-relaxed mb-4">{idea.description}</p>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Recorded: <strong>{idea.ideaDate}</strong></span>
                </span>
              </div>

              <div className="flex items-center space-x-1.5 text-slate-500 bg-slate-50 p-2 rounded-lg font-mono text-[11px] truncate">
                <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{idea.ideaFilename}</span>
              </div>
            </div>
          </div>
        ))}

        {filteredIdeas.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-dashed border-slate-300">
            <Lightbulb className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium text-sm">No ideas registered.</p>
            <p className="text-xs text-slate-400 mt-1">Create a new idea proposal to display it here.</p>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <h3 className="text-lg font-bold text-slate-900">
                {editingIdea ? `Edit Idea #${editingIdea.id}` : 'Create New Idea'}
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Idea Description *</label>
                <textarea
                  required
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detail your innovation or proposal..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Idea Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.ideaDate}
                    onChange={(e) => setFormData({ ...formData, ideaDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Attachment Filename *</label>
                  <input
                    type="text"
                    required
                    value={formData.ideaFilename}
                    onChange={(e) => setFormData({ ...formData, ideaFilename: e.target.value })}
                    placeholder="e.g. idea_deck.pdf"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
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
                  className="px-4 py-2 text-white bg-amber-500 hover:bg-amber-600 rounded-xl font-medium text-xs shadow-md shadow-amber-500/20"
                >
                  {isSubmitting ? 'Saving...' : editingIdea ? 'Update Idea' : 'Save Idea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
