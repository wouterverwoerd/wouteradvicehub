import React, { useState } from 'react';
import { Briefcase, Plus, Search, Edit2, Trash2, Calendar, Building, ExternalLink, X, MapPin, Globe } from 'lucide-react';
import { Job } from '../types';
import { MediaPreview } from './MediaPreview';
import { JobsMap } from './JobsMap';

interface JobsViewProps {
  jobs: Job[];
  onRefresh: () => void;
}

const COMMON_AREAS = [
  'Auckland CBD, New Zealand',
  'Ponsonby, Auckland, NZ',
  'Wellington Central, New Zealand',
  'Te Aro, Wellington, NZ',
  'Christchurch Central, New Zealand',
  'Riccarton, Christchurch, NZ',
  'Frankton, Hamilton, NZ',
  'Queenstown Central, New Zealand',
  'Remote / New Zealand',
];

export const JobsView: React.FC<JobsViewProps> = ({ jobs, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);

  const [formData, setFormData] = useState({
    jobTitle: '',
    advertDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
    company: '',
    url: '',
    area: 'Auckland CBD, New Zealand',
  });

  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenAddModal = () => {
    setEditingJob(null);
    setFormData({
      jobTitle: '',
      advertDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
      company: '',
      url: 'https://',
      area: selectedArea || 'Auckland CBD, New Zealand',
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (job: Job) => {
    setEditingJob(job);
    setFormData({
      jobTitle: job.jobTitle,
      advertDate: job.advertDate,
      company: job.company,
      url: job.url,
      area: job.area || 'Remote / Global',
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const url = editingJob ? `/jobs/${editingJob.id}` : '/jobs';
      const method = editingJob ? 'PUT' : 'POST';

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
      setErrorMsg(err.message || 'Failed to save job advert');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this job advert?')) return;
    try {
      const res = await fetch(`/jobs/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to delete');
      }
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredJobs = jobs.filter((j) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch =
      j.jobTitle.toLowerCase().includes(search) ||
      j.company.toLowerCase().includes(search) ||
      (j.area || '').toLowerCase().includes(search) ||
      j.url.toLowerCase().includes(search);

    const jobArea = (j.area || 'Remote / Global').trim().toLowerCase();
    const matchesArea = !selectedArea || jobArea === selectedArea.trim().toLowerCase();

    return matchesSearch && matchesArea;
  });

  return (
    <div className="space-y-6">
      {/* Interactive Map Component */}
      <JobsMap jobs={jobs} selectedArea={selectedArea} onSelectArea={setSelectedArea} />

      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <Briefcase className="w-5 h-5 text-indigo-600" />
            <span>Job Advertisements</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage job opportunities, location areas, companies, and advert links.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search title, company or area..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <button
            id="add-job-btn"
            onClick={handleOpenAddModal}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl transition-all shadow-md shadow-indigo-600/20 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>New Job Advert</span>
          </button>
        </div>
      </div>

      {/* Jobs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredJobs.map((job) => (
          <div
            key={job.id}
            className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                  Job #{job.id}
                </span>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleOpenEditModal(job)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100"
                    title="Edit Job Advert"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(job.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100"
                    title="Delete Job Advert"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h3 className="text-slate-900 font-bold text-base leading-snug mb-2">{job.jobTitle}</h3>

              <div className="space-y-1.5 mb-4">
                <div className="flex items-center text-slate-600 text-xs font-medium space-x-1.5">
                  <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{job.company}</span>
                </div>

                {/* Advertised Area Location Tag */}
                <button
                  onClick={() => setSelectedArea(job.area || 'Remote / Global')}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200/80 transition-colors"
                  title="Filter by this area on map"
                >
                  <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Area: {job.area || 'Remote / Global'}</span>
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Advert Date: <strong>{job.advertDate}</strong></span>
                </span>
              </div>

              <MediaPreview
                urlOrFilename={job.url}
                title={`${job.jobTitle} - ${job.company}`}
                label="Job Advert Link / Document"
              />
            </div>
          </div>
        ))}

        {filteredJobs.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-dashed border-slate-300">
            <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium text-sm">No job adverts found.</p>
            <p className="text-xs text-slate-400 mt-1">Try clearing search or area filters.</p>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <h3 className="text-lg font-bold text-slate-900">
                {editingJob ? `Edit Job Advert #${editingJob.id}` : 'Create New Job Advert'}
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Job Title *</label>
                <input
                  type="text"
                  required
                  value={formData.jobTitle}
                  onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                  placeholder="e.g. Senior Software Developer"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Company *</label>
                <input
                  type="text"
                  required
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="e.g. Acme Corp"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Area / Location *</label>
                <input
                  type="text"
                  required
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                  placeholder="e.g. Amsterdam, Netherlands or Remote / Global"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />

                {/* Common Location Quick Suggestions */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[11px] text-slate-400 self-center mr-1">Suggestions:</span>
                  {COMMON_AREAS.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setFormData({ ...formData, area: a })}
                      className="px-2 py-0.5 rounded-lg text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Advert Date (DateTime) *</label>
                <input
                  type="text"
                  required
                  value={formData.advertDate}
                  onChange={(e) => setFormData({ ...formData, advertDate: e.target.value })}
                  placeholder="e.g. 2026-08-01 12:00:00"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Job Advert URL *</label>
                <input
                  type="url"
                  required
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://example.com/careers/job-123"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono text-xs"
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
                  className="px-4 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl font-medium text-xs shadow-md shadow-indigo-600/20"
                >
                  {isSubmitting ? 'Saving...' : editingJob ? 'Update Job' : 'Save Job Advert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

