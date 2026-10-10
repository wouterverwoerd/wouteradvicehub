import { Job } from '../types';

export interface ExportSheetsResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  exportedCount: number;
}

export async function exportJobsToGoogleSheets(
  jobs: Job[],
  accessToken: string,
  customTitle?: string
): Promise<ExportSheetsResult> {
  if (!accessToken) {
    throw new Error('Google access token is required to export to Google Sheets.');
  }

  const sheetTitle = customTitle?.trim() || `Job Listings Export - ${new Date().toISOString().slice(0, 10)}`;

  // 1. Create the new Spreadsheet
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: sheetTitle,
      },
      sheets: [
        {
          properties: {
            title: 'Job Listings',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      ],
    }),
  });

  if (!createRes.ok) {
    const errorData = await createRes.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `Failed to create spreadsheet (${createRes.status} ${createRes.statusText})`
    );
  }

  const sheetInfo = await createRes.json();
  const spreadsheetId = sheetInfo.spreadsheetId;
  const spreadsheetUrl =
    sheetInfo.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  const firstSheetId = sheetInfo.sheets?.[0]?.properties?.sheetId ?? 0;

  // 2. Prepare tabular data
  const headers = [
    'Job ID',
    'Job Title',
    'Company',
    'Location / Area',
    'Salary',
    'Employment Type',
    'Key Highlights',
    'Advert Date',
    'Job Link',
  ];

  const rows = jobs.map((job) => [
    job.id,
    job.jobTitle || '',
    job.company || '',
    job.area || 'Remote / Global',
    job.salary || 'Not specified',
    job.employment_type || job.employmentType || 'Standard',
    Array.isArray(job.highlights) && job.highlights.length > 0 ? job.highlights.join('; ') : '',
    job.advertDate || '',
    job.url && job.url !== '#' ? job.url : '',
  ]);

  const allValues = [headers, ...rows];

  // 3. Write data to sheet
  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Job Listings'!A1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: "'Job Listings'!A1",
        majorDimension: 'ROWS',
        values: allValues,
      }),
    }
  );

  if (!updateRes.ok) {
    const errData = await updateRes.json().catch(() => ({}));
    throw new Error(errData.error?.message || 'Failed to populate spreadsheet rows.');
  }

  // 4. Style header row (indigo background, white bold text) & auto-size columns
  try {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: firstSheetId,
                startRowIndex: 0,
                endRowIndex: 1,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.29, green: 0.33, blue: 0.91 },
                  textFormat: {
                    bold: true,
                    foregroundColor: { red: 1.0, green: 1.0, blue: 1.0 },
                    fontSize: 11,
                  },
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)',
            },
          },
          {
            autoResizeDimensions: {
              dimensions: {
                sheetId: firstSheetId,
                dimension: 'COLUMNS',
                startIndex: 0,
                endIndex: headers.length,
              },
            },
          },
        ],
      }),
    });
  } catch (err) {
    // Styling failure is non-fatal
    console.warn('Could not apply header styling to spreadsheet:', err);
  }

  return {
    spreadsheetId,
    spreadsheetUrl,
    exportedCount: jobs.length,
  };
}
