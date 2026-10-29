import React, { useState, useRef, useEffect } from 'react';
import { User, PlatformConfig } from '../types';
import { formatBs } from '../utils/formatters';
import { 
  Bot, MessageSquare, Send, X, Sparkles, AlertTriangle, ShieldCheck, 
  ExternalLink, ChevronRight, HelpCircle, PhoneCall, RefreshCw, UserCheck
} from 'lucide-react';

interface AIAssistantSupportProps {
  currentUser: User | null;
  config: PlatformConfig;
  isOpen: boolean;
  onClose: () => void;
  onOpenDeposit: () => void;
  onOpenWithdraw: () => void;
}

interface SupportChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  escalateToWhatsApp?: boolean;
  whatsappUrl?: string;
}

const FREQUENT_QUESTIONS = [
  '¿Por qué no se me ha acreditado mi dinero?',
  '¿Cómo recargar por Pago Móvil?',
  '¿Cómo se calculan las ganancias de cada caballo?',
  '¿A qué hora cierran las carreras por la noche?',
  '¿Cómo retiro mis bolívares ganados?',
  'Necesito hablar urgente con el propietario Juan Sandoval',
];

export const AIAssistantSupport: React.FC<AIAssistantSupportProps> = ({
  currentUser,
  config,
  isOpen,
  onClose,
  onOpenDeposit,
  onOpenWithdraw,
}) => {
  const [messages, setMessages] = useState<SupportChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      content: `¡Hola ${currentUser ? currentUser.name : 'amigo'}! Soy el **Asistente Personal de Inteligencia Artificial de JeyhBet**. Estoy entrenado con todas las reglas operativas de Juan Sandoval para responder preguntas, guiarte en tus recargas por Pago Móvil, retiros, reglas de carreras y solucionar cualquier inconveniente de inmediato. ¿En qué te puedo ayudar hoy?`,
      timestamp: Date.now(),
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  if (!isOpen) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputPrompt).trim();
    if (!text || isLoading) return;

    const userMsg: SupportChatMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputPrompt('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/support/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory.map(m => ({ role: m.role, content: m.content })),
          userProfile: currentUser ? {
            name: `${currentUser.name} ${currentUser.lastName}`.trim(),
            cedula: currentUser.cedula,
            phone: currentUser.phone,
            balance: currentUser.balance,
          } : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();

      const aiMsg: SupportChatMessage = {
        id: `ai_${Date.now()}`,
        role: 'model',
        content: data.reply || 'Disculpe la molestia, estoy para servirle.',
        timestamp: Date.now(),
        escalateToWhatsApp: data.escalateToWhatsApp,
        whatsappUrl: data.whatsappUrl,
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error('Error in AI support client:', err);
      // Fallback response with WhatsApp escalation
      const encodedMsg = encodeURIComponent(
        `Hola Juan Sandoval, soy ${currentUser ? currentUser.name : 'un usuario de JeyhBet'}. Me comunico por soporte: "${text}"`
      );
      const fallbackMsg: SupportChatMessage = {
        id: `ai_${Date.now()}`,
        role: 'model',
        content: 'Entiendo su mensaje. Para brindarle una solución directa y que su caso sea revisado manualmente de inmediato, puede comunicarse directamente con nuestro propietario Juan Sandoval a su WhatsApp personal (+58 4221475717).',
        timestamp: Date.now(),
        escalateToWhatsApp: true,
        whatsappUrl: `https://wa.me/584221475717?text=${encodedMsg}`,
      };
      setMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickQuestion = (question: string) => {
    handleSendMessage(question);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-amber-500/50 rounded-3xl max-w-xl w-full h-[90vh] max-h-[720px] flex flex-col shadow-2xl overflow-hidden ring-1 ring-amber-400/20">
        
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 shadow-md">
                <Bot className="w-6 h-6 stroke-[2.2]" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-950 animate-pulse" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white font-racing tracking-wide uppercase">
                  ASISTENTE IA JEYHBET
                </h3>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-mono font-bold px-2 py-0.5 rounded border border-amber-500/40">
                  SOPORTE 24/7
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Respuestas inteligentes y escalamiento directo al propietario Juan Sandoval
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Propietario Direct Contact Bar */}
        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-amber-300">
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Contacto directo del Propietario: <strong>+58 4221475717</strong></span>
          </div>
          <a
            href={`https://wa.me/584221475717?text=${encodeURIComponent(
              `Hola Juan Sandoval, me comunico desde la plataforma JeyhBet solicitando atención para mi usuario (${currentUser ? currentUser.name + ' ' + currentUser.lastName : 'Jugador'}).`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-emerald-400 hover:underline font-bold flex items-center gap-1"
          >
            <span>Abrir WhatsApp</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-950/50">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-1.5 mb-1 text-[10px] text-slate-400 font-mono">
                {msg.role === 'model' ? (
                  <>
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span className="font-bold text-amber-400 font-racing">Asistente IA JeyhBet</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-3 h-3 text-sky-400" />
                    <span className="font-semibold text-slate-300">{currentUser ? currentUser.name : 'Tú'}</span>
                  </>
                )}
                <span>· {new Date(msg.timestamp).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>

              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-md ${
                  msg.role === 'user'
                    ? 'bg-amber-500 text-slate-950 font-medium rounded-tr-none'
                    : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none whitespace-pre-wrap'
                }`}
              >
                {msg.content}

                {/* Direct Escalation Card if triggered */}
                {msg.escalateToWhatsApp && msg.whatsappUrl && (
                  <div className="mt-3 p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-emerald-300 font-bold font-racing text-xs uppercase">
                      <AlertTriangle className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>ATENCIÓN PRIORITARIA DEL PROPIETARIO JUAN SANDOVAL</span>
                    </div>
                    <p className="text-[11px] text-slate-200">
                      He preparado el reporte de tu caso directamente para que Juan Sandoval lo revise en su WhatsApp y se te resuelva de inmediato.
                    </p>
                    <a
                      href={msg.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase flex items-center justify-center gap-2 shadow transition-all font-racing"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>Hablar con Juan Sandoval (+58 4221475717)</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-amber-400 font-medium p-2 bg-slate-900 rounded-xl border border-slate-800 w-fit">
              <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
              <span>El Asistente IA está analizando tu consulta...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Frequent Questions Chips */}
        <div className="p-2.5 bg-slate-900 border-t border-slate-800">
          <span className="text-[10px] text-slate-400 font-bold uppercase font-racing block mb-1.5 px-1">
            Preguntas frecuentes rápidas:
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            {FREQUENT_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                type="button"
                disabled={isLoading}
                onClick={() => handleQuickQuestion(q)}
                className="whitespace-nowrap px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-amber-300 text-[11px] border border-slate-800 transition-colors shrink-0 disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            disabled={isLoading}
            placeholder="Pregúntale al Asistente IA (ej. ¿cuánto gano si juego 50 al 1?)..."
            className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={isLoading || !inputPrompt.trim()}
            className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-racing uppercase tracking-wider flex items-center gap-1.5 shadow disabled:opacity-50 transition-all active:scale-95 shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Enviar</span>
          </button>
        </form>
      </div>
    </div>
  );
};
