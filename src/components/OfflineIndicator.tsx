import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff, Database } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2.5 rounded-xl bg-[#D96B43] text-[#FFFDF8] px-3.5 py-2 text-xs font-bold shadow-2xl border border-[#F7EEDB]/40 animate-bounce">
      <WifiOff className="w-4 h-4 text-[#FFFDF8]" />
      <span className="flex items-center gap-1.5 font-mono">
        <Database className="w-3.5 h-3.5" />
        Offline Mode Active: Local EOD Cache Running
      </span>
    </div>
  );
};
