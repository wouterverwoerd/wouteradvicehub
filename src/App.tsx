import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { AdvicesView } from './components/AdvicesView';
import { EventsView } from './components/EventsView';
import { IdeasView } from './components/IdeasView';
import { JobsView } from './components/JobsView';
import { WordPressView } from './components/WordPressView';
import { UsersView } from './components/UsersView';
import { ApiExplorer } from './components/ApiExplorer';
import { User, Advice, AppEvent, Idea, Job, CombinedAdviceEvent } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [users, setUsers] = useState<User[]>([]);
  const [advices, setAdvices] = useState<Advice[]>([]);
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [combinedEvents, setCombinedEvents] = useState<CombinedAdviceEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [resUsers, resAdvices, resEvents, resIdeas, resJobs, resCombined] = await Promise.all([
        fetch('/users'),
        fetch('/advices'),
        fetch('/events'),
        fetch('/ideas'),
        fetch('/jobs'),
        fetch('/events/combined'),
      ]);

      if (!resUsers.ok || !resAdvices.ok || !resEvents.ok || !resIdeas.ok || !resJobs.ok || !resCombined.ok) {
        throw new Error('Failed to load data from Express API');
      }

      const usersData = await resUsers.json();
      const advicesData = await resAdvices.json();
      const eventsData = await resEvents.json();
      const ideasData = await resIdeas.json();
      const jobsData = await resJobs.json();
      const combinedData = await resCombined.json();

      setUsers(usersData);
      setAdvices(advicesData);
      setEvents(eventsData);
      setIdeas(ideasData);
      setJobs(jobsData);
      setCombinedEvents(combinedData);
    } catch (err: any) {
      console.error('API Fetch Error:', err);
      setError(err.message || 'Failed to connect to backend server');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between">
            <div>
              <strong>Connection Error:</strong> {error}
            </div>
            <button
              onClick={fetchAllData}
              className="px-3 py-1 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-500"
            >
              Retry
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="py-24 text-center">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-600 font-semibold text-sm">Connecting to Wouter Advice API Engine...</p>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <DashboardView
                users={users}
                advices={advices}
                events={events}
                ideas={ideas}
                jobs={jobs}
                combinedEvents={combinedEvents}
                setActiveTab={setActiveTab}
              />
            )}

            {activeTab === 'advices' && (
              <AdvicesView advices={advices} users={users} onRefresh={fetchAllData} />
            )}

            {activeTab === 'events' && (
              <EventsView
                events={events}
                advices={advices}
                users={users}
                combinedEvents={combinedEvents}
                onRefresh={fetchAllData}
              />
            )}

            {activeTab === 'ideas' && <IdeasView ideas={ideas} onRefresh={fetchAllData} />}

            {activeTab === 'jobs' && <JobsView jobs={jobs} onRefresh={fetchAllData} />}

            {activeTab === 'wordpress' && <WordPressView />}

            {activeTab === 'users' && <UsersView users={users} onRefresh={fetchAllData} />}

            {activeTab === 'api-explorer' && <ApiExplorer />}
          </>
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Wouter Advice & Event Management API — Based on wouteradvicenode</span>
          <span>Node.js Express + React SPA</span>
        </div>
      </footer>
    </div>
  );
}
