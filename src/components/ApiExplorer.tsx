import React, { useState } from 'react';
import { Terminal, Play, Send, CheckCircle2, AlertTriangle, Code2 } from 'lucide-react';

export const ApiExplorer: React.FC = () => {
  const [method, setMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>('GET');
  const [endpoint, setEndpoint] = useState('/events/combined');
  const [requestBody, setRequestBody] = useState('{\n  "description": "New event milestone",\n  "userid": 1,\n  "adviceid": 1,\n  "eventDate": "2026-08-01",\n  "eventFilename": "milestone_report.pdf"\n}');
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseData, setResponseData] = useState<string>('Click "Execute Request" to test endpoint live...');
  const [isLoading, setIsLoading] = useState(false);
  const [executionTime, setExecutionTime] = useState<number | null>(null);

  const presets = [
    { label: 'GET Combined Events', method: 'GET', url: '/events/combined', body: '' },
    { label: 'GET All Advices', method: 'GET', url: '/advices', body: '' },
    { label: 'GET All Events', method: 'GET', url: '/events', body: '' },
    { label: 'GET All Ideas', method: 'GET', url: '/ideas', body: '' },
    { label: 'GET All Jobs', method: 'GET', url: '/jobs', body: '' },
    { label: 'GET WordPress Feed', method: 'GET', url: '/wordpress?url=https://woutertest123vw.wordpress.com/feed/', body: '' },
    { label: 'GET All Users', method: 'GET', url: '/users', body: '' },
    {
      label: 'POST Create Job Advert',
      method: 'POST',
      url: '/jobs',
      body: '{\n  "jobTitle": "Lead DevOps Engineer",\n  "advertDate": "2026-08-01 12:00:00",\n  "company": "CloudScale Inc",\n  "url": "https://careers.cloudscale.io/jobs/456"\n}',
    },
    {
      label: 'POST Create Advice',
      method: 'POST',
      url: '/advices',
      body: '{\n  "content": "New architecture guidelines",\n  "userid": "1",\n  "touserid": "2",\n  "filename": "arch_v2.pdf"\n}',
    },
    {
      label: 'POST Create Idea',
      method: 'POST',
      url: '/ideas',
      body: '{\n  "description": "Automated security scanning pipeline",\n  "ideaDate": "2026-08-01",\n  "ideaFilename": "security_pipeline.pdf"\n}',
    },
  ];

  const handleExecute = async () => {
    setIsLoading(true);
    setResponseStatus(null);
    setResponseData('Executing request...');
    const startTime = performance.now();

    try {
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if ((method === 'POST' || method === 'PUT') && requestBody.trim()) {
        options.body = requestBody;
      }

      const res = await fetch(endpoint, options);
      const endTime = performance.now();
      setExecutionTime(Math.round(endTime - startTime));
      setResponseStatus(res.status);

      const text = await res.text();
      try {
        const json = JSON.parse(text);
        setResponseData(JSON.stringify(json, null, 2));
      } catch {
        setResponseData(text);
      }
    } catch (err: any) {
      setResponseStatus(500);
      setResponseData(JSON.stringify({ error: err.message || 'Network failure' }, null, 2));
    } finally {
      setIsLoading(false);
    }
  };

  const applyPreset = (preset: typeof presets[0]) => {
    setMethod(preset.method as any);
    setEndpoint(preset.url);
    if (preset.body) setRequestBody(preset.body);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold mb-2 border border-indigo-500/30">
            <Terminal className="w-3.5 h-3.5" />
            <span>Interactive REST API Client</span>
          </div>
          <h2 className="text-xl font-bold">Express API Tester</h2>
          <p className="text-slate-400 text-xs mt-1">
            Test all Express backend routes (<code className="text-indigo-300">/users</code>, <code className="text-indigo-300">/advices</code>, <code className="text-indigo-300">/events</code>, <code className="text-indigo-300">/ideas</code>) live.
          </p>
        </div>

        {/* Presets */}
        <div className="flex flex-wrap gap-2">
          {presets.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => applyPreset(preset)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Request Panel */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
            <Send className="w-4 h-4 text-indigo-600" />
            <span>Request Builder</span>
          </h3>

          <div className="flex space-x-2">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as any)}
              className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl font-bold text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>

            <input
              type="text"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="/events/combined"
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {(method === 'POST' || method === 'PUT') && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">JSON Payload Body</label>
              <textarea
                rows={8}
                value={requestBody}
                onChange={(e) => setRequestBody(e.target.value)}
                className="w-full p-3 bg-slate-950 text-emerald-400 font-mono text-xs rounded-xl focus:outline-none border border-slate-800 leading-relaxed"
              />
            </div>
          )}

          <button
            id="execute-api-req"
            onClick={handleExecute}
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-xl transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center space-x-2"
          >
            <Play className="w-4 h-4" />
            <span>{isLoading ? 'Executing...' : 'Execute Request'}</span>
          </button>
        </div>

        {/* Response Panel */}
        <div className="bg-slate-950 text-slate-100 rounded-2xl p-6 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                <Code2 className="w-4 h-4 text-indigo-400" />
                <span>Response Console</span>
              </span>

              {responseStatus !== null && (
                <div className="flex items-center space-x-3 text-xs">
                  {executionTime !== null && (
                    <span className="text-slate-400 font-mono">{executionTime} ms</span>
                  )}
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded font-bold font-mono ${
                      responseStatus >= 200 && responseStatus < 300
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {responseStatus >= 200 && responseStatus < 300 ? (
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                    ) : (
                      <AlertTriangle className="w-3 h-3 mr-1" />
                    )}
                    {responseStatus}
                  </span>
                </div>
              )}
            </div>

            <pre className="text-xs font-mono text-emerald-400 overflow-x-auto max-h-[350px] p-2 leading-relaxed">
              {responseData}
            </pre>
          </div>

          <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-500 flex justify-between">
            <span>Server: Express (Node.js)</span>
            <span>Port: 3000</span>
          </div>
        </div>
      </div>
    </div>
  );
};
