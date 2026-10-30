import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Bot,
  User,
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Maximize2,
  Minimize2,
  RotateCcw,
  Sliders,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
  Copy,
  Check,
} from 'lucide-react';
import { SupportedLanguage } from '../types/market';
import { auth } from '../services/firebase';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  modelUsed?: string;
  isLiveAI?: boolean;
}

interface PersonaOption {
  id: string;
  name: string;
  description: string;
  systemInstruction: string;
  badge: string;
}

const CHAT_PERSONAS: PersonaOption[] = [
  {
    id: 'quant_strategist',
    name: 'SEBI Quant Strategist',
    description: 'Systematic technical indicators, risk-reward ratios, stop-loss calculations, and statistical arbitrage.',
    badge: 'SYSTEMATIC QUANT',
    systemInstruction: `You are "NseBse Quant AI", a senior quantitative risk manager and SEBI-registered algorithmic strategist.
Your analysis must be mathematically rigorous, focusing on:
1. Technical candlestick confirmations, RSI (14), MACD (12, 26, 9), and 20/50/200 Exponential Moving Averages on NSE & BSE scrips.
2. Exact stop-loss thresholds (e.g. 0.5% below swing low), position sizing rules, and minimum 1:2 risk-to-reward ratios.
3. Cross-exchange cash-futures spreads and liquidity metrics.
Always present recommendations with structured Markdown sections, risk warnings, and formulas where applicable.`,
  },
  {
    id: 'institutional_desk',
    name: 'Dalal Street Institutional Desk',
    description: 'FII & DII institutional cash flows, block deals, corporate earnings, and macroeconomic catalysts.',
    badge: 'INSTITUTIONAL FLOW',
    systemInstruction: `You are a Dalal Street Institutional Research Analyst tracking Foreign Institutional Investors (FII) and Domestic Mutual Fund (DII) allocation trends.
Focus on:
1. Quarterly EBITDA margins, ROCE, debt-to-equity leverage, and forward P/E multiples.
2. Sector rotation between private banks, IT exporters, energy, and capital goods.
3. RBI monetary policy impact, sovereign bond yields, and INR/USD currency dynamics.
Provide crisp, executive-grade briefs suitable for fund managers and serious equity investors.`,
  },
  {
    id: 'academy_tutor',
    name: 'Trading Academy Mentor',
    description: 'Step-by-step guidance for beginners learning candlesticks, chart anatomy, and emotion control.',
    badge: 'ACADEMY TUTOR',
    systemInstruction: `You are a patient, encouraging master trading tutor at the Indian Financial Markets Academy.
Your mission is to demystify Dalal Street for students and retail learners.
Explain candlestick anatomy (wicks, bodies, hammers, dojis, engulfing patterns) using simple analogies.
Guide learners on how to preserve capital, avoid FOMO (Fear of Missing Out), and practice safely in paper trading before risking real capital.`,
  },
  {
    id: 'arbitrage_specialist',
    name: 'NSE/BSE Arbitrage Specialist',
    description: 'Exploiting pricing inefficiencies, exchange latency, and delivery charges between NSE and BSE.',
    badge: 'ARBITRAGE DESK',
    systemInstruction: `You are an ultra-low latency Cross-Exchange Arbitrage Trader specializing in simultaneous NSE and BSE order-book spreads.
Explain:
1. Bid-ask spread differentials and how institutional algorithmic market makers compress spreads within seconds.
2. Full breakdown of statutory charges: STT (0.1%), exchange turnover fees, SEBI charges, and GST.
3. How retail investors can identify mispricings in dual-listed Indian equities.`,
  },
];

const MODEL_OPTIONS = [
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    description: 'Balanced, high-speed multimodal reasoning for general market analysis.',
    tag: 'RECOMMENDED',
  },
  {
    id: 'gemini-4-argon',
    name: 'Gemini 4 Argon',
    description: 'Deep mathematical reasoning for complex algorithmic strategies & STEM quant.',
    tag: 'COMPLEX QUANT',
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash-Lite',
    description: 'Ultra-low latency for instant rapid definitions & ticker lookup.',
    tag: 'FAST',
  },
] as const;

const QUICK_STARTER_QUESTIONS = [
  'Analyze Reliance Industries: key technical levels & ARPU catalyst',
  'How do I calculate a 1:2 risk-reward trade on Bank Nifty?',
  'Explain the Bullish Engulfing pattern with stop-loss placement',
  'What are the net transaction costs for NSE vs BSE arbitrage?',
  'How do FII and DII institutional flows affect market direction?',
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  language: SupportedLanguage;
  customApiKey?: string;
  onUpdateApiKey?: (key: string) => void;
  activeStockTicker?: string;
}

export const GeminiChatbot: React.FC<Props> = ({
  isOpen,
  onClose,
  language,
  customApiKey = '',
  onUpdateApiKey,
  activeStockTicker,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('nsebse_chat_history');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'init-1',
        role: 'assistant',
        content: ` I am **NseBse Quant AI**, 
        
I can assist you with real-time technical analysis on NSE & BSE scrips, candlestick patterns, cross-exchange arbitrage math, and institutional market intelligence.

Feel free to ask a question below or choose a starter prompt!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: 'gemini-3.8-flash',
        isLiveAI: true,
      },
    ];
  });

  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<PersonaOption>(CHAT_PERSONAS[0]);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.8-flash');
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [customModelName, setCustomModelName] = useState('');

  // API Key Configuration State
  const [showConfig, setShowConfig] = useState(false);
  const [localApiKey, setLocalApiKey] = useState(customApiKey || '');
  const [testingKey, setTestingKey] = useState(false);
  const [keyStatus, setKeyStatus] = useState<{
    tested: boolean;
    valid?: boolean;
    message?: string;
  }>({ tested: false });

  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of thread
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Persist conversation history
  useEffect(() => {
    try {
      localStorage.setItem('nsebse_chat_history', JSON.stringify(messages.slice(-30)));
    } catch {}
  }, [messages]);

  // Sync prop API key
  useEffect(() => {
    if (customApiKey && !localApiKey) {
      setLocalApiKey(customApiKey);
    }
  }, [customApiKey]);

  if (!isOpen) return null;

  const handleTestKey = async () => {
    if (!localApiKey.trim()) {
      setKeyStatus({
        tested: true,
        valid: false,
        message: 'Please enter a Gemini API Key to test.',
      });
      return;
    }

    setTestingKey(true);
    setKeyStatus({ tested: false });

    try {
      const activeModelToTest = isCustomModel && customModelName.trim() ? customModelName.trim() : selectedModel;
      const res = await fetch('/api/ai/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (await auth.currentUser?.getIdToken() || '') },
        body: JSON.stringify({
          customApiKey: localApiKey.trim(),
          model: activeModelToTest,
        }),
      });

      const data = await res.json();
      if (res.ok && data.valid) {
        setKeyStatus({
          tested: true,
          valid: true,
          message: `Key verified! Connected to ${data.modelUsed}.`,
        });
        if (onUpdateApiKey) {
          onUpdateApiKey(localApiKey.trim());
        }
      } else {
        setKeyStatus({
          tested: true,
          valid: false,
          message: data.error || 'Verification failed. Please check the key.',
        });
      }
    } catch (err: any) {
      setKeyStatus({
        tested: true,
        valid: false,
        message: err?.message || 'Network error verifying key.',
      });
    } finally {
      setTestingKey(false);
    }
  };

  const handleSendMessage = async (userPrompt?: string) => {
    const textToSend = userPrompt || inputQuery.trim();
    if (!textToSend || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newThread = [...messages, userMsg];
    setMessages(newThread);
    setInputQuery('');
    setIsLoading(true);

    try {
      const activeModel = isCustomModel && customModelName.trim() ? customModelName.trim() : selectedModel;

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newThread.map((m) => ({ role: m.role, content: m.content })),
          model: activeModel,
          customApiKey: localApiKey.trim() || undefined,
          systemInstruction: selectedPersona.systemInstruction,
          temperature: 0.7,
        }),
      });

      const data = await res.json();

      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: data.reply || 'No response generated. Please try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: data.modelUsed || activeModel,
        isLiveAI: data.isLiveAI !== false,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `I encountered a network difficulty contacting the  engine. Please check your connectivity or try again with a private API Key.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: selectedModel,
        isLiveAI: false,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    const fresh: ChatMessage[] = [
      {
        id: `init-${Date.now()}`,
        role: 'assistant',
        content: `Chat history cleared. I am ready for your next Indian equity market inquiry!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: selectedModel,
        isLiveAI: true,
      },
    ];
    setMessages(fresh);
    try {
      localStorage.removeItem('nsebse_chat_history');
    } catch {}
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div
      className={`fixed z-50 transition-all duration-300 flex flex-col bg-[#1A1816] border border-[#D96B43]/35 shadow-[0_8px_36px_rgba(0,0,0,0.85),0_0_24px_rgba(217,107,67,0.25)] overflow-hidden ${
        isExpanded
          ? 'inset-3 sm:inset-6 rounded-2xl'
          : 'bottom-4 right-4 sm:bottom-6 sm:right-6 w-[95vw] sm:w-[480px] h-[640px] max-h-[85vh] rounded-2xl'
      }`}
    >
      {/* Header Bar */}
      <div className="p-3.5 sm:p-4 bg-[#131211] border-b border-[#D96B43]/20 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-br from-[#D96B43] to-[#B85D3B] text-[#131211] shadow-md shadow-[#D96B43]/20">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm sm:text-base text-[#F7EEDB] flex items-center gap-1.5">
                <span>NseBse Quant AI</span>
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30 font-mono font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse"></span>
                {selectedModel.replace('gemini-', '')}
              </span>
            </div>
            <p className="text-[11px] text-[#F7EEDB]/60 flex items-center gap-1">
              <span>{selectedPersona.name}</span>
              <span className="text-[#D96B43]">·</span>
              <span>NSE &amp; BSE Intelligence</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Key & Model Config Toggle Button */}
          <button
            onClick={() => setShowConfig(!showConfig)}
            className={`p-1.5 rounded-lg border text-xs transition flex items-center gap-1 ${
              showConfig || localApiKey
                ? 'bg-[#D96B43]/20 border-[#D96B43] text-[#F7EEDB]'
                : 'bg-[#1A1816] border-[#D96B43]/20 text-[#F7EEDB]/70 hover:text-[#F7EEDB]'
            }`}
            title="Configure Gemini API Key & Model Settings"
          >
            <Key className="w-3.5 h-3.5 text-[#D96B43]" />
            <span className="hidden sm:inline text-[11px] font-mono">
              {localApiKey ? 'Custom Key' : 'API Key'}
            </span>
            {showConfig ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {/* Clear Chat */}
          <button
            onClick={handleClearHistory}
            className="p-1.5 rounded-lg text-[#F7EEDB]/60 hover:text-[#F7EEDB] hover:bg-[#25221F] transition"
            title="Clear Chat History"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Expand / Minimize */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-[#F7EEDB]/60 hover:text-[#F7EEDB] hover:bg-[#25221F] transition"
            title={isExpanded ? 'Restore Size' : 'Expand Fullscreen'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#F7EEDB]/60 hover:text-[#F7EEDB] hover:bg-[#25221F] transition"
            title="Close Chat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Collapsible API Key & Model Configuration Drawer */}
      {showConfig && (
        <div className="p-4 bg-[#141312] border-b border-[#D96B43]/25 space-y-3.5 text-xs animate-in slide-in-from-top-2 duration-200 shrink-0">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#F7EEDB] uppercase tracking-wider text-[11px] font-mono flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-[#D96B43]" />
              <span>Own Model API Key Setup</span>
            </span>
            <span className="text-[10px] text-[#F7EEDB]/50">Client-to-Server Proxy Protected</span>
          </div>

          {/* API Key Input Form */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={localApiKey}
                onChange={(e) => {
                  setLocalApiKey(e.target.value);
                  setKeyStatus({ tested: false });
                }}
                placeholder="AIzaSy... (Paste your API Key)"
                className="flex-1 px-3 py-2 rounded-xl bg-[#1A1816] border border-[#D96B43]/25 font-mono text-xs text-[#F7EEDB] placeholder:text-[#F7EEDB]/35 focus:outline-none focus:border-[#D96B43]"
              />

              <button
                type="button"
                onClick={handleTestKey}
                disabled={testingKey}
                className="px-3.5 py-2 rounded-xl bg-[#D96B43] hover:brightness-110 active:scale-95 text-[#131211] font-bold text-xs transition shrink-0 flex items-center gap-1"
              >
                {testingKey ? <span className="animate-spin text-sm">⟳</span> : <ShieldCheck className="w-3.5 h-3.5" />}
                <span>Test Key</span>
              </button>
            </div>

            {/* Test result status banner */}
            {keyStatus.tested && (
              <div
                className={`p-2 rounded-xl border text-[11px] flex items-center gap-2 ${
                  keyStatus.valid
                    ? 'bg-[#22C55E]/15 border-[#22C55E]/40 text-[#22C55E]'
                    : 'bg-[#EF4444]/15 border-[#EF4444]/40 text-[#EF4444]'
                }`}
              >
                {keyStatus.valid ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>{keyStatus.message}</span>
              </div>
            )}
          </div>

          {/* Model Selection */}
          <div className="space-y-1.5 pt-1">
            <label className="block text-[#F7EEDB]/70 font-semibold text-[11px]">
              Select AI Model Engine:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {MODEL_OPTIONS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setSelectedModel(m.id);
                    setIsCustomModel(false);
                    setKeyStatus({ tested: false });
                  }}
                  className={`p-2 rounded-xl text-left border transition text-[11px] ${
                    selectedModel === m.id && !isCustomModel
                      ? 'bg-[#D96B43]/25 border-[#D96B43] shadow-[0_0_10px_rgba(217,107,67,0.3)]'
                      : 'bg-[#1A1816] border-[#D96B43]/20 text-[#F7EEDB]/70 hover:text-[#F7EEDB]'
                  }`}
                >
                  <div className="font-bold text-[#F7EEDB] flex items-center justify-between">
                    <span>{m.name.replace('Gemini ', '')}</span>
                  </div>
                  <span className="text-[9px] text-[#D96B43] block mt-0.5 font-mono">{m.tag}</span>
                </button>
              ))}
            </div>

            {/* Custom Model Input Option */}
            <div className="pt-1 flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-[11px] text-[#F7EEDB]/70 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isCustomModel}
                  onChange={(e) => setIsCustomModel(e.target.checked)}
                  className="rounded accent-[#D96B43]"
                />
                <span>Use Custom Model Identifier</span>
              </label>
              {isCustomModel && (
                <input
                  type="text"
                  value={customModelName}
                  onChange={(e) => setCustomModelName(e.target.value)}
                  placeholder="e.g. gemini-2.5-flash-preview-12-2025"
                  className="flex-1 px-2.5 py-1 rounded-lg bg-[#1A1816] border border-[#D96B43]/30 font-mono text-[11px] text-[#F7EEDB]"
                />
              )}
            </div>
          </div>

          {/* AI Persona Role Selector */}
          <div className="space-y-1.5 pt-1">
            <label className="block text-[#F7EEDB]/70 font-semibold text-[11px]">
              Chatbot Persona Role:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CHAT_PERSONAS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPersona(p)}
                  className={`p-2 rounded-xl text-left border transition text-[11px] ${
                    selectedPersona.id === p.id
                      ? 'bg-[#8CB4E0]/20 border-[#8CB4E0] text-[#F7EEDB]'
                      : 'bg-[#1A1816] border-[#D96B43]/20 text-[#F7EEDB]/70 hover:text-[#F7EEDB]'
                  }`}
                >
                  <div className="font-bold text-[#F7EEDB] truncate">{p.name}</div>
                  <span className="text-[9px] text-[#8CB4E0] block mt-0.5 font-mono">{p.badge}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Scrollable Message Thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-sans">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* Avatar */}
            <div
              className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                msg.role === 'user'
                  ? 'bg-[#8CB4E0] text-[#131211]'
                  : 'bg-[#D96B43] text-[#131211] shadow-md shadow-[#D96B43]/30'
              }`}
            >
              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            {/* Bubble */}
            <div
              className={`group relative max-w-[85%] rounded-2xl p-3.5 shadow-md leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-gradient-to-br from-[#25221F] to-[#1F1C19] border border-[#8CB4E0]/30 text-[#FFFDF8]'
                  : 'bg-[#151413] border border-[#D96B43]/25 text-[#F7EEDB]'
              }`}
            >
              {/* Copy message button */}
              <button
                onClick={() => copyToClipboard(msg.content, msg.id)}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition p-1 rounded bg-[#25221F] text-[#F7EEDB]/70 hover:text-[#F7EEDB]"
                title="Copy response"
              >
                {copiedId === msg.id ? <Check className="w-3 h-3 text-[#22C55E]" /> : <Copy className="w-3 h-3" />}
              </button>

              {/* Message Content with Markdown Formatting */}
              <div className="whitespace-pre-wrap break-words space-y-1.5 text-xs">
                {msg.content.split('\n').map((line, lIdx) => {
                  if (line.startsWith('### ')) {
                    return (
                      <h4 key={lIdx} className="text-sm font-bold text-[#D96B43] mt-2 mb-1">
                        {line.replace('### ', '')}
                      </h4>
                    );
                  }
                  if (line.startsWith('**') && line.endsWith('**')) {
                    return (
                      <div key={lIdx} className="font-bold text-[#FFFDF8] mt-1">
                        {line.replace(/\*\*/g, '')}
                      </div>
                    );
                  }
                  if (line.startsWith('- ')) {
                    return (
                      <li key={lIdx} className="ml-3 list-disc text-[#F7EEDB]/90">
                        {line.replace('- ', '')}
                      </li>
                    );
                  }
                  return (
                    <p key={lIdx} className="text-[#F7EEDB]/90">
                      {line}
                    </p>
                  );
                })}
              </div>

              {/* Timestamp & Model Metadata */}
              <div className="mt-2 pt-1 border-t border-[#F7EEDB]/10 flex items-center justify-between text-[10px] text-[#F7EEDB]/45 font-mono">
                <span>{msg.timestamp}</span>
                {msg.modelUsed && (
                  <span className="text-[#D96B43]/80">
                    {msg.modelUsed}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-[#D96B43] text-[#131211] flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="p-3.5 rounded-2xl bg-[#151413] border border-[#D96B43]/20 text-xs text-[#F7EEDB]/70 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#D96B43] animate-ping"></span>
              <span>Reasoning through Indian market order books &amp; candlestick structures...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Starter Chips */}
      <div className="px-3 py-2 bg-[#141312] border-t border-[#D96B43]/15 overflow-x-auto flex items-center gap-2 shrink-0 no-scrollbar">
        {QUICK_STARTER_QUESTIONS.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(q)}
            disabled={isLoading}
            className="px-2.5 py-1 rounded-lg bg-[#1A1816] hover:bg-[#25221F] border border-[#D96B43]/20 hover:border-[#D96B43] text-[11px] text-[#F7EEDB]/80 hover:text-[#FFFDF8] whitespace-nowrap transition"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="p-3 bg-[#131211] border-t border-[#D96B43]/20 flex items-center gap-2 shrink-0"
      >
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          placeholder={`Ask ${selectedPersona.name} about stocks, technicals, or arbitrage...`}
          disabled={isLoading}
          className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#1A1816] border border-[#D96B43]/25 text-xs text-[#F7EEDB] placeholder:text-[#F7EEDB]/40 focus:outline-none focus:border-[#D96B43]"
        />

        <button
          type="submit"
          disabled={isLoading || !inputQuery.trim()}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#D96B43] to-[#B85D3B] hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-[#131211] font-bold text-xs transition flex items-center gap-1.5"
        >
          <span>Send</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
