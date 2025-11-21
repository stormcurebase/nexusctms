
import React, { useState } from 'react';
import { X, Upload, FileText, Loader2, CheckCircle, BrainCircuit } from 'lucide-react';
import { StudyDetails } from '../types';
import { extractStudyFromProtocol } from '../services/geminiService';

interface AddStudyModalProps {
  onClose: () => void;
  onAdd: (study: StudyDetails) => void;
}

export const AddStudyModal: React.FC<AddStudyModalProps> = ({ onClose, onAdd }) => {
  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [fileContent, setFileContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  
  const [formData, setFormData] = useState<Partial<StudyDetails>>({
    protocolNumber: '',
    title: '',
    phase: 'II',
    sponsor: '',
    description: '',
    inclusionCriteria: '',
    exclusionCriteria: '',
    recruitmentTarget: 50,
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      setFileContent(text);
      
      try {
        const extracted = await extractStudyFromProtocol(text);
        if (extracted) {
          setFormData(prev => ({
            ...prev,
            ...extracted,
            recruitmentTarget: extracted.recruitmentTarget || 50
          }));
          setStep('review');
        } else {
          alert("Could not extract details. Please fill manually.");
          setStep('review');
        }
      } catch (err) {
        console.error(err);
        alert("Error processing file.");
        setStep('review');
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const handleLoadSample = async () => {
    setIsLoading(true);
    setFileName("sample-protocol.txt");
    const sampleText = `
      PROTOCOL: NEURO-X101
      TITLE: Phase III Study of NX-500 in Early Onset Alzheimer's Disease
      SPONSOR: NeuroGen Therapeutics
      PHASE: III
      
      DESCRIPTION:
      A randomized, double-blind, placebo-controlled study to assess safety and efficacy of NX-500 (50mg daily) in subjects with early-onset AD.
      
      INCLUSION CRITERIA:
      1. Age 45-65 years inclusive.
      2. Diagnosis of probable AD according to NIA-AA criteria.
      3. MMSE score 20-26.
      4. Stable caregiver available.
      
      EXCLUSION CRITERIA:
      1. History of major stroke or TIA.
      2. Unstable psychiatric disease.
      3. Contraindication to MRI.
      4. Participating in another trial.
      
      TARGET RECRUITMENT: 150 subjects.
    `;
    setFileContent(sampleText);
    
    try {
      const extracted = await extractStudyFromProtocol(sampleText);
      if (extracted) {
        setFormData(prev => ({
          ...prev,
          ...extracted,
          recruitmentTarget: extracted.recruitmentTarget || 150
        }));
        setStep('review');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualEntry = () => {
    setStep('review');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newStudy: StudyDetails = {
      id: `STUDY-${Date.now()}`,
      status: 'Active',
      investigators: [],
      files: fileName ? [{ name: fileName, type: 'protocol', content: fileContent }] : [],
      ...formData as StudyDetails
    };
    onAdd(newStudy);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in duration-200">
        
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <BrainCircuit className="text-blue-600" size={24} />
            New Study Configuration
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 'upload' ? (
            <div className="space-y-8 text-center py-10">
              <div className="max-w-md mx-auto">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                   <Upload size={40} className="text-blue-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Upload Protocol Document</h2>
                <p className="text-slate-500 mb-8">
                  Upload your clinical protocol (txt, md) to automatically extract study details, criteria, and metadata using AI.
                </p>
                
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center gap-3 text-blue-600">
                    <Loader2 className="animate-spin" size={32} />
                    <span className="font-medium">Analyzing protocol document...</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <label className="block w-full p-4 border-2 border-dashed border-slate-300 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group">
                      <input type="file" className="hidden" accept=".txt,.md" onChange={handleFileUpload} />
                      <span className="text-blue-600 font-medium group-hover:underline">Choose a file</span>
                      <span className="text-slate-400"> or drag and drop</span>
                    </label>
                    
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                      <div className="relative flex justify-center"><span className="bg-white px-2 text-sm text-slate-400">OR</span></div>
                    </div>

                    <button 
                      onClick={handleLoadSample}
                      className="w-full py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors"
                    >
                      Load Sample Protocol (Test AI)
                    </button>

                    <button 
                      onClick={handleManualEntry}
                      className="text-slate-600 font-medium hover:text-slate-900"
                    >
                      Enter Details Manually
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
               {fileName && (
                 <div className="bg-green-50 text-green-700 px-4 py-2 rounded-lg text-sm flex items-center gap-2 mb-4">
                   <CheckCircle size={16} />
                   Data extracted from <strong>{fileName}</strong>
                 </div>
               )}

               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Protocol Number</label>
                   <input 
                    required
                    type="text" 
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.protocolNumber}
                    onChange={e => setFormData({...formData, protocolNumber: e.target.value})}
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Sponsor</label>
                   <input 
                    required
                    type="text" 
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.sponsor}
                    onChange={e => setFormData({...formData, sponsor: e.target.value})}
                   />
                 </div>
               </div>

               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Study Title</label>
                 <input 
                  required
                  type="text" 
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                 />
               </div>

               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Phase</label>
                   <select 
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.phase}
                    onChange={e => setFormData({...formData, phase: e.target.value as any})}
                   >
                     <option value="I">Phase I</option>
                     <option value="II">Phase II</option>
                     <option value="III">Phase III</option>
                     <option value="IV">Phase IV</option>
                   </select>
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Recruitment Target</label>
                   <input 
                    type="number" 
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.recruitmentTarget}
                    onChange={e => setFormData({...formData, recruitmentTarget: parseInt(e.target.value)})}
                   />
                 </div>
               </div>
               
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Inclusion Criteria</label>
                 <textarea 
                  rows={4}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
                  value={formData.inclusionCriteria}
                  onChange={e => setFormData({...formData, inclusionCriteria: e.target.value})}
                 />
               </div>

               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Exclusion Criteria</label>
                 <textarea 
                  rows={4}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
                  value={formData.exclusionCriteria}
                  onChange={e => setFormData({...formData, exclusionCriteria: e.target.value})}
                 />
               </div>

               <div className="flex gap-3 pt-4">
                 <button type="button" onClick={() => setStep('upload')} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                   Back
                 </button>
                 <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium shadow-sm">
                   Create Study
                 </button>
               </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
