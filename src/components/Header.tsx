import React, { useState, useEffect } from 'react';
import { Lightbulb, MessageSquare, Calendar, Users, Briefcase, Globe, Terminal, LayoutDashboard, ShieldCheck, Database } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; engine: string; config?: any } | null>(null);

  useEffect(() => {
    fetch('/api/db-status')
      .then((res) => res.json())
      .then((data) => setDbStatus(data))
      .catch(() => setDbStatus({ connected: false, engine: 'MySQL' }));
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'advices', label: 'Advices', icon: MessageSquare },
    { id: 'events', label: 'Events & Combined', icon: Calendar },
    { id: 'ideas', label: 'Ideas', icon: Lightbulb },
    { id: 'jobs', label: 'Jobs', icon: Briefcase },
    { id: 'wordpress', label: 'WordPress', icon: Globe },
    { id: 'users', label: 'User Directory', icon: Users },
    { id: 'api-explorer', label: 'API Explorer', icon: Terminal },
  ];

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-lg leading-tight tracking-tight text-slate-100">
                Wouter Advice Hub
              </h1>
              <p className="text-xs text-slate-400">Node.js Express & MySQL Sequelize Engine</p>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center space-x-2">
            {dbStatus && (
              <span
                title={
                  dbStatus.connected
                    ? `Connected to MySQL DB (${dbStatus.config?.database}@${dbStatus.config?.host})`
                    : 'MySQL credentials active. Fallback memory mode active until database server is reached.'
                }
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                  dbStatus.connected
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                }`}
              >
                <Database className="w-3.5 h-3.5 mr-1.5" />
                <span>{dbStatus.connected ? 'MySQL Active' : 'MySQL Engine (Ready)'}</span>
              </span>
            )}
          </div>
        </div>

        {/* Mobile Nav */}
        <div className="md:hidden flex overflow-x-auto py-2 space-x-1 border-t border-slate-800 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                  isActive ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
