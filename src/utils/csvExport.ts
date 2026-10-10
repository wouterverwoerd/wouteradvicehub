import { Job } from '../types';

/**
 * Exports jobs as a CSV file and triggers a direct browser download.
 * Requires zero authentication or Firebase configuration.
 */
export function exportJobsToCSV(jobs: Job[], customFilename?: string): void {
  const headers = [
    'Job ID',
    'Job Title',
    'Company',
    'Location',
    'Salary / Pay',
    'Employment Type',
    'Key Highlights',
    'Application URL',
    'Advert Date',
  ];

  const escapeCsv = (val: unknown): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = jobs.map((job) => [
    escapeCsv(job.id),
    escapeCsv(job.jobTitle),
    escapeCsv(job.company),
    escapeCsv(job.area || ''),
    escapeCsv(job.salary || ''),
    escapeCsv(job.employmentType || job.employment_type || ''),
    escapeCsv(Array.isArray(job.highlights) ? job.highlights.join('; ') : ''),
    escapeCsv(job.url || ''),
    escapeCsv(job.advertDate || ''),
  ]);

  const csvContent = [
    headers.map((h) => `"${h}"`).join(','),
    ...rows.map((r) => r.join(',')),
  ].join('\r\n');

  // Prepend UTF-8 BOM so Excel and spreadsheet apps render characters properly
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const filename =
    customFilename ||
    `jobs_export_${new Date().toISOString().slice(0, 10)}.csv`;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
