
import React, { useMemo, useState } from 'react';
import { Users, Activity, Calendar, AlertTriangle, UserPlus, MessageSquare, CheckCircle, Clock, Bell, ChevronRight, ChevronDown, Target, FileText, Upload, Stethoscope, FilePlus, TrendingUp } from 'lucide-react';
import { Patient, TaskAlert, StudyDetails } from '../types';

interface DashboardProps {
  patients: Patient[];
  alerts: TaskAlert[];
  studyDetails: StudyDetails;
  onChangeView: (view: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ patients, alerts, studyDetails, onChangeView }) => {
  const [isActionCenterExpanded, setIsActionCenterExpanded] = useState(true);

  const activePatients = patients.filter(p => p.status === 'Active').length;
  const screeningPatients = patients.filter(p => p.status === 'Screening').length;
  const enrolledCount = patients.filter(p => ['Active', 'Completed', 'Enrolled'].includes(p.status)).length;
  
  const allVisits = patients.flatMap(p => p.visits);
  const upcomingVisits = allVisits.filter(v => {
    const visitDate = new Date(v.date);
    const today = new Date();
    today.setHours(0,0,0,0);
    return v.status === 'Scheduled' && visitDate >= today;
  }).length;

  const adverseEvents = patients.flatMap(p => p.adverseEvents).length;
  const recruitmentPercent = studyDetails.recruitmentTarget > 0 ? Math.min(100, Math.round((enrolledCount / studyDetails.recruitmentTarget) * 100)) : 0;

  // Generate Enrollment Trend Data
  const enrollmentTrend = useMemo(() => {
    const months: Record<string, number> = {};
    // Initialize last 6 months
    for(let i=5; i>=0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toLocaleString('default', { month: 'short' });
      months[key] = 0;
    }

    patients.forEach(p => {
      if (p.enrollmentDate) {
        const d = new Date(p.enrollmentDate);
        const key = d.toLocaleString('default', { month: 'short' });
        if (months[key] !== undefined) {
          months[key]++;
        }
      }
    });
    
    // Cumulative sum
    let sum = 0;
    return Object.entries(months).map(([month, count]) => {
      sum += count;
      return { month, count: sum };
    });
  }, [patients]);

  // Simple SVG Chart generation
  const maxVal = Math.max(...enrollmentTrend.map(d => d.count), 10); // Min scale 10
  const points = enrollmentTrend.map((d, i) => {
    const x = (i / (enrollmentTrend.length - 1)) * 100;
    const y = 100 - (d.count / maxVal) * 80; // 80% height usage
    return `${x},${y}`;
  }).join(' ');

  const getAlertIcon = (category: string) => {
    switch(category) {
      case 'Adverse Event': return <AlertTriangle size={18} className="text-red-600" />;
      case 'New Patient': return <UserPlus size={18} className="text-blue-600" />;
      case 'Appointment': return <Calendar size={18} className="text-purple-600" />;
      case 'Inquiry': return <MessageSquare size={18} className="text-amber-600" />;
      default: return <Bell size={18} className="text-slate-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'High': return 'bg-red-100 text-red-700 border-red-200';
      case 'Medium': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="h-full flex flex-col gap-6 overflow-y-auto pr-2 pb-10">
      
      {/* Action Center / Visual Voicemail */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-200">
        <button 
          onClick={() => setIsActionCenterExpanded(!isActionCenterExpanded)}
          className="w-full p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center hover:bg-slate-100 transition-colors group"
        >
          <div className="flex items-center gap-2">
            <Bell className="text-blue-600 group-hover:scale-110 transition-transform" size={20} />
            <span className="text-lg font-bold text-slate-800">Site Action Center</span>
            {alerts.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold animate-pulse shadow-sm">
                {alerts.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-slate-500">
             <span className="text-xs font-medium uppercase tracking-wider hidden sm:inline">Tasks & Alerts</span>
             <ChevronDown size={16} className={`transition-transform duration-200 ${isActionCenterExpanded ? 'rotate-180' : ''}`} />
          </div>
        </button>
        
        {isActionCenterExpanded && (
          <div className="divide-y divide-slate-100 max-h-[350px] overflow-y-auto bg-white animate-in slide-in-from-top-2 duration-200">
            {alerts.length === 0 ? (
               <div className="p-8 text-center text-slate-400">
                  <CheckCircle className="mx-auto mb-2 text-slate-300" size={32} />
                  <p>All caught up! No new tasks.</p>
               </div>
            ) : (
              alerts.map((alert) => (
                <div key={alert.id} className="p-4 hover:bg-slate-50 transition-colors flex gap-4 items-start group cursor-pointer border-l-4 border-transparent hover:border-blue-500">
                  <div className={`p-2 rounded-lg shrink-0 ${alert.category === 'Adverse Event' ? 'bg-red-50' : 'bg-blue-50'}`}>
                    {getAlertIcon(alert.category)}
                  </div>
                  <div className="flex-1 min-w-0">
                     <div className="flex justify-between items-start mb-1">
                        <h4 className="font-semibold text-slate-900 text-sm">{alert.category}</h4>
                        <span className="text-xs text-slate-400 flex items-center gap-1 shrink-0">
                          <Clock size={12} /> {alert.timestamp}
                        </span>
                     </div>
                     <p className="text-slate-600 text-sm line-clamp-2">{alert.message}</p>
                     {alert.patientId && (
                       <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                            Patient ID: {alert.patientId}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getPriorityColor(alert.priority)}`}>
                            {alert.priority} Priority
                          </span>
                       </div>
                     )}
                  </div>
                  <button className="opacity-0 group-hover:opacity-100 p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-all shrink-0">
                    <ChevronRight size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Quick Actions Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <button onClick={() => onChangeView('patients')} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex items-center gap-3 text-left group">
            <div className="p-3 rounded-full bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
               <UserPlus size={20} />
            </div>
            <div>
               <p className="font-bold text-slate-800">Add Patient</p>
               <p className="text-xs text-slate-500">Register & Screen</p>
            </div>
         </button>
         <button onClick={() => onChangeView('visits')} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex items-center gap-3 text-left group">
            <div className="p-3 rounded-full bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
               <Calendar size={20} />
            </div>
            <div>
               <p className="font-bold text-slate-800">Schedule Visit</p>
               <p className="text-xs text-slate-500">Calendar & Slots</p>
            </div>
         </button>
         <button onClick={() => onChangeView('study')} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex items-center gap-3 text-left group">
            <div className="p-3 rounded-full bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
               <Upload size={20} />
            </div>
            <div>
               <p className="font-bold text-slate-800">Upload Docs</p>
               <p className="text-xs text-slate-500">Protocol or Source</p>
            </div>
         </button>
         <button onClick={() => onChangeView('reports')} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex items-center gap-3 text-left group">
            <div className="p-3 rounded-full bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
               <FilePlus size={20} />
            </div>
            <div>
               <p className="font-bold text-slate-800">Report AE</p>
               <p className="text-xs text-slate-500">Log Adverse Event</p>
            </div>
         </button>
      </div>

      {/* Top Study Summary Card */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-6 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">
            <FileText size={14} />
            <span>Active Protocol</span>
          </div>
          <h2 className="text-2xl font-bold mb-1 flex items-center gap-3">
            {studyDetails.protocolNumber} 
            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${studyDetails.status === 'Active' ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-slate-600 text-slate-300'}`}>
              {studyDetails.status}
            </span>
          </h2>
          <p className="text-lg text-slate-100 font-medium mb-1">{studyDetails.title}</p>
          <p className="text-slate-400 text-sm max-w-3xl line-clamp-1">{studyDetails.description}</p>
        </div>
        <div className="text-right pl-6 border-l border-slate-700">
           <div className="text-4xl font-bold text-white">{enrolledCount} <span className="text-xl text-slate-500 font-normal">/ {studyDetails.recruitmentTarget}</span></div>
           <p className="text-xs text-slate-400 uppercase font-bold tracking-widest mt-1">Recruitment Goal</p>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
            <Users size={24} />
          </div>
          <div>
            <p className="text-slate-500 text-sm font-medium">Active Patients</p>
            <h3 className="text-2xl font-bold text-slate-900">{activePatients}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
            <Calendar size={24} />
          </div>
          <div>
            <p className="text-slate-500 text-sm font-medium">Upcoming Visits</p>
            <h3 className="text-2xl font-bold text-slate-900">{upcomingVisits}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-lg">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-slate-500 text-sm font-medium">Adverse Events</p>
            <h3 className="text-2xl font-bold text-slate-900">{adverseEvents}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg">
            <Stethoscope size={24} />
          </div>
          <div>
            <p className="text-slate-500 text-sm font-medium">In Screening</p>
            <h3 className="text-2xl font-bold text-slate-900">{screeningPatients}</h3>
          </div>
        </div>
      </div>

      {/* Recruitment Trend Chart & Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp className="text-blue-600" size={20} />
              Enrollment Trend
            </h3>
            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">Last 6 Months</span>
          </div>
          <div className="h-40 w-full flex items-end justify-between gap-2 px-2 relative">
             {/* SVG Line Chart */}
             <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgb(37, 99, 235)" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="rgb(37, 99, 235)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path 
                  d={`M0,100 ${points.split(' ').map(p => `L${p}`).join(' ')} L100,100 Z`} 
                  fill="url(#lineGradient)" 
                />
                <polyline 
                  points={points} 
                  fill="none" 
                  stroke="rgb(37, 99, 235)" 
                  strokeWidth="3" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
                {enrollmentTrend.map((d, i) => {
                   const x = (i / (enrollmentTrend.length - 1)) * 100;
                   const y = 100 - (d.count / maxVal) * 80;
                   return (
                     <circle key={i} cx={`${x}%`} cy={`${y}%`} r="4" fill="white" stroke="rgb(37, 99, 235)" strokeWidth="2" />
                   );
                })}
             </svg>
             
             {/* X-Axis Labels */}
             {enrollmentTrend.map((d, i) => (
               <div key={i} className="flex flex-col items-center justify-end h-full z-10 w-8 group">
                  <div className="mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] px-2 py-1 rounded absolute -top-4 whitespace-nowrap">
                    {d.count} Patients
                  </div>
                  <span className="text-xs text-slate-400 font-medium mt-2 pt-2 border-t border-slate-100 w-full text-center">{d.month}</span>
               </div>
             ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-center">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Target className="text-blue-600" size={20} />
            Target Progress
          </h3>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-4xl font-bold text-slate-900">{recruitmentPercent}%</span>
            <span className="text-sm text-slate-500 mb-1.5">of goal reached</span>
          </div>
          
          <div className="w-full bg-slate-100 rounded-full h-3 mb-6 overflow-hidden">
            <div 
              className="bg-blue-600 h-3 rounded-full transition-all duration-1000 ease-out" 
              style={{ width: `${recruitmentPercent}%` }}
            ></div>
          </div>

          <div className="space-y-3">
             <div className="flex justify-between text-sm border-b border-slate-50 pb-2">
                <span className="text-slate-500">Current Enrollment</span>
                <span className="font-bold text-slate-900">{enrolledCount}</span>
             </div>
             <div className="flex justify-between text-sm border-b border-slate-50 pb-2">
                <span className="text-slate-500">Study Target</span>
                <span className="font-bold text-slate-900">{studyDetails.recruitmentTarget}</span>
             </div>
             <div className="flex justify-between text-sm pt-1">
                <span className="text-slate-500">Remaining</span>
                <span className="font-bold text-blue-600">{Math.max(0, studyDetails.recruitmentTarget - enrolledCount)}</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
