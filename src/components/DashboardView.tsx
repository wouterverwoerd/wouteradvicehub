import React from 'react';
import { MessageSquare, Calendar, Lightbulb, Users, Briefcase, ArrowRight, Server, FileText, Database } from 'lucide-react';
import { User, Advice, AppEvent, Idea, Job, CombinedAdviceEvent } from '../types';

interface DashboardProps {
  users: User[];
  advices: Advice[];
  events: AppEvent[];
  ideas: Idea[];
  jobs?: Job[];
  combinedEvents: CombinedAdviceEvent[];
  setActiveTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardProps> = ({
  users,
  advices,
  events,
  ideas,
  jobs = [],
  combinedEvents,
  setActiveTab,
}) => {
  const stats = [
    {
      title: 'Active Advices',
      count: advices.length,
      icon: MessageSquare,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
      tab: 'advices',
      description: 'Guidance logs & file recommendations',
    },
    {
      title: 'Logged Events',
      count: events.length,
      icon: Calendar,
      color: 'from-emerald-500 to-teal-500',
      bgColor: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
      tab: 'events',
      description: 'Timeline milestones linked to advices',
    },
    {
      title: 'Recorded Ideas',
      count: ideas.length,
      icon: Lightbulb,
      color: 'from-amber-500 to-orange-500',
      bgColor: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
      tab: 'ideas',
      description: 'Future proposals & attachments',
    },
    {
      title: 'Job Adverts',
      count: jobs.length,
      icon: Briefcase,
      color: 'from-indigo-500 to-violet-500',
      bgColor: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400',
      tab: 'jobs',
      description: 'Job advertisements & links',
    },
    {
      title: 'Registered Users',
      count: users.length,
      icon: Users,
      color: 'from-purple-500 to-indigo-500',
      bgColor: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400',
      tab: 'users',
      description: 'Admins and standard user accounts',
    },
  ];


  return (
    <div className="space-y-8">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-8 border border-slate-800 shadow-xl">
        <div className="relative z-10 max-w-3xl">

          <div className="flex flex-wrap gap-3">
            <button
              id="dash-explore-advices"
              onClick={() => setActiveTab('advices')}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-lg shadow-indigo-600/30"
            >
              <span>Manage Advices</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              id="dash-explore-combined"
              onClick={() => setActiveTab('events')}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm transition-all border border-slate-700"
            >
              <Database className="w-4 h-4 text-emerald-400" />
              <span>View Combined Events</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              id={`stat-card-${stat.tab}`}
              onClick={() => setActiveTab(stat.tab)}
              className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-3xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  {stat.count}
                </span>
              </div>
              <h3 className="font-semibold text-slate-800 text-base">{stat.title}</h3>
              <p className="text-xs text-slate-500 mt-1">{stat.description}</p>
            </div>
          );
        })}
      </div>

      {/* Quick Overview Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Advices */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
              <h3 className="font-semibold text-slate-900 text-lg">Recent Advices</h3>
            </div>
            <button
              onClick={() => setActiveTab('advices')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center space-x-1"
            >
              <span>View All ({advices.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {advices.slice(0, 3).map((advice) => {
              const sender = users.find((u) => String(u.id) === advice.userid);
              const recipient = users.find((u) => String(u.id) === advice.touserid);

              return (
                <div
                  key={advice.id}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-all"
                >
                  <p className="text-sm font-medium text-slate-800 line-clamp-2">{advice.content}</p>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-medium">
                        From: {sender ? `${sender.firstName} ${sender.lastName}` : `User #${advice.userid}`}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-medium">
                        To: {recipient ? `${recipient.firstName} ${recipient.lastName}` : `User #${advice.touserid}`}
                      </span>
                    </div>
                    <span className="font-mono text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                      📎 {advice.filename}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Combined Relational Snapshot */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <Database className="w-5 h-5 text-emerald-600" />
              <h3 className="font-semibold text-slate-900 text-lg">Combined Relational Snapshot</h3>
            </div>
          </div>

          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
            The API combines Advices with their associated Event records directly via nested grouping logic:
          </p>

          <div className="space-y-3">
            {combinedEvents.slice(0, 2).map((item) => (
              <div key={item.adviceID} className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-100">
                <div className="flex items-center justify-between text-xs font-semibold text-emerald-900 mb-1">
                  <span>Advice #{item.adviceID}</span>
                  <span className="bg-emerald-200/60 text-emerald-800 px-2 py-0.5 rounded">
                    {item.Events.length} Linked Event{item.Events.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-xs text-slate-700 line-clamp-1 italic mb-2">"{item.adviceDescription}"</p>
                {item.Events.length > 0 && (
                  <div className="pl-3 border-l-2 border-emerald-300 space-y-1">
                    {item.Events.map((ev) => (
                      <div key={ev.eventID} className="text-xs text-slate-600 flex justify-between">
                        <span className="truncate max-w-[160px]">• {ev.eventDescription}</span>
                        <span className="text-slate-400 font-mono text-[10px]">{ev.eventDate}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={() => setActiveTab('events')}
            className="w-full mt-4 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
          >
            Open Complete Combined View
          </button>
        </div>
      </div>
    </div>
  );
};
