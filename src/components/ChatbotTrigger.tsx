import React from 'react';
import { Bot, Sparkles, MessageSquare } from 'lucide-react';

interface Props {
  onClick: () => void;
  isOpen: boolean;
}

export const ChatbotTrigger: React.FC<Props> = ({ onClick, isOpen }) => {
  if (isOpen) return null;

  return (
    <button
      onClick={onClick}
      className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-40 group flex items-center gap-2.5 p-3.5 sm:px-4 sm:py-3 rounded-2xl bg-gradient-to-r from-[#D96B43] via-[#C45E37] to-[#B85D3B] text-[#131211] font-bold text-xs shadow-[0_6px_28px_rgba(217,107,67,0.45)] hover:shadow-[0_8px_36px_rgba(217,107,67,0.65)] hover:brightness-110 active:scale-95 transition-all duration-300 border border-[#FFFDF8]/30"
      title="Open NseBse Gemini Quant Chatbot"
    >
      <div className="relative">
        <Bot className="w-5 h-5 text-[#131211]" />
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#22C55E] border-2 border-[#131211] animate-ping" />
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#22C55E] border-2 border-[#131211]" />
      </div>

      <div className="text-left hidden sm:block">
        <div className="font-extrabold tracking-tight text-[#131211] flex items-center gap-1 leading-none">
          <span>AI Quant Chatbot</span>
          <Sparkles className="w-3 h-3 text-[#131211]" />
        </div>
        <span className="text-[10px] text-[#131211]/80 font-mono font-medium block mt-0.5">
          Gemini 3.8 &amp; 4 Argon
        </span>
      </div>
    </button>
  );
};
