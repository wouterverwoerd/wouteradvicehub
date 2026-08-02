import React, { useState } from 'react';
import { MessageSquare, Plus, Search, Edit2, Trash2, FileText, UserCheck, X } from 'lucide-react';
import { Advice, User } from '../types';
import { MediaPreview } from './MediaPreview';

interface AdvicesViewProps {
  advices: Advice[];
  users: User[];
  onRefresh: () => void;
}

export const AdvicesView: React.FC<AdvicesViewProps> = ({ advices, users, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAdvice, setEditingAdvice] = useState<Advice | null>(null);

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

        <div className="flex items-center space-x-3">
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

      {/* Advice Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredAdvices.map((advice) => {
          const sender = users.find((u) => String(u.id) === advice.userid);
          const recipient = users.find((u) => String(u.id) === advice.touserid);

          return (
            <div
              key={advice.id}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                    Advice #{advice.id}
                  </span>
                  <div className="flex items-center space-x-1">
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

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <h3 className="text-lg font-bold text-slate-900">
                {editingAdvice ? `Edit Advice #${editingAdvice.id}` : 'Create New Advice'}
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
    </div>
  );
};
