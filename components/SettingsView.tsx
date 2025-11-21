
import React, { useState } from 'react';
import { Bell, Lock, User, Mail, Globe, Save, Bot, Mic, Sparkles, Calendar, Link, CheckCircle, RefreshCw, LogOut } from 'lucide-react';
import { ReceptionistConfig, CalendarIntegration } from '../types';

interface SettingsViewProps {
  receptionistConfig?: ReceptionistConfig;
  onUpdateConfig?: (config: ReceptionistConfig) => void;
  calendarIntegration?: CalendarIntegration;
  onUpdateIntegration?: (integration: CalendarIntegration) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ 
  receptionistConfig, 
  onUpdateConfig,
  calendarIntegration,
  onUpdateIntegration
}) => {
  const [localConfig, setLocalConfig] = useState<ReceptionistConfig>(receptionistConfig || {
    clinicName: '',
    botName: '',
    tone: 'Professional',
    customGreeting: '',
    emergencyContact: '',
    enableAfterHours: false
  });

  const [isConnecting, setIsConnecting] = useState(false);

  const handleSave = () => {
    if (onUpdateConfig) {
      onUpdateConfig(localConfig);
      alert('Settings saved successfully!');
    }
  };

  const handleConnectGoogle = () => {
    if (!onUpdateIntegration) return;
    
    setIsConnecting(true);
    // Simulate API OAuth delay
    setTimeout(() => {
      onUpdateIntegration({
        isConnected: true,
        provider: 'Google',
        accountName: 'dr.jane.doe@gmail.com',
        lastSynced: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        syncDirection: 'Two-Way'
      });
      setIsConnecting(false);
    }, 2000);
  };

  const handleDisconnect = () => {
    if (onUpdateIntegration) {
      onUpdateIntegration({
        isConnected: false,
        provider: null,
        accountName: null,
        lastSynced: null,
        syncDirection: 'Two-Way'
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 h-full overflow-y-auto pr-2 pb-10">
      
      {/* Integrations Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Link className="text-blue-600" size={22} />
                Integrations
              </h3>
              <p className="text-sm text-slate-500 mt-1">Connect external calendars to manage availability and prevent conflicts.</p>
            </div>
          </div>
        </div>
        <div className="p-6">
           <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-slate-50/50">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center border border-slate-100">
                    {/* Google Logo Mock */}
                    <svg className="w-6 h-6" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                 </div>
                 <div>
                    <h4 className="font-bold text-slate-800">Google Calendar</h4>
                    {calendarIntegration?.isConnected ? (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-medium text-green-600 flex items-center gap-1">
                           <CheckCircle size={12} /> Connected: {calendarIntegration.accountName}
                        </span>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                           <RefreshCw size={12} /> Last synced: {calendarIntegration.lastSynced}
                        </span>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">Sync your schedule to avoid conflicts.</p>
                    )}
                 </div>
              </div>
              
              <div>
                 {calendarIntegration?.isConnected ? (
                   <button 
                     onClick={handleDisconnect}
                     className="px-4 py-2 border border-red-200 text-red-600 bg-white rounded-lg text-sm font-medium hover:bg-red-50 transition-colors flex items-center gap-2"
                   >
                     <LogOut size={16} /> Disconnect
                   </button>
                 ) : (
                   <button 
                     onClick={handleConnectGoogle}
                     disabled={isConnecting}
                     className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm transition-all flex items-center gap-2 disabled:opacity-70"
                   >
                     {isConnecting ? <RefreshCw className="animate-spin" size={16} /> : <Link size={16} />}
                     {isConnecting ? 'Connecting...' : 'Connect Account'}
                   </button>
                 )}
              </div>
           </div>
        </div>
      </div>

      {/* AI Receptionist Configuration */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Bot className="text-indigo-600" size={22} />
                AI Receptionist Configuration
              </h3>
              <p className="text-sm text-slate-500 mt-1">Customize the persona, script, and behavior of your voice AI.</p>
            </div>
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
              <Sparkles size={20} />
            </div>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Clinic / Site Name</label>
              <input 
                type="text" 
                value={localConfig.clinicName}
                onChange={(e) => setLocalConfig({...localConfig, clinicName: e.target.value})}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 placeholder-slate-400" 
                placeholder="e.g. Nexus Clinical Trials"
              />
              <p className="text-xs text-slate-400 mt-1">Used in greetings and identity.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">AI Persona Name</label>
              <input 
                type="text" 
                value={localConfig.botName}
                onChange={(e) => setLocalConfig({...localConfig, botName: e.target.value})}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 placeholder-slate-400" 
                placeholder="e.g. Nexus"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Greeting Script</label>
            <textarea 
              value={localConfig.customGreeting}
              onChange={(e) => setLocalConfig({...localConfig, customGreeting: e.target.value})}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 placeholder-slate-400" 
              rows={2}
              placeholder="e.g. Thank you for calling Nexus Clinical. How can I help you?"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Conversation Tone</label>
              <select 
                value={localConfig.tone}
                onChange={(e) => setLocalConfig({...localConfig, tone: e.target.value as any})}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900"
              >
                <option value="Professional">Professional & Efficient</option>
                <option value="Empathetic">Empathetic & Patient</option>
                <option value="Energetic">Energetic & Warm</option>
                <option value="Strict">Strict & Formal</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Emergency Transfer Number</label>
              <div className="relative">
                <Mic className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input 
                  type="text" 
                  value={localConfig.emergencyContact}
                  onChange={(e) => setLocalConfig({...localConfig, emergencyContact: e.target.value})}
                  className="w-full pl-10 pr-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 placeholder-slate-400" 
                  placeholder="e.g. 911"
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">AI will refer patients here in emergencies.</p>
            </div>
          </div>
          
          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button 
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 shadow-sm transition-all"
            >
              <Save size={18} />
              Update AI Configuration
            </button>
          </div>
        </div>
      </div>

      {/* User Profile Section (Existing) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <User className="text-blue-600" size={20} />
            User Profile
          </h3>
          <p className="text-sm text-slate-500 mt-1">Manage your account information and role settings.</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <input type="text" defaultValue="Jane Doe" className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
              <input type="text" defaultValue="Clinical Lead" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 text-slate-500 cursor-not-allowed" readOnly />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                 <Mail className="absolute left-3 top-2.5 text-slate-400" size={16} />
                 <input type="email" defaultValue="jane.doe@nexus-clinical.com" className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 text-slate-500 cursor-not-allowed" readOnly />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
              <input type="tel" defaultValue="+1 (555) 123-4567" className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900" />
            </div>
          </div>
        </div>
      </div>

      <div className="pb-10"></div>
    </div>
  );
};
