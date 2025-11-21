
import React, { useState } from 'react';
import { FileText, Edit2, Save, ShieldCheck, Users, Plus, Trash2, Paperclip } from 'lucide-react';
import { StudyDetails, Investigator } from '../types';

interface StudyManagerProps {
  study: StudyDetails;
  onUpdateStudy: (study: StudyDetails) => void;
}

export const StudyManager: React.FC<StudyManagerProps> = ({ study, onUpdateStudy }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<StudyDetails>(study);

  const handleSave = () => {
    onUpdateStudy(formData);
    setIsEditing(false);
  };

  const handleAddInvestigator = () => {
    const newInv: Investigator = {
      id: `INV-${Date.now()}`,
      name: '',
      role: 'Sub-Investigator',
      email: ''
    };
    setFormData({
      ...formData,
      investigators: [...formData.investigators, newInv]
    });
  };

  const handleUpdateInvestigator = (index: number, field: keyof Investigator, value: string) => {
    const newInv = [...formData.investigators];
    newInv[index] = { ...newInv[index], [field]: value };
    setFormData({ ...formData, investigators: newInv });
  };

  const handleRemoveInvestigator = (index: number) => {
    const newInv = formData.investigators.filter((_, i) => i !== index);
    setFormData({ ...formData, investigators: newInv });
  };

  return (
    <div className="h-full flex flex-col gap-6 overflow-y-auto pr-2">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Study Configuration</h2>
          <p className="text-slate-500">Manage protocol details, criteria, and site staff.</p>
        </div>
        <button
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            isEditing 
              ? 'bg-green-600 text-white hover:bg-green-700' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isEditing ? <Save size={18} /> : <Edit2 size={18} />}
          {isEditing ? 'Save Changes' : 'Edit Study Details'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* General Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
              <FileText className="text-blue-500" /> Protocol Information
            </h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Protocol Number</label>
                <input 
                  type="text" 
                  disabled={!isEditing}
                  value={formData.protocolNumber}
                  onChange={(e) => setFormData({...formData, protocolNumber: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phase</label>
                <select 
                  disabled={!isEditing}
                  value={formData.phase}
                  onChange={(e) => setFormData({...formData, phase: e.target.value as any})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white disabled:bg-slate-50 disabled:text-slate-500"
                >
                  <option value="I">Phase I</option>
                  <option value="II">Phase II</option>
                  <option value="III">Phase III</option>
                  <option value="IV">Phase IV</option>
                </select>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Study Title</label>
              <input 
                type="text" 
                disabled={!isEditing}
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea 
                disabled={!isEditing}
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
              <ShieldCheck className="text-blue-500" /> Eligibility Criteria
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Inclusion Criteria</label>
                <p className="text-xs text-slate-500 mb-1">Used by AI for patient screening.</p>
                <textarea 
                  disabled={!isEditing}
                  rows={6}
                  value={formData.inclusionCriteria}
                  onChange={(e) => setFormData({...formData, inclusionCriteria: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white disabled:bg-slate-50 disabled:text-slate-500 font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Exclusion Criteria</label>
                <textarea 
                  disabled={!isEditing}
                  rows={6}
                  value={formData.exclusionCriteria}
                  onChange={(e) => setFormData({...formData, exclusionCriteria: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white disabled:bg-slate-50 disabled:text-slate-500 font-mono text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
           {/* Documents Card */}
           <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
             <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                <Paperclip className="text-blue-500" /> Study Documents
             </h3>
             <div className="space-y-2">
               {formData.files && formData.files.length > 0 ? (
                 formData.files.map((file, idx) => (
                   <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center gap-3">
                      <FileText size={20} className="text-slate-400" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-900 truncate">{file.name}</div>
                        <div className="text-xs text-slate-500 capitalize">{file.type}</div>
                      </div>
                   </div>
                 ))
               ) : (
                 <p className="text-sm text-slate-400 italic">No documents uploaded.</p>
               )}
             </div>
           </div>

           <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
             <h3 className="font-bold text-lg text-slate-800 mb-4">Site Targets</h3>
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Recruitment Target</label>
                <input 
                  type="number" 
                  disabled={!isEditing}
                  value={formData.recruitmentTarget}
                  onChange={(e) => setFormData({...formData, recruitmentTarget: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white disabled:bg-slate-50 disabled:text-slate-500"
                />
             </div>
           </div>

           <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
             <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                  <Users className="text-blue-500" /> Site Staff
                </h3>
                {isEditing && (
                  <button onClick={handleAddInvestigator} className="p-1 rounded hover:bg-slate-100 text-blue-600">
                    <Plus size={20} />
                  </button>
                )}
             </div>
             <div className="space-y-4">
               {formData.investigators.map((inv, idx) => (
                 <div key={inv.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                   {isEditing ? (
                     <div className="space-y-2">
                       <input 
                         type="text" 
                         placeholder="Name"
                         value={inv.name}
                         onChange={(e) => handleUpdateInvestigator(idx, 'name', e.target.value)}
                         className="w-full px-2 py-1 text-sm border border-slate-300 rounded"
                       />
                       <select 
                          value={inv.role}
                          onChange={(e) => handleUpdateInvestigator(idx, 'role', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-slate-300 rounded"
                       >
                         <option value="Principal Investigator">Principal Investigator</option>
                         <option value="Sub-Investigator">Sub-Investigator</option>
                         <option value="Study Coordinator">Study Coordinator</option>
                       </select>
                       <div className="flex justify-between items-center">
                         <input 
                          type="email" 
                          placeholder="Email"
                          value={inv.email}
                          onChange={(e) => handleUpdateInvestigator(idx, 'email', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-slate-300 rounded mr-2"
                         />
                         <button onClick={() => handleRemoveInvestigator(idx)} className="text-red-500">
                           <Trash2 size={16} />
                         </button>
                       </div>
                     </div>
                   ) : (
                     <div>
                       <div className="font-medium text-slate-900">{inv.name}</div>
                       <div className="text-xs text-blue-600 font-medium">{inv.role}</div>
                       <div className="text-xs text-slate-500 mt-1">{inv.email}</div>
                     </div>
                   )}
                 </div>
               ))}
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};
