import React, { useState, useMemo } from 'react';
import {
  Briefcase,
  Plus,
  Search,
  Edit2,
  Trash2,
  Calendar,
  Building,
  ExternalLink,
  X,
  MapPin,
  Globe,
  FileCode,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  ShieldCheck,
  CopyX,
  RefreshCw,
  Download,
} from 'lucide-react';
import { Job } from '../types';
import { JobsMap } from './JobsMap';
import { ExportSheetsModal } from './ExportSheetsModal';
import { exportJobsToCSV } from '../utils/csvExport';

interface JobsViewProps {
  jobs: Job[];
  onRefresh: () => void;
}

// Client-side Uniqueness & Deduplication Helpers
function normalizeStr(str?: string | null): string {
  if (!str) return '';
  return str.trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeJobUrl(url?: string | null): string {
  if (!url) return '';
  const trimmed = url.trim().toLowerCase().replace(/\/$/, '');
  if (trimmed === '#' || trimmed === 'https://' || trimmed === 'http://') return '';
  try {
    const u = new URL(trimmed);
    u.hash = '';
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref', 'source'].forEach((p) => {
      u.searchParams.delete(p);
    });
    return u.toString().replace(/\/$/, '');
  } catch {
    return trimmed;
  }
}

export function isJobDuplicateClient(a: any, b: any): boolean {
  if (!a || !b) return false;

  const urlA = normalizeJobUrl(a.url);
  const urlB = normalizeJobUrl(b.url);
  if (urlA && urlB && urlA === urlB) return true;

  const titleA = normalizeStr(a.jobTitle || a.title);
  const titleB = normalizeStr(b.jobTitle || b.title);
  const compA = normalizeStr(a.company);
  const compB = normalizeStr(b.company);

  if (titleA && titleB && compA && compB && titleA === titleB && compA === compB) {
    const areaA = normalizeStr(a.area || a.location);
    const areaB = normalizeStr(b.area || b.location);

    const isGenericA = !areaA || areaA.includes('remote') || areaA.includes('global');
    const isGenericB = !areaB || areaB.includes('remote') || areaB.includes('global');

    if (isGenericA || isGenericB || areaA === areaB || areaA.includes(areaB) || areaB.includes(areaA)) {
      return true;
    }

    const cities = ['christchurch', 'auckland', 'wellington', 'hamilton', 'tauranga', 'dunedin', 'canterbury', 'burnham', 'burnside'];
    const cityA = cities.find((c) => areaA.includes(c));
    const cityB = cities.find((c) => areaB.includes(c));
    if (cityA && cityB && cityA === cityB) return true;
    if (cityA && cityB && cityA !== cityB) return false;
    return true;
  }

  return false;
}

const COMMON_AREAS = [
  'Auckland CBD, New Zealand',
  'Ponsonby, Auckland, NZ',
  'Wellington Central, New Zealand',
  'Te Aro, Wellington, NZ',
  'Christchurch Central, Canterbury',
  'Christchurch Central, New Zealand',
  'Riccarton, Christchurch, NZ',
  'Burnside, Canterbury',
  'Burnham, Canterbury',
  'Frankton, Hamilton, NZ',
  'Queenstown Central, New Zealand',
  'Remote / New Zealand',
];

const SAMPLE_JOBS_JSON = JSON.stringify(
  [
    {
      title: "Engineer Research Software",
      company: "University of Otago",
      location: "Christchurch Central, Canterbury",
      salary: "$99,364 to $120,834 per year",
      employment_type: null,
      highlights: [
        "Salary + 6.75% Superannuation + 5 weeks annual leave",
        "On-going professional development opportunities",
        "Great people and a collaborative culture",
        "Strong applicant"
      ]
    },
    {
      title: "Software Engineer",
      company: "Talent Army – Winner of Medium Recruitment Agency of the Year 2025",
      location: "Christchurch Central, Canterbury",
      salary: null,
      employment_type: "Office-based role",
      highlights: [
        "Build scalable software used by customers around the world",
        "Join a collaborative, high-trust engineering culture"
      ]
    },
    {
      title: "CONTRACT Senior iOS Mobile Apps Developer (Swift)",
      company: "Sunstone Talent",
      location: "Christchurch, Canterbury",
      salary: "$100-$130 p/h",
      employment_type: "Contract (9 month contract)",
      highlights: [
        "Hybrid + Parking",
        "Work at a great product company",
        "Passionate about Apple mobile development? Enjoy building mobile apps?",
        "Come join a great team working on a client project"
      ]
    },
    {
      title: "Service Desk Analyst",
      company: "Softsource Ltd",
      location: "Christchurch Central, Canterbury",
      salary: null,
      employment_type: null,
      highlights: [
        "Recently posted"
      ]
    },
    {
      title: "Data and Reporting Administrator",
      company: "ScreenSouth Ltd",
      location: "Christchurch Central, Canterbury",
      salary: "$37 – $42 per hour",
      employment_type: null,
      highlights: [
        "Hybrid"
      ]
    },
    {
      title: "IT Systems Administrator",
      company: "Kea Aerospace",
      location: "Burnside, Canterbury",
      salary: null,
      employment_type: "Full-time or part-time considered",
      highlights: [
        "Hands-on across servers, networking, security and DR",
        "Direct line to engineering, no layers of IT management"
      ]
    },
    {
      title: "Engineer",
      company: "New Zealand Defence Force | Te Ope Katua o Aotearoa",
      location: "Burnham, Canterbury",
      salary: "$97,344 - $112,555 (including 4% superannuation)",
      employment_type: null,
      highlights: []
    },
    {
      title: "MADCAP - Test Automation Engineer",
      company: "Jade Software Corporation Ltd",
      location: "Christchurch Central, Canterbury",
      salary: null,
      employment_type: null,
      highlights: [
        "Join Jade and help shape software used around the world",
        "Grow your career in test automation and quality engineering",
        "Shape the software powering the global dairy manufacturing industry",
        "Recently posted"
      ]
    },
    {
      title: "OPERA Cloud Specialist",
      company: "Scenic Hotel Group",
      location: "Burnside, Canterbury",
      salary: null,
      employment_type: null,
      highlights: [
        "Newly created specialist role with genuine influence across our hotel network",
        "Help lead the configuration and rollout of Oracle OPERA Cloud",
        "Combine your technology expertise with your understanding of hotel operations",
        "Recently posted"
      ]
    },
    {
      title: "Automation Engineer",
      company: "Fluid Engineering",
      location: "Christchurch, Canterbury",
      salary: "$110k - $140k p.a. + insurances + paid overtime",
      employment_type: null,
      highlights: [
        "Work on projects that few others in NZ get exposure to",
        "Immerse yourself in exciting industries like aerospace",
        "Excellent salary, flexible working and genuine career progression",
        "Recently posted"
      ]
    },
    {
      title: "Senior Applications Specialist",
      company: "Pacific Radiology",
      location: "Christchurch Central, Canterbury",
      salary: "Competitive Salary",
      employment_type: "Permanent, Full-time",
      highlights: [
        "Located in Christchurch or Tauranga",
        "Hybrid",
        "5 Weeks' Annual Leave + Health Insurance + EAP + CPD Leave",
        "Be the senior technical authority for assigned clinical and business apps",
        "Recently posted"
      ]
    }
  ],
  null,
  2
);

export const JobsView: React.FC<JobsViewProps> = ({ jobs, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);

  // JSON Import modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [importStatusMessage, setImportStatusMessage] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [expandedJobHighlights, setExpandedJobHighlights] = useState<Record<number, boolean>>({});

  // Deduplication options & board cleanup state
  const [deduplicateOption, setDeduplicateOption] = useState(true);
  const [updateExistingOption, setUpdateExistingOption] = useState(false);
  const [isDeduplicatingBoard, setIsDeduplicatingBoard] = useState(false);
  const [boardDeduplicateSuccess, setBoardDeduplicateSuccess] = useState<string | null>(null);
  const [isRefreshingJobs, setIsRefreshingJobs] = useState(false);
  const [apiStatusMsg, setApiStatusMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    jobTitle: '',
    advertDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
    company: '',
    url: '',
    area: 'Christchurch Central, Canterbury',
  });

  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Count existing duplicates on the board
  const boardDuplicatesCount = useMemo(() => {
    const seen: Job[] = [];
    let dups = 0;
    for (const j of jobs) {
      if (seen.some((s) => isJobDuplicateClient(s, j))) {
        dups++;
      } else {
        seen.push(j);
      }
    }
    return dups;
  }, [jobs]);

  // Parse and validate pasted JSON in real-time
  const parsedJsonResult = useMemo(() => {
    if (!jsonInput.trim()) {
      return { isValid: false, items: [], error: null, total: 0 };
    }
    try {
      const parsed = JSON.parse(jsonInput);
      const list = Array.isArray(parsed) ? parsed : [parsed];
      
      const validItems = list.filter(
        (item) => item && typeof item === 'object' && (item.title || item.jobTitle || item.company)
      );

      return {
        isValid: validItems.length > 0,
        items: validItems,
        total: list.length,
        error: validItems.length === 0 ? 'No valid job objects found in JSON' : null,
      };
    } catch (err: any) {
      return {
        isValid: false,
        items: [],
        total: 0,
        error: `JSON syntax error: ${err.message}`,
      };
    }
  }, [jsonInput]);

  // Live duplicate analysis of pasted JSON against board and batch
  const analyzedJson = useMemo(() => {
    if (!parsedJsonResult.isValid) {
      return {
        ...parsedJsonResult,
        uniqueCount: 0,
        duplicatesExistingCount: 0,
        duplicatesWithinBatchCount: 0,
        totalDuplicates: 0,
        annotatedItems: [] as {
          item: any;
          status: 'unique' | 'duplicate_board' | 'duplicate_batch';
          matchedJob?: any;
        }[],
      };
    }

    const seenInBatch: any[] = [];
    const annotated = parsedJsonResult.items.map((item) => {
      const matchInBoard = jobs.find((existing) => isJobDuplicateClient(item, existing));
      const matchInBatch = seenInBatch.find((prior) => isJobDuplicateClient(item, prior));

      let status: 'unique' | 'duplicate_board' | 'duplicate_batch' = 'unique';
      if (matchInBoard) {
        status = 'duplicate_board';
      } else if (matchInBatch) {
        status = 'duplicate_batch';
      } else {
        seenInBatch.push(item);
      }

      return {
        item,
        status,
        matchedJob: matchInBoard || matchInBatch,
      };
    });

    const uniqueCount = annotated.filter((x) => x.status === 'unique').length;
    const duplicatesExistingCount = annotated.filter((x) => x.status === 'duplicate_board').length;
    const duplicatesWithinBatchCount = annotated.filter((x) => x.status === 'duplicate_batch').length;

    return {
      ...parsedJsonResult,
      uniqueCount,
      duplicatesExistingCount,
      duplicatesWithinBatchCount,
      totalDuplicates: duplicatesExistingCount + duplicatesWithinBatchCount,
      annotatedItems: annotated,
    };
  }, [parsedJsonResult, jobs]);

  const handleOpenAddModal = () => {
    setEditingJob(null);
    setFormData({
      jobTitle: '',
      advertDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
      company: '',
      url: 'https://',
      area: selectedArea || 'Christchurch Central, Canterbury',
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
      url: job.url && job.url !== '#' ? job.url : 'https://',
      area: job.area || 'Remote / Global',
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenImportModal = () => {
    setJsonInput('');
    setImportError(null);
    setIsImportModalOpen(true);
  };

  const handleDeduplicateBoard = async () => {
    setIsDeduplicatingBoard(true);
    try {
      const res = await fetch('/jobs/deduplicate', {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to deduplicate');
      setBoardDeduplicateSuccess(data.message || 'Successfully cleaned up duplicate listings!');
      setTimeout(() => setBoardDeduplicateSuccess(null), 7000);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to deduplicate jobs');
    } finally {
      setIsDeduplicatingBoard(false);
    }
  };

  const handleReloadFromApi = async () => {
    setIsRefreshingJobs(true);
    setApiStatusMsg(null);
    try {
      let res = await fetch('/api/jobs');
      if (!res.ok) {
        res = await fetch('/jobs');
      }
      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }
      const data = await res.json();
      setApiStatusMsg(`Loaded ${Array.isArray(data) ? data.length : ''} latest jobs from API successfully!`);
      onRefresh();
      setTimeout(() => setApiStatusMsg(null), 5000);
    } catch (err: any) {
      setApiStatusMsg(`Failed to reload jobs from API: ${err.message || 'Network error'}`);
      setTimeout(() => setApiStatusMsg(null), 6000);
    } finally {
      setIsRefreshingJobs(false);
    }
  };

  const handleImportSubmit = async () => {
    if (!parsedJsonResult.isValid || parsedJsonResult.items.length === 0) {
      setImportError('Please paste a valid JSON array of job listings.');
      return;
    }

    setIsImporting(true);
    setImportError(null);

    try {
      const res = await fetch('/jobs/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobs: parsedJsonResult.items,
          deduplicate: deduplicateOption,
          updateExisting: updateExistingOption,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Import failed');
      }

      setIsImportModalOpen(false);
      setJsonInput('');
      setImportStatusMessage(
        data.message ||
          `Successfully imported ${data.count ?? parsedJsonResult.items.length} unique jobs!`
      );
      setTimeout(() => setImportStatusMessage(null), 7000);
      onRefresh();
    } catch (err: any) {
      setImportError(err.message || 'Failed to import jobs');
    } finally {
      setIsImporting(false);
    }
  };

  const toggleHighlights = (id: number) => {
    setExpandedJobHighlights((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      if (!editingJob) {
        const isDup = jobs.some((j) => isJobDuplicateClient(formData, j));
        if (isDup) {
          const proceed = confirm(
            `A listing for "${formData.jobTitle}" at "${formData.company}" already exists on the board.\n\nDo you want to create a duplicate anyway? Click Cancel to keep listings unique.`
          );
          if (!proceed) {
            setIsSubmitting(false);
            return;
          }
        }
      }

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
    const highlightsText = Array.isArray(j.highlights) ? j.highlights.join(' ').toLowerCase() : '';
    const matchesSearch =
      j.jobTitle.toLowerCase().includes(search) ||
      j.company.toLowerCase().includes(search) ||
      (j.area || '').toLowerCase().includes(search) ||
      (j.salary || '').toLowerCase().includes(search) ||
      (j.employment_type || j.employmentType || '').toLowerCase().includes(search) ||
      highlightsText.includes(search) ||
      (j.url || '').toLowerCase().includes(search);

    const jobArea = (j.area || 'Remote / Global').trim().toLowerCase();
    const matchesArea = !selectedArea || jobArea === selectedArea.trim().toLowerCase();

    return matchesSearch && matchesArea;
  });

  return (
    <div className="space-y-6">
      {/* Interactive Map Component */}
      <JobsMap jobs={jobs} selectedArea={selectedArea} onSelectArea={setSelectedArea} />

      {/* Success Notification Banner */}
      {importStatusMessage && (
        <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-sm shadow-sm animate-in fade-in duration-300">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{importStatusMessage}</span>
          </div>
          <button
            onClick={() => setImportStatusMessage(null)}
            className="text-emerald-600 hover:text-emerald-800 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Board Duplicates Detected Alert Banner */}
      {boardDuplicatesCount > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-sm shadow-sm gap-3 animate-in fade-in duration-300">
          <div className="flex items-center space-x-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold">
                {boardDuplicatesCount} duplicate listing{boardDuplicatesCount === 1 ? '' : 's'} detected on board.
              </span>{' '}
              <span className="text-amber-700 text-xs sm:text-sm">
                Clean them up automatically to keep every listing on your board unique.
              </span>
            </div>
          </div>
          <button
            onClick={handleDeduplicateBoard}
            disabled={isDeduplicatingBoard}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-sm shadow-amber-600/20 whitespace-nowrap transition-all"
          >
            <CopyX className="w-3.5 h-3.5" />
            <span>{isDeduplicatingBoard ? 'Cleaning...' : `Remove ${boardDuplicatesCount} Duplicate${boardDuplicatesCount === 1 ? '' : 's'}`}</span>
          </button>
        </div>
      )}

      {/* Board Deduplication Success Notification Banner */}
      {boardDeduplicateSuccess && (
        <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-sm shadow-sm animate-in fade-in duration-300">
          <div className="flex items-center space-x-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{boardDeduplicateSuccess}</span>
          </div>
          <button
            onClick={() => setBoardDeduplicateSuccess(null)}
            className="text-emerald-600 hover:text-emerald-800 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <Briefcase className="w-5 h-5 text-indigo-600" />
            <span>Job Advertisements</span>
            <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
              {jobs.length} Total
            </span>
            {boardDuplicatesCount === 0 ? (
              <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-full inline-flex items-center space-x-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>All Unique</span>
              </span>
            ) : (
              <button
                onClick={handleDeduplicateBoard}
                disabled={isDeduplicatingBoard}
                className="text-xs font-semibold px-2 py-0.5 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/60 rounded-full inline-flex items-center space-x-1 transition-colors"
                title="Click to remove duplicate listings"
              >
                <CopyX className="w-3 h-3 text-amber-600" />
                <span>{boardDuplicatesCount} Duplicates</span>
              </button>
            )}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage listings, import jobs from JSON, and inspect salary, location, and key highlights.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 sm:w-60 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search title, salary, area..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Load Latest Jobs from API Button */}
          <button
            id="reload-jobs-api-btn"
            onClick={handleReloadFromApi}
            disabled={isRefreshingJobs}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium text-xs sm:text-sm rounded-xl border border-indigo-200/80 transition-all shadow-sm whitespace-nowrap disabled:opacity-50"
            title="Fetch and reload latest jobs from API"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshingJobs ? 'animate-spin text-indigo-600' : 'text-indigo-600'}`} />
            <span>{isRefreshingJobs ? 'Loading...' : 'Load from API'}</span>
          </button>

          {/* Import JSON Button */}
          <button
            id="import-jobs-json-btn"
            onClick={handleOpenImportModal}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs sm:text-sm rounded-xl transition-all shadow-sm shadow-emerald-600/20 whitespace-nowrap"
            title="Import jobs from JSON array"
          >
            <FileCode className="w-4 h-4" />
            <span>Import JSON</span>
          </button>

          {/* Export to Google Sheets Button */}
          <button
            id="export-google-sheets-btn"
            onClick={() => setIsExportModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs sm:text-sm rounded-xl transition-all shadow-sm shadow-emerald-700/20 whitespace-nowrap"
            title="Export jobs to Google Sheets"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export to Google Sheets</span>
          </button>

          {/* Quick Download CSV Button */}
          <button
            id="download-jobs-csv-btn"
            onClick={() => {
              const exportList = filteredJobs.length > 0 ? filteredJobs : jobs;
              exportJobsToCSV(exportList, `jobs_export_${new Date().toISOString().slice(0, 10)}.csv`);
            }}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs sm:text-sm rounded-xl border border-slate-200 transition-all shadow-sm whitespace-nowrap"
            title="Download jobs as a CSV file (zero login or setup required)"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Download CSV</span>
          </button>

          {/* New Job Advert Button */}
          <button
            id="add-job-btn"
            onClick={handleOpenAddModal}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl transition-all shadow-sm shadow-indigo-600/20 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>New Job Advert</span>
          </button>
        </div>
      </div>

      {/* API Sync Notification Banner */}
      {apiStatusMsg && (
        <div className="mb-4 px-4 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-medium rounded-xl flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{apiStatusMsg}</span>
          </div>
          <button
            onClick={() => setApiStatusMsg(null)}
            className="text-emerald-600 hover:text-emerald-800 ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Jobs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredJobs.map((job) => {
          const hasHighlights = Array.isArray(job.highlights) && job.highlights.length > 0;
          const isExpanded = !!expandedJobHighlights[job.id];
          const empType = job.employment_type || job.employmentType;
          const hasValidUrl = job.url && job.url.trim() && job.url !== '#' && !job.url.startsWith('javascript:');

          return (
          <div
            key={job.id}
            className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                  Job #{job.id}
                </span>
                    {empType && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {empType}
                      </span>
                    )}
                  </div>

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

                <div className="space-y-2 mb-4">
                  {/* Company */}
                <div className="flex items-center text-slate-600 text-xs font-medium space-x-1.5">
                  <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{job.company}</span>
                </div>

                {/* Advertised Area Location Tag */}
                  <div className="flex items-center flex-wrap gap-1.5">
                <button
                  onClick={() => setSelectedArea(job.area || 'Remote / Global')}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200/80 transition-colors"
                  title="Filter by this area on map"
                >
                  <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>{job.area || 'Remote / Global'}</span>
                </button>
              </div>

                  {/* Salary Display if available */}
                  {job.salary && (
                    <div className="flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50/80 px-2.5 py-1 rounded-lg border border-emerald-200/60 w-fit">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600 mr-1 shrink-0" />
                      <span>{job.salary}</span>
            </div>
                  )}

                  {/* Highlights section */}
                  {hasHighlights && (
                    <div className="mt-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => toggleHighlights(job.id)}
                        className="flex items-center justify-between w-full text-left text-xs font-medium text-slate-500 hover:text-slate-700 py-1"
                      >
                        <span className="flex items-center space-x-1">
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          <span>Key Highlights ({job.highlights!.length})</span>
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </button>

                      {isExpanded && (
                        <ul className="mt-1.5 space-y-1 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          {job.highlights!.map((hl, i) => (
                            <li key={i} className="flex items-start space-x-1.5">
                              <span className="text-indigo-500 font-bold text-sm leading-none">•</span>
                              <span className="leading-tight">{hl}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 mt-2">
              <span className="flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{job.advertDate?.slice(0, 10)}</span>
              </span>

                {hasValidUrl ? (
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1 font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                  title="Open job advert URL"
                >
                  <span>Job Link</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                ) : (
                  <span className="text-[11px] text-slate-400 italic">No link specified</span>
              )}
            </div>
          </div>
          );
        })}

        {filteredJobs.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-dashed border-slate-300">
            <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium text-sm">No job adverts found.</p>
            <p className="text-xs text-slate-400 mt-1">
              Try clearing search, resetting filters, or load latest jobs directly from the API.
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                onClick={handleReloadFromApi}
                disabled={isRefreshingJobs}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs sm:text-sm rounded-xl transition-all shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshingJobs ? 'animate-spin' : ''}`} />
                <span>{isRefreshingJobs ? 'Loading...' : 'Load Latest Jobs from API'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Import JSON Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 relative max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <FileCode className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Import Jobs via JSON</h3>
                  <p className="text-xs text-slate-500">Paste JSON array of jobs with title, company, location, salary, etc.</p>
                </div>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {importError && (
              <div className="p-3 mb-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-medium border border-rose-200 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{importError}</span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">Pasted JSON Code:</label>
                <button
                  type="button"
                  onClick={() => setJsonInput(SAMPLE_JOBS_JSON)}
                  className="inline-flex items-center space-x-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Insert Sample JSON (11 Jobs)</span>
                </button>
              </div>

              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder={`[\n  {\n    "title": "Software Engineer",\n    "company": "Acme Corp",\n    "location": "Christchurch Central, Canterbury",\n    "salary": "$100k - $120k",\n    "employment_type": "Full-time",\n    "highlights": ["Great team", "Hybrid work"]\n  }\n]`}
                rows={12}
                className="w-full p-3 font-mono text-xs bg-slate-900 text-emerald-400 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />

              {/* Real-time JSON parsing status & uniqueness breakdown */}
              {jsonInput.trim() && (
                <div className="rounded-xl border p-3.5 bg-slate-50 text-xs space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-slate-700">JSON & Uniqueness Status:</span>
                    {parsedJsonResult.isValid ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center space-x-1 text-emerald-700 font-bold bg-emerald-100 px-2.5 py-0.5 rounded-full text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{analyzedJson.uniqueCount} New Unique</span>
                        </span>
                        {analyzedJson.totalDuplicates > 0 && (
                          <span className="inline-flex items-center space-x-1 text-amber-800 font-bold bg-amber-100 px-2.5 py-0.5 rounded-full text-[11px]">
                            <CopyX className="w-3.5 h-3.5" />
                            <span>{analyzedJson.totalDuplicates} Duplicates</span>
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex items-center space-x-1 text-rose-700 font-bold bg-rose-100 px-2 py-0.5 rounded-full text-[11px]">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Invalid Format</span>
                      </span>
                    )}
                  </div>

                  {parsedJsonResult.error && (
                    <p className="text-rose-600 text-[11px] font-mono">{parsedJsonResult.error}</p>
                  )}

                  {parsedJsonResult.isValid && (
                    <>
                      {/* Deduplication Controls */}
                      <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                        <label className="flex items-center space-x-2 text-xs font-semibold text-slate-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={deduplicateOption}
                            onChange={(e) => setDeduplicateOption(e.target.checked)}
                            className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                          />
                          <span>Ensure unique listings (skip duplicates)</span>
                        </label>

                        {deduplicateOption && (
                          <label className="flex items-center space-x-2 text-[11px] text-slate-600 cursor-pointer pl-6">
                            <input
                              type="checkbox"
                              checked={updateExistingOption}
                              onChange={(e) => setUpdateExistingOption(e.target.checked)}
                              className="w-3.5 h-3.5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                            />
                            <span>Enrich existing listings if duplicate found (updates missing salary & highlights)</span>
                          </label>
                        )}

                        {analyzedJson.totalDuplicates > 0 && deduplicateOption && (
                          <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200/60 pl-6">
                            ?? {analyzedJson.totalDuplicates} duplicate listing{analyzedJson.totalDuplicates === 1 ? '' : 's'} detected ({analyzedJson.duplicatesExistingCount} already on board{analyzedJson.duplicatesWithinBatchCount > 0 ? `, ${analyzedJson.duplicatesWithinBatchCount} repeated in this JSON` : ''}). {updateExistingOption ? 'Existing listings will be enriched and no duplicate rows will be created.' : 'Duplicates will be skipped so all listings remain unique.'}
                          </p>
                        )}
          </div>

                      {/* Preview of jobs to import with duplicate indicators */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-slate-500 text-[11px] font-medium">Listings Preview:</span>
                          <span className="text-slate-400 text-[10px]">
                            {analyzedJson.annotatedItems.length} jobs detected
                          </span>
                        </div>
                        <div className="max-h-44 overflow-y-auto space-y-1.5 pr-0.5">
                          {analyzedJson.annotatedItems.map((itemObj, idx) => {
                            const item = itemObj.item;
                            const isDup = itemObj.status !== 'unique';

                            return (
                              <div
                                key={idx}
                                className={`p-2.5 rounded-xl border text-[11px] flex justify-between items-center transition-all ${
                                  isDup
                                    ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                                    : 'bg-white border-slate-200 text-slate-800'
                                }`}
                              >
                                <div className="min-w-0 mr-2">
                                  <div className="font-semibold truncate">
                                    {item.title || item.jobTitle || 'Untitled'}
                                  </div>
                                  <div className="text-[10px] text-slate-500 flex items-center space-x-2">
                                    <span>{item.company}</span>
                                    <span>•</span>
                                    <span>{item.location || item.area || 'Remote / Global'}</span>
                                    {item.salary && (
                                      <>
                                        <span>•</span>
                                        <span className="text-emerald-700 font-medium">{item.salary}</span>
                                      </>
        )}
      </div>
                                </div>

                                <div className="shrink-0">
                                  {itemObj.status === 'unique' ? (
                                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      <span>New Unique</span>
                                    </span>
                                  ) : itemObj.status === 'duplicate_board' ? (
                                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full font-bold text-[10px]">
                                      <CopyX className="w-3 h-3 text-amber-600" />
                                      <span>Already on Board</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full font-bold text-[10px]">
                                      <CopyX className="w-3 h-3 text-amber-600" />
                                      <span>Repeated in JSON</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-3">
              <span className="text-xs text-slate-500">
                {parsedJsonResult.isValid
                  ? deduplicateOption
                    ? `${analyzedJson.uniqueCount} new unique job${analyzedJson.uniqueCount === 1 ? '' : 's'} will be added`
                    : `${analyzedJson.items.length} jobs will be imported`
                  : 'Paste JSON above'}
              </span>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={
                    !parsedJsonResult.isValid ||
                    isImporting ||
                    (deduplicateOption && analyzedJson.uniqueCount === 0 && !updateExistingOption)
                  }
                  onClick={handleImportSubmit}
                  className="px-5 py-2 text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-medium text-xs shadow-md shadow-emerald-600/20 inline-flex items-center space-x-1.5 transition-all"
                >
                  {isImporting ? (
                    <span>Importing...</span>
                  ) : deduplicateOption ? (
                    <>
                      <FileCode className="w-3.5 h-3.5" />
                      <span>
                        Import {analyzedJson.uniqueCount} Unique Job{analyzedJson.uniqueCount === 1 ? '' : 's'}
                        {analyzedJson.totalDuplicates > 0 ? ` (${analyzedJson.totalDuplicates} skipped)` : ''}
                      </span>
                    </>
                  ) : (
                    <>
                      <FileCode className="w-3.5 h-3.5" />
                      <span>Import All {analyzedJson.items.length} Jobs</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                  placeholder="e.g. Christchurch Central, Canterbury"
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Job Advert URL</label>
                <input
                  type="text"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://example.com/careers/job-123 (or #)"
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
      {/* Google Sheets Export Modal */}
      <ExportSheetsModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        jobs={jobs}
        filteredJobs={filteredJobs}
        selectedArea={selectedArea}
      />
    </div>
  );
};

