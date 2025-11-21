
import React, { useState } from 'react';
import { LayoutDashboard, Users, Calendar, Settings, Activity, ClipboardList, BookOpen, ChevronDown, PlusCircle, Check } from 'lucide-react';
import { StudyDetails } from '../types';

interface SidebarProps {
  activeView: string;
  onChangeView: (view: string) => void;
  studies: StudyDetails[];
  currentStudyId: string;
  onSwitchStudy: (id: string) => void;
  onAddStudy: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeView, 
  onChangeView,
  studies,
  currentStudyId,
  onSwitchStudy,
  onAddStudy
}) => {
  const [isStudyMenuOpen, setIsStudyMenuOpen] = useState(false);
  const currentStudy = studies.find(s => s.id === currentStudyId) || studies[0];

  const menuItems = [
    { id: 'dashboard', label: 'Site Dashboard', icon: LayoutDashboard },
    { id: 'study', label: 'Study Protocol', icon: BookOpen },
    { id: 'patients', label: 'Patients', icon: Users },
    { id: 'visits', label: 'Visits Schedule', icon: Calendar },
    { id: 'reports', label: 'Site Reports', icon: ClipboardList },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-full shadow-xl z-10 border-r border-slate-800">
      {/* Header / Brand */}
      <div className="p-6 flex items-center gap-3 border-b border-slate-800 bg-slate-950">
        <div className="p-2 bg-blue-600 rounded-lg text-white shadow-lg shadow-blue-500/20">
          <Activity size={24} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Nexus<span className="text-blue-500">CTMS</span></h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Site Edition</p>
        </div>
      </div>

      {/* Study Switcher */}
      <div className="px-3 py-4 border-b border-slate-800">
        <div className="relative">
          <button 
            onClick={() => setIsStudyMenuOpen(!isStudyMenuOpen)}
            className="w-full text-left bg-slate-800/50 hover:bg-slate-800 p-3 rounded-lg border border-slate-700 flex items-center justify-between transition-all"
          >
            <div className="overflow-hidden">
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Active Study</p>
              <p className="text-sm font-bold text-white truncate">{currentStudy?.protocolNumber}</p>
            </div>
            <ChevronDown size={16} className={`transition-transform ${isStudyMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {isStudyMenuOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 rounded-xl border border-slate-700 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in duration-150">
              <div className="max-h-64 overflow-y-auto py-1">
                {studies.map(study => (
                  <button
                    key={study.id}
                    onClick={() => {
                      onSwitchStudy(study.id);
                      setIsStudyMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-slate-700 flex items-center justify-between group"
                  >
                    <div>
                      <div className="text-sm font-bold text-white">{study.protocolNumber}</div>
                      <div className="text-xs text-slate-400 truncate max-w-[140px]">{study.title}</div>
                    </div>
                    {study.id === currentStudyId && <Check size={16} className="text-blue-400" />}
                  </button>
                ))}
              </div>
              <div className="border-t border-slate-700 p-2 bg-slate-900/50">
                <button 
                  onClick={() => {
                    onAddStudy();
                    setIsStudyMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 text-xs font-bold text-blue-400 hover:text-white hover:bg-blue-600 p-2 rounded-lg transition-all"
                >
                  <PlusCircle size={14} /> ADD NEW STUDY
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 px-3">Main Menu</div>
        {menuItems.map((item) => {
          const isActive = activeView === item.id || (activeView === 'patient-detail' && item.id === 'patients');
          return (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' 
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon size={20} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-white transition-colors'} />
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Settings & User */}
      <div className="p-4 border-t border-slate-800 bg-slate-950">
        <button 
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800 hover:text-white transition-all mb-2 ${
             activeView === 'settings' ? 'text-white bg-slate-800' : 'text-slate-400'
          }`}
          onClick={() => onChangeView('settings')}
        >
          <Settings size={20} />
          <span className="font-medium text-sm">Site Settings</span>
        </button>
        <div className="mt-4 flex items-center gap-3 px-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-xs shadow-inner">
            SC
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">Sarah Chen</p>
            <p className="text-xs text-slate-500 truncate">Study Coordinator</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
