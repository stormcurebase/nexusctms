
import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Clock, CheckCircle, XCircle, AlertCircle, Calendar as CalendarIcon, Edit2, Trash2, RefreshCw, Link, Check } from 'lucide-react';
import { Patient, Visit, ExternalEvent, CalendarIntegration } from '../types';

interface CalendarViewProps {
  patients: Patient[];
  onScheduleVisit: (patientId: string, visit: Omit<Visit, 'id'>) => void;
  isScheduleModalOpen: boolean;
  setIsScheduleModalOpen: (open: boolean) => void;
  externalEvents?: ExternalEvent[];
  calendarIntegration?: CalendarIntegration;
  onConnectCalendar: () => void;
  onRefreshCalendar?: () => Promise<void>;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  patients,
  onScheduleVisit,
  isScheduleModalOpen,
  setIsScheduleModalOpen,
  externalEvents = [],
  calendarIntegration,
  onConnectCalendar,
  onRefreshCalendar
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Visit Details Modal State
  const [selectedVisit, setSelectedVisit] = useState<Visit & { patientName: string, patientId: string, calculatedStatus: string } | null>(null);
  const [isVisitDetailOpen, setIsVisitDetailOpen] = useState(false);
  
  // External Event Modal
  const [selectedExternalEvent, setSelectedExternalEvent] = useState<ExternalEvent | null>(null);

  // Form State
  const [formPatientId, setFormPatientId] = useState('');
  const [formVisitName, setFormVisitName] = useState('Unscheduled Visit');
  const [formTime, setFormTime] = useState('09:00');
  const [hasConflict, setHasConflict] = useState<boolean>(false);
  
  // Syncing State
  const [isSyncing, setIsSyncing] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sunday

  // Helper to check if date is in past
  const isPastDate = (dateStr: string) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const visitDate = new Date(dateStr);
    return visitDate < today;
  };

  // Sync prop open state with internal logic, default to today if no date selected
  useEffect(() => {
    if (isScheduleModalOpen && !selectedDate) {
      const today = new Date();
      setSelectedDate(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);
    }
  }, [isScheduleModalOpen, selectedDate]);

  // Check for conflicts when form changes
  useEffect(() => {
    if (selectedDate && calendarIntegration?.isConnected) {
      const eventsOnDay = externalEvents.filter(e => e.date === selectedDate);
      setHasConflict(eventsOnDay.length > 0); // Simple day-level conflict for now
    } else {
      setHasConflict(false);
    }
  }, [selectedDate, externalEvents, calendarIntegration]);

  const allVisits = useMemo(() => {
    const visits: (Visit & { patientName: string, patientId: string, calculatedStatus: string })[] = [];
    patients.forEach(p => {
      p.visits.forEach(v => {
        // Dynamic Overdue Logic
        let calculatedStatus = v.status;
        if (v.status === 'Scheduled' && isPastDate(v.date)) {
          calculatedStatus = 'Overdue';
        }

        visits.push({ 
          ...v, 
          patientName: `${p.firstName} ${p.lastName}`, 
          patientId: p.id,
          calculatedStatus
        });
      });
    });
    return visits;
  }, [patients]);

  const getVisitsForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return allVisits.filter(v => v.date === dateStr);
  };

  const getExternalEventsForDate = (day: number) => {
    if (!calendarIntegration?.isConnected) return [];
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return externalEvents.filter(e => e.date === dateStr);
  };

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const handleDateClick = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateStr);
    setIsScheduleModalOpen(true);
  };

  const handleVisitClick = (e: React.MouseEvent, visit: Visit & { patientName: string, patientId: string, calculatedStatus: string }) => {
    e.stopPropagation();
    setSelectedVisit(visit);
    setIsVisitDetailOpen(true);
  };
  
  const handleExternalEventClick = (e: React.MouseEvent, event: ExternalEvent) => {
    e.stopPropagation();
    setSelectedExternalEvent(event);
  };

  const handleSyncClick = async () => {
    if (!onRefreshCalendar) return;
    setIsSyncing(true);
    try {
      await onRefreshCalendar();
    } catch (error) {
      console.error('Failed to sync calendar:', error);
    } finally {
      setTimeout(() => setIsSyncing(false), 500);
    }
  };

  const handleSubmitSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (formPatientId && selectedDate) {
      onScheduleVisit(formPatientId, {
        name: formVisitName,
        date: selectedDate,
        status: 'Scheduled',
        notes: `Time: ${formTime}`
      });
      setIsScheduleModalOpen(false);
      setFormPatientId('');
      setFormVisitName('Unscheduled Visit');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'Missed': return 'bg-red-100 text-red-700 border-red-200';
      case 'Overdue': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-slate-800">{monthNames[month]} {year}</h2>
          <div className="flex bg-white rounded-lg border border-slate-300 shadow-sm">
            <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-50 text-slate-600 border-r border-slate-300"><ChevronLeft size={20} /></button>
            <button onClick={handleNextMonth} className="p-2 hover:bg-slate-50 text-slate-600"><ChevronRight size={20} /></button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {calendarIntegration?.isConnected ? (
            <div className="flex items-center gap-2">
               <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 text-xs font-bold uppercase tracking-wider rounded-full border border-green-200">
                  <Check size={12} />
                  Synced
               </div>
               <button 
                onClick={handleSyncClick}
                className={`p-2 text-slate-400 hover:text-blue-600 transition-colors ${isSyncing ? 'animate-spin text-blue-600' : ''}`}
                title="Refresh Calendar"
               >
                 <RefreshCw size={16} />
               </button>
            </div>
          ) : (
            <button 
              onClick={onConnectCalendar}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 text-slate-600 text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-slate-50 hover:text-blue-600 transition-all"
            >
              <Link size={14} />
              Connect Google Calendar
            </button>
          )}
          
          <div className="h-8 w-px bg-slate-300 mx-1"></div>

          <button 
            onClick={() => {
              const today = new Date();
              setSelectedDate(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);
              setIsScheduleModalOpen(true);
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-all"
          >
            <Plus size={18} />
            <span>Schedule Visit</span>
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider border-r border-slate-100 last:border-r-0">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 auto-rows-fr min-h-[600px]">
          {/* Empty cells for previous month */}
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-slate-50/50 border-b border-r border-slate-100"></div>
          ))}

          {/* Days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const visits = getVisitsForDate(day);
            const extEvents = getExternalEventsForDate(day);
            const isToday = 
              day === new Date().getDate() && 
              month === new Date().getMonth() && 
              year === new Date().getFullYear();

            return (
              <div 
                key={day} 
                onClick={() => handleDateClick(day)}
                className={`min-h-[120px] border-b border-r border-slate-100 p-2 hover:bg-slate-50 transition-colors cursor-pointer group relative ${isToday ? 'bg-blue-50/30' : ''}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white shadow-md' : 'text-slate-700'}`}>
                    {day}
                  </span>
                </div>
                
                <div className="space-y-1">
                  {/* Study Visits */}
                  {visits.map((v, idx) => (
                    <div 
                      key={`v-${idx}`} 
                      onClick={(e) => handleVisitClick(e, v)}
                      className={`text-xs px-2 py-1 rounded border truncate flex items-center gap-1.5 cursor-pointer hover:shadow-sm hover:scale-[1.02] transition-all ${getStatusColor(v.calculatedStatus)}`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${v.calculatedStatus === 'Completed' ? 'bg-green-500' : v.calculatedStatus === 'Missed' || v.calculatedStatus === 'Overdue' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                      <span className="font-bold">{v.patientName}</span>
                    </div>
                  ))}

                  {/* External Events */}
                  {extEvents.map((e, idx) => (
                    <div
                      key={`e-${idx}`}
                      onClick={(ev) => handleExternalEventClick(ev, e)}
                      className="text-xs px-2 py-1 rounded border border-slate-200 bg-slate-100 text-slate-600 truncate flex items-center gap-1.5 cursor-pointer opacity-80 hover:opacity-100"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                      <span className="font-medium">{e.time} {e.title}</span>
                    </div>
                  ))}
                </div>

                {/* Hover Add Button */}
                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <div className="bg-blue-100 text-blue-600 p-1 rounded hover:bg-blue-200">
                     <Plus size={14} />
                   </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scheduling Modal */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <CalendarIcon className="text-blue-600" size={20} />
                Schedule Visit
              </h3>
              <button onClick={() => setIsScheduleModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <XCircle size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmitSchedule} className="p-6 space-y-4">
              {/* Conflict Warning */}
              {hasConflict && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-3">
                   <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                   <div>
                     <h4 className="text-sm font-bold text-amber-800">Schedule Conflict Detected</h4>
                     <p className="text-xs text-amber-700 mt-1">
                       You have personal/external events on this day. Please check your availability.
                     </p>
                   </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <div className="px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-600 font-medium">
                  {selectedDate}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Patient</label>
                <select 
                  required
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  value={formPatientId}
                  onChange={(e) => setFormPatientId(e.target.value)}
                >
                  <option value="">-- Choose Patient --</option>
                  {patients.filter(p => p.status === 'Active' || p.status === 'Screening' || p.status === 'Enrolled').map(p => (
                    <option key={p.id} value={p.id}>{p.firstName} {p.lastName} (ID: {p.id})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Visit Name</label>
                  <select 
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formVisitName}
                    onChange={(e) => setFormVisitName(e.target.value)}
                  >
                    <option value="Screening">Screening</option>
                    <option value="Baseline">Baseline</option>
                    <option value="Week 4">Week 4</option>
                    <option value="Week 8">Week 8</option>
                    <option value="Unscheduled">Unscheduled</option>
                  </select>
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
                   <input 
                    type="time" 
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                   />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-blue-600 rounded-lg text-white font-medium hover:bg-blue-700 shadow-sm transition-all"
                >
                  {hasConflict ? 'Schedule Anyway' : 'Confirm Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Visit Detail / Action Modal */}
      {isVisitDetailOpen && selectedVisit && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-200">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                 <h3 className="font-bold text-slate-800">Visit Details</h3>
                 <button onClick={() => setIsVisitDetailOpen(false)} className="text-slate-400 hover:text-slate-600"><XCircle size={20} /></button>
              </div>
              <div className="p-6 space-y-4">
                 <div>
                   <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Patient</div>
                   <div className="font-medium text-lg text-slate-900">{selectedVisit.patientName}</div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Date</div>
                       <div className="text-slate-800">{selectedVisit.date}</div>
                    </div>
                    <div>
                       <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Type</div>
                       <div className="text-slate-800">{selectedVisit.name}</div>
                    </div>
                 </div>
                 <div>
                    <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Status</div>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusColor(selectedVisit.calculatedStatus)}`}>{selectedVisit.calculatedStatus}</span>
                 </div>
                 
                 <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
                    <button className="w-full py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 flex items-center justify-center gap-2">
                      <CheckCircle size={16} /> Mark Completed
                    </button>
                    <button className="w-full py-2 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 flex items-center justify-center gap-2">
                      <Edit2 size={16} /> Reschedule
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* External Event Detail Modal */}
      {selectedExternalEvent && (
         <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-xs overflow-hidden animate-in zoom-in duration-150">
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                 <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                    <RefreshCw size={14} /> External Event
                 </h3>
                 <button onClick={() => setSelectedExternalEvent(null)}><XCircle size={18} className="text-slate-400" /></button>
              </div>
              <div className="p-5">
                 <div className="font-bold text-lg text-slate-800 mb-1">{selectedExternalEvent.title}</div>
                 <div className="text-sm text-slate-500 mb-3">{selectedExternalEvent.time} • {selectedExternalEvent.date}</div>
                 <div className="text-xs bg-slate-100 p-2 rounded text-slate-600">
                    Synced from {selectedExternalEvent.source} Calendar
                 </div>
              </div>
           </div>
         </div>
      )}
    </div>
  );
};
