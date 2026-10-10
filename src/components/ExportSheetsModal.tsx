import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  X,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { Job } from '../types';
import {
  initAuth,
  googleSignIn,
  getAccessToken,
  getCurrentUser,
  logoutGoogle,
} from '../services/googleAuth';
import { exportJobsToGoogleSheets, ExportSheetsResult } from '../services/googleSheets';
import { User } from 'firebase/auth';

interface ExportSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobs: Job[];
  filteredJobs: Job[];
  selectedArea: string | null;
}

export const ExportSheetsModal: React.FC<ExportSheetsModalProps> = ({
  isOpen,
  onClose,
  jobs,
  filteredJobs,
  selectedArea,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(getCurrentUser());
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [exportResult, setExportResult] = useState<ExportSheetsResult | null>(null);

  const [exportMode, setExportMode] = useState<'filtered' | 'all'>('all');
  const [sheetTitle, setSheetTitle] = useState(
    `Job Advertisements - ${new Date().toISOString().slice(0, 10)}`
  );

  useEffect(() => {
    if (!isOpen) {
      setExportResult(null);
      setErrorMsg(null);
      return;
    }

    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setAccessToken(token);
      },
      () => {
        setCurrentUser(null);
        setAccessToken(null);
      }
    );

    getAccessToken().then((token) => {
      if (token) setAccessToken(token);
    });

    return () => unsubscribe();
  }, [isOpen]);

  if (!isOpen) return null;

  const targetJobs = exportMode === 'filtered' ? filteredJobs : jobs;

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setErrorMsg(null);
    try {
      const res = await googleSignIn();
      setCurrentUser(res.user);
      setAccessToken(res.accessToken);
    } catch (err: any) {
      setErrorMsg(err.message || 'Google sign in failed');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await logoutGoogle();
    setCurrentUser(null);
    setAccessToken(null);
    setExportResult(null);
  };

  const handleExport = async () => {
    if (!accessToken) {
      setErrorMsg('Please connect your Google account first.');
      return;
    }

    if (targetJobs.length === 0) {
      setErrorMsg('No jobs available to export.');
      return;
    }

    setIsExporting(true);
    setErrorMsg(null);

    try {
      const result = await exportJobsToGoogleSheets(targetJobs, accessToken, sheetTitle);
      setExportResult(result);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to export to Google Sheets.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Export to Google Sheets</h3>
              <p className="text-xs text-slate-500">Create a formatted spreadsheet in your Google Drive</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 mb-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-medium border border-rose-200 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Export Success View */}
          {exportResult ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900">Export Complete!</h4>
              <p className="text-xs text-slate-600">
                Successfully exported <strong>{exportResult.exportedCount} jobs</strong> to Google Sheets.
              </p>
              <div className="pt-2">
                <a
                  href={exportResult.spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all"
                >
                  <span>Open in Google Sheets</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          ) : (
            <>
              {/* Account Connection Section */}
              {!currentUser || !accessToken ? (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-center space-y-3">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-800">Google Account Required</p>
                    <p className="text-xs text-slate-500">
                      Sign in with Google to allow creating and updating spreadsheets in your Google Drive with your permission.
                    </p>
                  </div>

                  {/* Official Google Sign-In Button */}
                  <button
                    type="button"
                    onClick={handleSignIn}
                    disabled={isSigningIn}
                    className="inline-flex items-center justify-center space-x-2.5 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-xl border border-slate-300 shadow-sm transition-all hover:shadow cursor-pointer disabled:opacity-60"
                  >
                    {isSigningIn ? (
                      <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 48 48">
                        <path
                          fill="#EA4335"
                          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                        />
                        <path
                          fill="#4285F4"
                          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                        />
                        <path
                          fill="#34A853"
                          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                        />
                      </svg>
                    )}
                    <span>{isSigningIn ? 'Connecting...' : 'Sign in with Google'}</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl text-xs">
                  <div className="flex items-center space-x-2">
                    {currentUser.photoURL ? (
                      <img
                        src={currentUser.photoURL}
                        alt="Profile"
                        className="w-7 h-7 rounded-full border border-emerald-300"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center font-bold">
                        <UserIcon className="w-4 h-4" />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-slate-800">
                        {currentUser.displayName || currentUser.email}
                      </p>
                      <p className="text-[11px] text-slate-500">Google Account Connected</p>
                    </div>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="inline-flex items-center space-x-1 text-slate-500 hover:text-rose-600 p-1 rounded-lg text-[11px]"
                    title="Disconnect Google Account"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Disconnect</span>
                  </button>
                </div>
              )}

              {/* Spreadsheet Details Form */}
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Spreadsheet Title</label>
                  <input
                    type="text"
                    value={sheetTitle}
                    onChange={(e) => setSheetTitle(e.target.value)}
                    placeholder="e.g. Job Listings - October 2026"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Which jobs to export?</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setExportMode('all')}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        exportMode === 'all'
                          ? 'border-emerald-500 bg-emerald-50/50 text-emerald-900 font-semibold'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <p className="font-bold">All Jobs</p>
                      <p className="text-[11px] opacity-75">{jobs.length} total listings</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExportMode('filtered')}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        exportMode === 'filtered'
                          ? 'border-emerald-500 bg-emerald-50/50 text-emerald-900 font-semibold'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <p className="font-bold">Current Filtered View</p>
                      <p className="text-[11px] opacity-75">{filteredJobs.length} listings {selectedArea ? `(${selectedArea})` : ''}</p>
                    </button>
                  </div>
                </div>

                {/* Explicit confirmation notice */}
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] space-y-1">
                  <p className="font-bold">Confirmation Notice:</p>
                  <p>
                    Exporting will create a new Google Sheet named &ldquo;<strong>{sheetTitle}</strong>&rdquo; in your Google Drive containing <strong>{targetJobs.length} rows</strong> with Job ID, Title, Company, Location, Salary, Employment Type, Key Highlights, and Links.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium text-xs"
          >
            {exportResult ? 'Close' : 'Cancel'}
          </button>

          {!exportResult && (
            <button
              type="button"
              disabled={!accessToken || isExporting || targetJobs.length === 0}
              onClick={handleExport}
              className="px-5 py-2 text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold text-xs shadow-md shadow-emerald-600/20 inline-flex items-center space-x-1.5"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Exporting to Sheets...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Export {targetJobs.length} Jobs</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
