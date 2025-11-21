
import React, { useState, useRef, useEffect } from 'react';
import { Search, UserPlus, FileText, ChevronRight, ArrowLeft, Activity, Calendar, AlertTriangle, BrainCircuit, Save, X, Camera, CheckCircle, UserCheck, UserX, MapPin } from 'lucide-react';
import { Patient, PatientStatus, Gender, StudyDetails, EligibilityResult } from '../types';
import { checkEligibility, extractPatientFromText, extractPatientFromImage } from '../services/geminiService';
import { MOCK_SITES } from '../constants';

interface PatientManagerProps {
  patients: Patient[];
  studyDetails: StudyDetails;
  onAddPatient: (patient: Patient) => void;
  onUpdatePatient: (patient: Patient) => void;
  selectedPatientId: string | null;
  setSelectedPatientId: (id: string | null) => void;
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;
}

export const PatientManager: React.FC<PatientManagerProps> = ({ 
  patients, 
  studyDetails, 
  onAddPatient, 
  onUpdatePatient,
  selectedPatientId,
  setSelectedPatientId,
  isAddModalOpen,
  setIsAddModalOpen
}) => {
  
  // AI Import State
  const [aiTab, setAiTab] = useState<'text' | 'camera'>('text');
  const [referralText, setReferralText] = useState('');
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  
  // Camera State
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Manual Form State
  const [manualForm, setManualForm] = useState({
    firstName: '',
    lastName: '',
    dob: '',
    gender: Gender.MALE,
    address: '',
    siteId: MOCK_SITES[0].id,
    history: ''
  });

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  // Eligibility Check State
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(false);

  const handleAIImportText = async () => {
    if (!referralText.trim()) return;
    setIsProcessingAI(true);
    try {
      const extractedData = await extractPatientFromText(referralText);
      if (extractedData) {
        populateForm(extractedData);
        setReferralText('');
      }
    } catch (error) {
      alert("Failed to extract patient data.");
    } finally {
      setIsProcessingAI(false);
    }
  };

  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera. Please check permissions.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const base64Image = canvas.toDataURL('image/jpeg');
        stopCamera();
        
        setIsProcessingAI(true);
        try {
          const extractedData = await extractPatientFromImage(base64Image);
          if (extractedData) {
            populateForm(extractedData);
          } else {
            alert("Could not extract information from image. Please try again.");
          }
        } catch (e) {
          console.error(e);
          alert("Processing failed.");
        } finally {
          setIsProcessingAI(false);
        }
      }
    }
  };

  const populateForm = (data: any) => {
     const aiFirstName = data.firstName || '';
     const aiMiddleName = data.middleName ? ` ${data.middleName}` : '';

     setManualForm(prev => ({
       ...prev,
       firstName: (aiFirstName + aiMiddleName).trim() || prev.firstName,
       lastName: data.lastName || prev.lastName,
       dob: data.dateOfBirth || prev.dob,
       gender: data.gender || prev.gender,
       address: data.address || prev.address,
       history: data.medicalHistorySummary || prev.history
     }));
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.firstName || !manualForm.lastName || !manualForm.dob) return;

    const newPatient: Patient = {
      id: `105-${Math.floor(Math.random() * 1000)}`,
      firstName: manualForm.firstName,
      lastName: manualForm.lastName,
      dateOfBirth: manualForm.dob,
      gender: manualForm.gender,
      address: manualForm.address,
      status: PatientStatus.SCREENING,
      siteId: manualForm.siteId,
      studyId: studyDetails.id,
      medicalHistorySummary: manualForm.history,
      visits: [],
      adverseEvents: [],
      enrollmentDate: '' // Not enrolled yet
    };

    onAddPatient(newPatient);
    setManualForm({
      firstName: '',
      lastName: '',
      dob: '',
      gender: Gender.MALE,
      address: '',
      siteId: MOCK_SITES[0].id,
      history: ''
    });
    setIsAddModalOpen(false);
  };

  const handleCheckEligibility = async () => {
    if (!selectedPatient) return;
    setIsCheckingEligibility(true);
    
    const protocolContext = `
      INCLUSION: ${studyDetails.inclusionCriteria}
      EXCLUSION: ${studyDetails.exclusionCriteria}
    `;

    try {
      const result = await checkEligibility(selectedPatient.medicalHistorySummary || '', protocolContext);
      
      // Construct Eligibility Result Object
      const analysis: EligibilityResult = {
        isEligible: result.eligible === 'Yes',
        confidenceScore: result.eligible === 'Yes' ? 90 : 50,
        reasoning: result.reasoning,
        flaggedCriteria: [],
        timestamp: new Date().toLocaleDateString()
      };

      // Save to patient
      const updatedPatient = {
        ...selectedPatient,
        eligibilityAnalysis: analysis
      };
      onUpdatePatient(updatedPatient);

    } catch (error) {
      console.error(error);
    } finally {
      setIsCheckingEligibility(false);
    }
  };

  const handleEnrollPatient = () => {
    if (!selectedPatient) return;
    onUpdatePatient({
      ...selectedPatient,
      status: PatientStatus.ACTIVE,
      enrollmentDate: new Date().toISOString().split('T')[0]
    });
  };

  const handleScreenFail = () => {
    if (!selectedPatient) return;
    onUpdatePatient({
      ...selectedPatient,
      status: PatientStatus.SCREEN_FAILED
    });
  };

  // Clean up camera on modal close
  useEffect(() => {
    if (!isAddModalOpen) {
      stopCamera();
      setIsCameraActive(false);
    }
  }, [isAddModalOpen]);

  if (selectedPatientId && selectedPatient) {
    return (
      <div className="bg-white h-full flex flex-col rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Patient Detail Header */}
        <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                setSelectedPatientId(null);
              }}
              className="p-2 rounded-full hover:bg-slate-200 text-slate-600 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                {selectedPatient.firstName} {selectedPatient.lastName} 
                <span className="text-sm font-normal px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-600 border border-slate-300">
                  {selectedPatient.id}
                </span>
              </h2>
              <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                <span className="flex items-center gap-1"><Calendar size={14} /> DOB: {selectedPatient.dateOfBirth}</span>
                <span>|</span>
                <span>{selectedPatient.gender}</span>
                <span>|</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  selectedPatient.status === 'Active' ? 'bg-green-100 text-green-700' : 
                  selectedPatient.status === 'Screening' ? 'bg-blue-100 text-blue-700' : 
                  selectedPatient.status === 'Screen Failed' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {selectedPatient.status}
                </span>
              </div>
            </div>
          </div>
          
          {/* Actions Bar */}
          <div className="flex gap-2">
            {selectedPatient.status === PatientStatus.SCREENING && (
              <>
                <button 
                  onClick={handleCheckEligibility}
                  disabled={isCheckingEligibility}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-indigo-200 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-all disabled:opacity-50 font-medium"
                >
                  <BrainCircuit size={18} />
                  {isCheckingEligibility ? 'Analyzing...' : 'Check Eligibility'}
                </button>
                
                <button 
                  onClick={handleScreenFail}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-all font-medium"
                >
                  <UserX size={18} />
                  Fail
                </button>

                <button 
                  onClick={handleEnrollPatient}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-sm font-medium"
                >
                  <UserCheck size={18} />
                  Enroll Patient
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Eligibility Result Card */}
          {selectedPatient.eligibilityAnalysis ? (
            <div className={`mb-6 p-5 rounded-xl border-l-4 shadow-sm transition-all ${
                selectedPatient.eligibilityAnalysis.isEligible 
                ? 'bg-green-50/50 border-green-500' 
                : 'bg-amber-50/50 border-amber-500'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className={`font-bold text-lg flex items-center gap-2 ${selectedPatient.eligibilityAnalysis.isEligible ? 'text-green-800' : 'text-amber-800'}`}>
                  {selectedPatient.eligibilityAnalysis.isEligible ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                  AI Analysis: {selectedPatient.eligibilityAnalysis.isEligible ? 'Eligible' : 'Review Required'}
                </h3>
                <span className="text-xs text-slate-400 font-mono bg-white/50 px-2 py-1 rounded">
                   {selectedPatient.eligibilityAnalysis.timestamp}
                </span>
              </div>
              <p className="text-slate-700 leading-relaxed">{selectedPatient.eligibilityAnalysis.reasoning}</p>
              
              {selectedPatient.status === PatientStatus.SCREENING && selectedPatient.eligibilityAnalysis.isEligible && (
                 <div className="mt-4 pt-4 border-t border-slate-200/60 flex items-center gap-2">
                    <div className="text-sm text-slate-500 italic flex-1">Patient appears to meet criteria. Proceed to enrollment?</div>
                    <button onClick={handleEnrollPatient} className="text-sm font-bold text-green-700 hover:text-green-800 hover:underline">Confirm Enrollment</button>
                 </div>
              )}
            </div>
          ) : (
             // Call to action if no analysis exists
             selectedPatient.status === PatientStatus.SCREENING && (
                <div className="mb-6 p-6 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/30 flex flex-col items-center justify-center text-center gap-2">
                   <BrainCircuit className="text-indigo-400" size={32} />
                   <h3 className="text-indigo-900 font-bold">AI Screening Analysis</h3>
                   <p className="text-sm text-indigo-700/80 max-w-md">Run the AI Eligibility Check to analyze this patient's medical history against the {studyDetails.protocolNumber} protocol criteria.</p>
                   <button onClick={handleCheckEligibility} className="mt-2 text-sm font-bold text-indigo-600 hover:text-indigo-800 underline">Run Analysis Now</button>
                </div>
             )
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Contact & Address */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <MapPin size={18} className="text-blue-500" /> Contact Details
                 </h3>
              </div>
              <div className="space-y-3">
                 <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="text-xs text-slate-500 font-medium mb-0.5">Address</div>
                    <div className="text-sm text-slate-900">{selectedPatient.address || "No address on file"}</div>
                 </div>
                 <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="text-xs text-slate-500 font-medium mb-0.5">Email</div>
                    <div className="text-sm text-slate-900">{selectedPatient.contactEmail || "No email"}</div>
                 </div>
              </div>
            </div>

            {/* Medical History */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <FileText size={18} className="text-blue-500" /> Medical History
                </h3>
                <button className="text-xs text-blue-600 font-medium hover:underline">Edit</button>
              </div>
              <p className="text-slate-600 leading-relaxed text-sm bg-slate-50 p-4 rounded-lg border border-slate-100 min-h-[100px]">
                {selectedPatient.medicalHistorySummary || "No history recorded."}
              </p>
            </div>

            {/* Recent Visits */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm lg:col-span-2">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Calendar size={18} className="text-blue-500" /> Visit History
              </h3>
              <div className="space-y-3">
                {selectedPatient.visits.length === 0 ? (
                  <p className="text-sm text-slate-400 italic p-4 text-center bg-slate-50 rounded-lg">No visits recorded.</p>
                ) : (
                  selectedPatient.visits.map((v, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <div>
                        <div className="font-medium text-slate-900">{v.name}</div>
                        <div className="text-xs text-slate-500">{v.date}</div>
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded ${
                        v.status === 'Completed' ? 'bg-green-100 text-green-700' : 
                        v.status === 'Scheduled' ? 'bg-blue-100 text-blue-700' : 
                        v.status === 'Overdue' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {v.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Patient List View
  return (
    <div className="bg-white h-full flex flex-col rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <h2 className="text-xl font-bold text-slate-800">Patient Directory</h2>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search patients..." 
              className="pl-10 pr-4 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm w-64 transition-all"
            />
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-all"
          >
            <UserPlus size={18} />
            <span>Add Patient</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full">
          <thead className="bg-slate-50 sticky top-0 z-10">
            <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <th className="p-4">ID</th>
              <th className="p-4">Name</th>
              <th className="p-4">Status</th>
              <th className="p-4">Site</th>
              <th className="p-4">Next Visit</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {patients.map((patient) => {
              const nextVisit = patient.visits.find(v => v.status === 'Scheduled');
              return (
                <tr key={patient.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="p-4 font-medium text-slate-900">{patient.id}</td>
                  <td className="p-4 text-slate-600 font-medium">{patient.lastName}, {patient.firstName}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                      patient.status === 'Active' ? 'bg-green-100 text-green-800' :
                      patient.status === 'Screening' ? 'bg-blue-100 text-blue-800' :
                      patient.status === 'Withdrawn' || patient.status === 'Screen Failed' ? 'bg-red-100 text-red-800' :
                      'bg-slate-100 text-slate-800'
                    }`}>
                      {patient.status}
                    </span>
                  </td>
                  <td className="p-4 text-slate-500 text-sm">{patient.siteId}</td>
                  <td className="p-4 text-sm text-slate-500">
                    {nextVisit ? (
                      <div className="flex items-center gap-1 text-blue-600">
                        <Calendar size={14} />
                        {nextVisit.date}
                      </div>
                    ) : '-'}
                  </td>
                  <td className="p-4">
                    <button 
                      onClick={() => setSelectedPatientId(patient.id)}
                      className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      View Details <ChevronRight size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Patient Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto animate-in fade-in zoom-in duration-200 flex flex-col">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center sticky top-0 z-20">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <UserPlus className="text-blue-600" size={24} />
                Add New Patient
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                 <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-8">
              {/* AI Section */}
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg overflow-hidden shadow-sm">
                <div className="flex border-b border-indigo-200">
                  <button 
                    onClick={() => { setAiTab('text'); stopCamera(); }}
                    className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${aiTab === 'text' ? 'bg-indigo-100 text-indigo-900' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100/50'}`}
                  >
                    <FileText size={16} /> Paste Text
                  </button>
                  <button 
                    onClick={() => { setAiTab('camera'); }}
                    className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${aiTab === 'camera' ? 'bg-indigo-100 text-indigo-900' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100/50'}`}
                  >
                    <Camera size={16} /> Scan Driver's License
                  </button>
                </div>
                
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3 text-indigo-900 font-bold text-sm">
                    <BrainCircuit size={16} className="text-indigo-600" />
                    {aiTab === 'text' ? 'Option 1: AI Text Extraction' : 'Option 2: AI ID Scanner'}
                  </div>

                  {aiTab === 'text' ? (
                    <>
                      <p className="text-xs text-indigo-700 mb-3">
                        Paste a referral email or clinical notes. Gemini will extract demographics and history.
                      </p>
                      <textarea
                        className="w-full p-3 border border-indigo-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white focus:bg-white transition-all"
                        rows={3}
                        placeholder="e.g., Referred: John Doe, 45yo male, hist of hypertension..."
                        value={referralText}
                        onChange={(e) => setReferralText(e.target.value)}
                      ></textarea>
                      <div className="flex justify-end mt-3">
                         <button 
                          onClick={handleAIImportText}
                          disabled={isProcessingAI || !referralText}
                          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                         >
                           {isProcessingAI ? <Activity className="animate-spin" size={16}/> : <BrainCircuit size={16}/>}
                           {isProcessingAI ? 'Processing...' : 'Auto-Fill Form'}
                         </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center">
                      {!isCameraActive ? (
                         <div className="w-full h-48 bg-slate-200 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-slate-300 mb-3">
                            <Camera size={40} className="text-slate-400 mb-2" />
                            <p className="text-sm text-slate-500 mb-4">Camera is inactive</p>
                            <button 
                              onClick={startCamera}
                              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                              Start Camera
                            </button>
                         </div>
                      ) : (
                        <div className="relative w-full h-64 bg-black rounded-lg overflow-hidden mb-3">
                           <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover"></video>
                           <canvas ref={canvasRef} className="hidden"></canvas>
                           <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                              <button 
                                onClick={stopCamera}
                                className="p-3 rounded-full bg-red-500/80 text-white hover:bg-red-600 transition-colors"
                              >
                                <X size={20} />
                              </button>
                              <button 
                                onClick={capturePhoto}
                                className="p-3 rounded-full bg-white text-indigo-600 shadow-lg hover:bg-slate-100 transition-colors border-4 border-indigo-600/30"
                              >
                                <Camera size={28} />
                              </button>
                           </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Manual Form */}
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="John"
                      value={manualForm.firstName}
                      onChange={(e) => setManualForm({...manualForm, firstName: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Doe"
                      value={manualForm.lastName}
                      onChange={(e) => setManualForm({...manualForm, lastName: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                   <input 
                      type="text" 
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="123 Main St, City, State, Zip"
                      value={manualForm.address}
                      onChange={(e) => setManualForm({...manualForm, address: e.target.value})}
                   />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
                  <input 
                    required
                    type="date" 
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={manualForm.dob}
                    onChange={(e) => setManualForm({...manualForm, dob: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
                    <select 
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={manualForm.gender}
                      onChange={(e) => setManualForm({...manualForm, gender: e.target.value as Gender})}
                    >
                      <option value={Gender.MALE}>Male</option>
                      <option value={Gender.FEMALE}>Female</option>
                      <option value={Gender.OTHER}>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Site Assignment</label>
                    <select 
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={manualForm.siteId}
                      onChange={(e) => setManualForm({...manualForm, siteId: e.target.value})}
                    >
                      {MOCK_SITES.map(site => (
                        <option key={site.id} value={site.id}>{site.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Medical History Summary</label>
                  <textarea 
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    rows={3}
                    placeholder="Relevant medical conditions..."
                    value={manualForm.history}
                    onChange={(e) => setManualForm({...manualForm, history: e.target.value})}
                  />
                </div>

                <div className="pt-4 flex gap-3">
                   <button 
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                   >
                     Cancel
                   </button>
                   <button 
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-blue-600 rounded-lg text-white font-medium hover:bg-blue-700 shadow-sm transition-all flex items-center justify-center gap-2"
                   >
                     <Save size={18} />
                     Create Patient
                   </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
