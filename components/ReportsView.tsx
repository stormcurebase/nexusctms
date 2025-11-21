
import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, FileText, PlusCircle, X, Save } from 'lucide-react';
import { Patient, AdverseEvent } from '../types';
import { MOCK_SITES } from '../constants';

interface ReportsViewProps {
  patients: Patient[];
  onReportAE: (patientId: string, ae: Omit<AdverseEvent, 'id'>) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ patients, onReportAE }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<'Mild' | 'Moderate' | 'Severe' | 'Life-Threatening'>('Mild');
  const [dateReported, setDateReported] = useState(new Date().toISOString().split('T')[0]);

  const adverseEvents = patients.flatMap(p => 
    p.adverseEvents.map(ae => ({ ...ae, patientId: p.id, patientName: `${p.firstName} ${p.lastName}` }))
  );

  const sitePerformance = MOCK_SITES.map(site => {
    const sitePatients = patients.filter(p => p.siteId === site.id);
    return {
      ...site,
      patientCount: sitePatients.length,
      activeCount: sitePatients.filter(p => p.status === 'Active').length,
      aeCount: sitePatients.reduce((acc, p) => acc + p.adverseEvents.length, 0)
    };
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPatientId && description) {
      onReportAE(selectedPatientId, {
        description,
        severity,
        dateReported,
        status: 'Ongoing'
      });
      setIsModalOpen(false);
      // Reset form
      setDescription('');
      setSeverity('Mild');
      setSelectedPatientId('');
    }
  };

  return (
    <div className="space-y-6 h-full overflow-y-auto pr-2">
      
      {/* Site Performance Summary */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50">
           <h3 className="text-lg font-bold text-slate-800">Site Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3 text-left">Site Name</th>
                <th className="px-6 py-3 text-left">Location</th>
                <th className="px-6 py-3 text-left">Investigator</th>
                <th className="px-6 py-3 text-center">Total Pts</th>
                <th className="px-6 py-3 text-center">Active Pts</th>
                <th className="px-6 py-3 text-center">AEs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sitePerformance.map(site => (
                <tr key={site.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{site.name}</td>
                  <td className="px-6 py-4 text-slate-600 text-sm">{site.location}</td>
                  <td className="px-6 py-4 text-slate-600 text-sm">{site.principalInvestigator}</td>
                  <td className="px-6 py-4 text-center font-medium text-blue-600">{site.patientCount}</td>
                  <td className="px-6 py-4 text-center font-medium text-green-600">{site.activeCount}</td>
                  <td className="px-6 py-4 text-center font-medium text-amber-600">{site.aeCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adverse Events Log */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
           <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
             <AlertTriangle className="text-amber-500" size={20} />
             Adverse Events Log
           </h3>
           <div className="flex gap-3">
             <button className="text-sm text-blue-600 font-medium hover:underline flex items-center gap-1">
               <FileText size={16} /> Export PDF
             </button>
             <button 
               onClick={() => setIsModalOpen(true)}
               className="text-sm bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 shadow-sm transition-all"
             >
               <PlusCircle size={16} /> Report AE
             </button>
           </div>
        </div>
        <div className="overflow-x-auto">
          {adverseEvents.length > 0 ? (
            <table className="w-full">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3 text-left">Date</th>
                  <th className="px-6 py-3 text-left">Patient</th>
                  <th className="px-6 py-3 text-left">Description</th>
                  <th className="px-6 py-3 text-left">Severity</th>
                  <th className="px-6 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {adverseEvents.map((ae, idx) => (
                  <tr key={`${ae.patientId}-${idx}`} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-slate-600 text-sm">{ae.dateReported}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{ae.patientName} <span className="text-slate-400 text-xs font-normal">({ae.patientId})</span></td>
                    <td className="px-6 py-4 text-slate-700">{ae.description}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        ae.severity === 'Severe' || ae.severity === 'Life-Threatening' 
                          ? 'bg-red-100 text-red-800' 
                          : ae.severity === 'Moderate' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {ae.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {ae.status === 'Resolved' 
                          ? <CheckCircle size={16} className="text-green-500" /> 
                          : <AlertTriangle size={16} className="text-amber-500" />
                        }
                        <span className="text-sm text-slate-700">{ae.status}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-slate-400 italic">
              No adverse events reported across the study.
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-amber-50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <AlertTriangle className="text-amber-600" size={20} />
                Report Adverse Event
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Patient</label>
                <select 
                  required
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                >
                  <option value="">-- Choose Patient --</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.firstName} {p.lastName} (ID: {p.id})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Event Description</label>
                <textarea 
                  required
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  rows={3}
                  placeholder="Describe the event..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Severity</label>
                   <select 
                     className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                     value={severity}
                     onChange={(e) => setSeverity(e.target.value as any)}
                   >
                     <option value="Mild">Mild</option>
                     <option value="Moderate">Moderate</option>
                     <option value="Severe">Severe</option>
                     <option value="Life-Threatening">Life-Threatening</option>
                   </select>
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Date Reported</label>
                   <input 
                    type="date" 
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                    value={dateReported}
                    onChange={(e) => setDateReported(e.target.value)}
                   />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-amber-600 rounded-lg text-white font-medium hover:bg-amber-700 shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
