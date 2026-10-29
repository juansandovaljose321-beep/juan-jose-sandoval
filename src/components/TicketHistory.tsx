import React, { useState } from 'react';
import { BetTicket } from '../types';
import { formatBs } from '../utils/formatters';
import { Receipt, CheckCircle2, Clock, XCircle, Trophy } from 'lucide-react';

interface TicketHistoryProps {
  tickets: BetTicket[];
}

export const TicketHistory: React.FC<TicketHistoryProps> = ({ tickets }) => {
  const [filter, setFilter] = useState<'all' | 'pendiente' | 'ganado'>('all');

  const filtered = tickets.filter(t => {
    if (filter === 'all') return true;
    return t.status === filter;
  });

  const totalWonBs = tickets.reduce((sum, t) => sum + (t.totalPaidBs || 0), 0);
  const totalStakedBs = tickets.reduce((sum, t) => sum + t.totalStakeBs, 0);

  return (
    <div className="space-y-4">
      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3.5 bg-slate-900 rounded-2xl border border-slate-800">
          <span className="text-[11px] text-slate-400 block">Total Apostado:</span>
          <span className="text-base font-mono font-extrabold text-slate-200 mt-0.5 block">
            {formatBs(totalStakedBs)}
          </span>
          <span className="text-[10px] text-slate-500">{tickets.length} tickets emitidos</span>
        </div>

        <div className="p-3.5 bg-slate-900 rounded-2xl border border-slate-800">
          <span className="text-[11px] text-slate-400 block">Total Cobrado (Premios):</span>
          <span className="text-base font-mono font-extrabold text-emerald-400 mt-0.5 block">
            {formatBs(totalWonBs)}
          </span>
          <span className="text-[10px] text-emerald-500">Saldo abonado</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs">
        <button
          onClick={() => setFilter('all')}
          className={`flex-1 py-1.5 rounded-lg font-medium transition-colors ${
            filter === 'all' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          Todos ({tickets.length})
        </button>
        <button
          onClick={() => setFilter('pendiente')}
          className={`flex-1 py-1.5 rounded-lg font-medium transition-colors ${
            filter === 'pendiente' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          En Juego ({tickets.filter(t => t.status === 'pendiente').length})
        </button>
        <button
          onClick={() => setFilter('ganado')}
          className={`flex-1 py-1.5 rounded-lg font-medium transition-colors ${
            filter === 'ganado' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          Ganados ({tickets.filter(t => t.status === 'ganado').length})
        </button>
      </div>

      {/* Tickets List */}
      {filtered.length === 0 ? (
        <div className="p-8 text-center bg-slate-900/60 rounded-2xl border border-slate-800 space-y-2">
          <Receipt className="w-8 h-8 text-slate-600 mx-auto" />
          <h4 className="text-sm font-bold text-slate-300 font-racing">NO HAY TICKETS EN ESTA CATEGORÍA</h4>
          <p className="text-xs text-slate-500">
            Realiza tus jugadas en el tablero para verlas reflejadas aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(ticket => (
            <div
              key={ticket.id}
              className={`p-4 rounded-2xl border transition-all ${
                ticket.status === 'ganado'
                  ? 'bg-emerald-950/20 border-emerald-500/40'
                  : ticket.status === 'perdido'
                  ? 'bg-slate-900 border-slate-800 opacity-75'
                  : 'bg-slate-900 border-amber-500/30'
              }`}
            >
              {/* Ticket Top bar */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-amber-400 text-xs tracking-wider">
                    {ticket.ticketNumber}
                  </span>
                  <span className="text-[11px] text-slate-400">· Carrera #{ticket.raceNumber}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {ticket.status === 'ganado' && (
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1">
                      <Trophy className="w-3 h-3 text-amber-400" />
                      <span>¡GANADOR!</span>
                    </span>
                  )}
                  {ticket.status === 'pendiente' && (
                    <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/40 text-[10px] font-bold flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>EN JUEGO</span>
                    </span>
                  )}
                  {ticket.status === 'perdido' && (
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-bold flex items-center gap-1">
                      <XCircle className="w-3 h-3" />
                      <span>NO PREMIADO</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Selections */}
              <div className="py-2.5 space-y-1.5 text-xs">
                {ticket.selections.map(sel => (
                  <div key={sel.horseNumber} className="flex items-center justify-between py-0.5">
                    <span className="text-slate-200">
                      Caballo #{sel.horseNumber} {sel.horseName} (x{sel.multiplier})
                    </span>
                    <div className="font-mono text-right">
                      <span className="text-slate-400 mr-2">{formatBs(sel.stakeBs)}</span>
                      <span className="text-slate-300">Potencial: {formatBs(sel.potentialWinBs)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Ticket Footer */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">
                  {new Date(ticket.createdAt).toLocaleTimeString('es-VE')} · {new Date(ticket.createdAt).toLocaleDateString('es-VE')}
                </span>

                <div className="text-right font-mono">
                  {ticket.status === 'ganado' ? (
                    <div>
                      <span className="text-[10px] text-emerald-400 mr-1">Premio Pagado:</span>
                      <span className="text-emerald-400 font-extrabold text-sm">+{formatBs(ticket.totalPaidBs)}</span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-[10px] text-slate-400 mr-1">Total Jugado:</span>
                      <span className="text-slate-200 font-bold">{formatBs(ticket.totalStakeBs)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
