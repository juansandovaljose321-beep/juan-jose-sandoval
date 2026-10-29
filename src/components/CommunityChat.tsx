import React, { useState, useRef, useEffect } from 'react';
import { User, ChatMessage } from '../types';
import { getCaracasTime } from '../utils/formatters';
import { 
  MessageCircle, Send, Crown, Sparkles, X, ChevronDown, 
  Smile, ShieldCheck, Heart 
} from 'lucide-react';

interface CommunityChatProps {
  currentUser: User | null;
  messages: ChatMessage[];
  onSendMessage: (text: string, horsePicked?: number) => void;
  isOpen: boolean;
  onToggle: () => void;
  onOpenAuth: () => void;
}

const QUICK_COMMENTS = [
  '¡Le voy al #1 Rojo!',
  '¡Vamos con todo!',
  '¡Cobré mi jugada!',
  '¡Fuerza al #2 Amarillo!',
  '¡Qué buena carrera!',
  '¡Atentos a la partida!',
  '¡Suerte a todos!',
];

export const CommunityChat: React.FC<CommunityChatProps> = ({
  currentUser,
  messages,
  onSendMessage,
  isOpen,
  onToggle,
  onOpenAuth,
}) => {
  const [inputText, setInputText] = useState('');
  const [selectedHorseTag, setSelectedHorseTag] = useState<number | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    const trimmed = inputText.trim();
    if (!trimmed) return;

    onSendMessage(trimmed, selectedHorseTag);
    setInputText('');
    setSelectedHorseTag(undefined);
  };

  const handleQuickSend = (text: string) => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    onSendMessage(text, selectedHorseTag);
  };

  return (
    <>
      {/* Floating Action Buttons Stack: Chat Button + WhatsApp Button right beneath it */}
      <div className="fixed bottom-20 right-3 sm:right-4 z-40 flex flex-col items-end gap-2.5 pointer-events-auto">
        {/* Button 1: Platform Community Chat Button */}
        {!isOpen && (
          <button
            onClick={onToggle}
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-racing font-extrabold p-3 sm:px-4 sm:py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 transition-all active:scale-95 border-2 border-slate-950 cursor-pointer"
            title="Abrir Chat de la Comunidad JeyhBet"
          >
            <div className="relative">
              <MessageCircle className="w-5 h-5 fill-current" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-slate-950 animate-ping" />
            </div>
            <span className="hidden sm:inline text-xs uppercase tracking-wider">
              Chat en Vivo ({messages.length})
            </span>
          </button>
        )}

        {/* Button 2: WhatsApp Button DIRECTLY BENEATH the Chat Button */}
        <a
          href={`https://wa.me/584221475717?text=${encodeURIComponent(
            currentUser
              ? `Hola Juan Sandoval, me comunico desde la plataforma JeyhBet solicitando atención para mi usuario (${currentUser.name} ${currentUser.lastName}, C.I: ${currentUser.cedula}).`
              : 'Hola Juan Sandoval, me comunico desde la plataforma JeyhBet solicitando información y soporte.'
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-racing font-extrabold p-3 sm:px-4 sm:py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 transition-all active:scale-95 border-2 border-slate-950 cursor-pointer group"
          title="Contactar a Juan Sandoval en WhatsApp (+58 4221475717)"
        >
          <div className="relative">
            <svg
              className="w-5 h-5 fill-current text-white"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.455 5.711 1.456h.005c6.554 0 11.89-5.336 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-300 border border-slate-950 animate-ping" />
          </div>
          <span className="hidden sm:inline text-xs uppercase tracking-wider">
            WhatsApp Soporte
          </span>
        </a>
      </div>

      {/* Slide-in Chat Drawer / Card */}
      {isOpen && (
        <div className="fixed bottom-20 right-2 sm:right-4 z-40 w-[94vw] sm:w-96 max-w-sm h-[480px] bg-slate-900 border-2 border-amber-500/50 rounded-3xl shadow-2xl flex flex-col overflow-hidden ring-4 ring-amber-400/20 animate-in slide-in-from-bottom-5">
          {/* Top Bar */}
          <div className="p-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-racing font-extrabold text-sm text-white uppercase tracking-wider">
                CHAT DE LA COMUNIDAD EN VIVO
              </span>
            </div>

            <button
              onClick={onToggle}
              className="p-1 rounded-lg text-slate-400 hover:text-white bg-slate-900 border border-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Notice */}
          <div className="px-3 py-1.5 bg-amber-500/10 border-b border-amber-500/20 text-[10px] text-amber-300 font-medium flex items-center justify-between">
            <span>Comparte tus pronósticos y celebra tus victorias</span>
            <span className="font-bold">Hora Caracas</span>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-950/60">
            {messages.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <MessageCircle className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400 font-racing">¡Sé el primero en comentar en la sala!</p>
                <div className="flex flex-wrap gap-1 justify-center pt-2">
                  {QUICK_COMMENTS.slice(0, 3).map(qc => (
                    <button
                      key={qc}
                      onClick={() => handleQuickSend(qc)}
                      className="text-[10px] bg-slate-800 text-amber-300 px-2 py-1 rounded-lg border border-slate-700 hover:bg-slate-700 font-medium"
                    >
                      {qc}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map(msg => {
                const isOwner = msg.userRole === 'admin';
                const isMe = msg.userId === currentUser?.id;

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col text-xs rounded-xl p-2.5 space-y-1 transition-all ${
                      isOwner
                        ? 'bg-amber-950/40 border border-amber-500/40 shadow-sm'
                        : isMe
                        ? 'bg-slate-800/80 border border-slate-700'
                        : 'bg-slate-900/90 border border-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 truncate">
                        {isOwner ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-bold text-[9px] font-racing uppercase tracking-wider">
                            <Crown className="w-2.5 h-2.5 fill-current" />
                            <span>PROPIETARIO</span>
                          </span>
                        ) : (
                          <span className="font-bold text-slate-300 font-racing truncate max-w-[120px]">
                            {msg.userName}
                          </span>
                        )}

                        {msg.horsePicked && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-amber-400 font-bold font-mono">
                            #Caballo {msg.horsePicked}
                          </span>
                        )}
                      </div>

                      <span className="text-[9px] text-slate-500 font-mono shrink-0">
                        {msg.timeStr}
                      </span>
                    </div>

                    <p className={`text-xs break-words leading-relaxed ${isOwner ? 'text-amber-200 font-medium' : 'text-slate-200'}`}>
                      {msg.text}
                    </p>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Comment Chips */}
          <div className="px-2 py-1.5 bg-slate-950 border-t border-slate-800/80 flex items-center gap-1 overflow-x-auto text-xs">
            {QUICK_COMMENTS.map(qc => (
              <button
                key={qc}
                type="button"
                onClick={() => handleQuickSend(qc)}
                className="text-[10px] bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-800 shrink-0 font-medium transition-colors"
              >
                {qc}
              </button>
            ))}
          </div>

          {/* Input & Form */}
          <form onSubmit={handleSend} className="p-2.5 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
            <input
              type="text"
              maxLength={140}
              placeholder={currentUser ? "Escribe un comentario..." : "Inicia sesión o regístrate para comentar..."}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onClick={() => { if (!currentUser) onOpenAuth(); }}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-sans"
            />

            <button
              type="submit"
              disabled={!inputText.trim() && !!currentUser}
              className="p-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold transition-colors shrink-0 shadow"
              title="Enviar comentario"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
