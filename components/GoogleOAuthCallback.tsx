import React, { useEffect, useState } from 'react';
import { Loader, CheckCircle, XCircle } from 'lucide-react';

interface GoogleOAuthCallbackProps {
  onSuccess: (email: string) => void;
  onError: (error: string) => void;
}

export const GoogleOAuthCallback: React.FC<GoogleOAuthCallbackProps> = ({ onSuccess, onError }) => {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');

        if (error) {
          throw new Error(`OAuth error: ${error}`);
        }

        if (!code) {
          throw new Error('No authorization code received');
        }

        window.history.replaceState({}, document.title, window.location.pathname);

        setMessage('Connecting to Google Calendar...');

        const event = new CustomEvent('google-oauth-code', { detail: { code } });
        window.dispatchEvent(event);

        setTimeout(() => {
          setStatus('success');
          setMessage('Successfully connected to Google Calendar!');
        }, 1000);

      } catch (err) {
        setStatus('error');
        const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
        setMessage(errorMessage);
        onError(errorMessage);
      }
    };

    if (window.location.search.includes('code=') || window.location.search.includes('error=')) {
      handleCallback();
    }
  }, [onError, onSuccess]);

  if (status === 'processing') {
    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center">
          <Loader className="animate-spin text-blue-600 mx-auto mb-4" size={48} />
          <h3 className="text-xl font-bold text-slate-800 mb-2">Connecting Calendar</h3>
          <p className="text-slate-600">{message}</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center">
          <CheckCircle className="text-green-600 mx-auto mb-4" size={48} />
          <h3 className="text-xl font-bold text-slate-800 mb-2">Success!</h3>
          <p className="text-slate-600 mb-4">{message}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center">
        <XCircle className="text-red-600 mx-auto mb-4" size={48} />
        <h3 className="text-xl font-bold text-slate-800 mb-2">Connection Failed</h3>
        <p className="text-slate-600 mb-4">{message}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-slate-600 text-white rounded-lg font-medium hover:bg-slate-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
};
