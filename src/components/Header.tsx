import React, { useState, useEffect } from 'react';
import { User, PlatformConfig } from '../types';
import { formatBs, getCaracasTime } from '../utils/formatters';
import { Wallet, Shield, User as UserIcon, Download, Clock, Trophy, MessageCircle, Bot } from 'lucide-react';

interface HeaderProps {
  currentUser: User | null;
  config: PlatformConfig;
  onOpenDeposit: () => void;
  onOpenWithdraw: () => void;
  onOpenAuth: (view?: 'login' | 'register') => void;
  onOpenProfile: () => void;
  onOpenAdmin: () => void;
  onOpenHistory?: () => void;
  onOpenChat?: () => void;
  onOpenAIAssistant?: () => void;
  onInstallPwa?: () => void;
  isPwaInstallable?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  config,
  onOpenDeposit,
  onOpenWithdraw,
  onOpenAuth,
  onOpenProfile,
  onOpenAdmin,
  onOpenHistory,
  onOpenChat,
  onOpenAIAssistant,
  onInstallPwa,
  isPwaInstallable,
}) => {
  const [caracasClock, setCaracasClock] = useState<string>('00:00:00');

  useEffect(() => {
    const updateTime = () => {
      const { timeStr } = getCaracasTime();
      setCaracasClock(timeStr);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-[#070b14]/95 backdrop-blur-md border-b border-slate-800/80 px-3 sm:px-6 py-2.5 transition-all">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
        {/* Zone 1: Brand Wordmark with JM Emblem */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 p-0.5 shadow-md flex items-center justify-center">
            <div className="w-full h-full bg-[#0a0f1d] rounded-[10px] flex items-center justify-center">
              <span className="font-extrabold text-amber-400 font-racing text-base tracking-tighter">
                JM
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg sm:text-xl text-white tracking-wider font-racing uppercase">
                JEYHBET
              </span>
              <span className="text-[10px] text-amber-400 font-mono font-bold px-1.5 py-0.2 bg-amber-500/10 border border-amber-500/30 rounded">
                VE (Bs)
              </span>
            </div>
            
            {/* Caracas Time Indicator */}
            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
              <Clock className="w-2.5 h-2.5 text-slate-500" />
              <span>Caracas: {caracasClock}</span>
            </div>
          </div>
        </div>

        {/* Zone 2: Navigation & Status Indicators */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs font-medium text-slate-300">
          <div className="hidden md:flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                config.taquillasAbiertas ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span className="text-slate-400">Taquillas:</span>
            <span className={`font-bold ${config.taquillasAbiertas ? 'text-emerald-400' : 'text-rose-400'}`}>
              {config.taquillasAbiertas ? 'ABIERTAS' : 'CERRADAS'}
            </span>
          </div>

          {/* Historial de Ganadores Button */}
          {onOpenHistory && (
            <button
              onClick={onOpenHistory}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-amber-400 font-bold text-xs border border-amber-500/20 transition-all active:scale-95 shadow-sm"
              title="Ver Historial Oficial de Caballos Ganadores"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
              <span className="hidden sm:inline font-racing uppercase tracking-wider">Historial</span>
            </button>
          )}

          {/* Chat En Vivo Button */}
          {onOpenChat && (
            <button
              onClick={onOpenChat}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-sky-400 font-bold text-xs border border-sky-500/20 transition-all active:scale-95 shadow-sm"
              title="Abrir Chat de la Comunidad JeyhBet"
            >
              <MessageCircle className="w-3.5 h-3.5 text-sky-400 fill-sky-400/20" />
              <span className="hidden sm:inline font-racing uppercase tracking-wider">Chat</span>
            </button>
          )}

          {/* Asistente IA Button */}
          {onOpenAIAssistant && (
            <button
              onClick={onOpenAIAssistant}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 font-bold text-xs border border-amber-500/35 transition-all active:scale-95 shadow-sm"
              title="Abrir Asistente Personal de IA (Soporte Oficial)"
            >
              <Bot className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline font-racing uppercase tracking-wider">Soporte IA</span>
            </button>
          )}

          {/* Instalar App PWA Header Button */}
          {onInstallPwa && (
            <button
              type="button"
              onClick={onInstallPwa}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs border border-amber-400 font-racing uppercase tracking-wider shadow-sm transition-all active:scale-95 cursor-pointer"
              title="Descargar e Instalar JeyhBet en tu Teléfono o Computadora"
            >
              <Download className="w-3.5 h-3.5 text-slate-950" />
              <span className="hidden xs:inline">Instalar App</span>
            </button>
          )}

          {currentUser?.role === 'admin' && (
            <button
              onClick={onOpenAdmin}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold hover:bg-amber-500/25 transition-colors font-racing uppercase text-xs"
            >
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Propietario</span>
            </button>
          )}
        </div>

        {/* Zone 3: Desktop User Balance / Action Controls (hidden on mobile, rendered below) */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          {currentUser ? (
            <div className="flex items-center gap-2">
              {/* Balance Box */}
              <button
                type="button"
                onClick={onOpenProfile}
                className="cursor-pointer bg-slate-900 border border-slate-700/80 hover:border-amber-400/50 px-2.5 py-1 rounded-xl flex items-center gap-2 transition-colors text-left"
              >
                <div className="text-right">
                  <span className="text-[9px] text-slate-400 block font-medium leading-none">Mi Saldo:</span>
                  <span className="text-xs sm:text-sm font-mono font-extrabold text-amber-400">
                    {formatBs(currentUser.balance)}
                  </span>
                </div>
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-xs">
                  <UserIcon className="w-3.5 h-3.5" />
                </div>
              </button>

              {/* Quick Deposit button */}
              <button
                type="button"
                onClick={onOpenDeposit}
                className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-racing uppercase tracking-wider shadow-sm transition-transform active:scale-95"
              >
                Recargar
              </button>

              {/* Quick Withdraw button */}
              <button
                type="button"
                onClick={onOpenWithdraw}
                className="px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs font-racing uppercase tracking-wider transition-colors"
              >
                Retirar
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs uppercase font-racing tracking-wider shadow-md transition-all active:scale-95"
              >
                Iniciar Sesión
              </button>
              <button
                type="button"
                onClick={() => onOpenAuth('register')}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase font-racing tracking-wider transition-colors border border-slate-700"
              >
                Registrarse
              </button>
            </div>
          )}

          {/* PWA Download Button if available */}
          {isPwaInstallable && onInstallPwa && (
            <button
              onClick={onInstallPwa}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 transition-colors"
              title="Instalar App JeyhBet"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Zone 4: Dedicated Mobile Bar (sm:hidden) - 100% visible inside vertical screen without right swipe */}
      <div className="sm:hidden pt-2 mt-2 border-t border-slate-800/80 w-full">
        {currentUser ? (
          <div className="flex items-center gap-1.5 w-full">
            {/* Mi Saldo Box */}
            <button
              type="button"
              onClick={onOpenProfile}
              className="flex-1 min-w-0 bg-slate-900/90 border border-amber-500/30 px-2 py-1.5 rounded-xl flex items-center justify-between text-left active:scale-[0.98] transition-all"
            >
              <div className="truncate pr-1">
                <span className="text-[9px] text-slate-400 font-medium block leading-none">Mi Saldo:</span>
                <span className="text-xs font-mono font-extrabold text-amber-400 truncate block">
                  {formatBs(currentUser.balance)}
                </span>
              </div>
              <div className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                <UserIcon className="w-3 h-3" />
              </div>
            </button>

            {/* Recargar Button */}
            <button
              type="button"
              onClick={onOpenDeposit}
              className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-racing font-extrabold text-[11px] uppercase tracking-wider shrink-0 shadow-md active:scale-95 transition-all"
            >
              + Recargar
            </button>

            {/* Retirar Button */}
            <button
              type="button"
              onClick={onOpenWithdraw}
              className="px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/20 font-racing font-bold text-[11px] uppercase tracking-wider shrink-0 active:scale-95 transition-all"
            >
              Retirar
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 w-full">
            <button
              type="button"
              onClick={() => onOpenAuth('login')}
              className="py-1.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs uppercase font-racing tracking-wider shadow text-center active:scale-95 transition-all"
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => onOpenAuth('register')}
              className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs uppercase font-racing tracking-wider text-center active:scale-95 transition-all"
            >
              Registrarse
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
