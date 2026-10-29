import React, { useState } from 'react';
import { RaceHistoryRecord } from '../types';
import { formatBs } from '../utils/formatters';
import { Trophy, Clock, Calendar, Flag, X, Search, History, ChevronRight } from 'lucide-react';

interface RaceHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  historyRecords: RaceHistoryRecord[];
}

export const RaceHistoryModal: React.FC<RaceHistoryModalProps> = ({
  isOpen,
  onClose,
  historyRecords,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedHorseFilter, setSelectedHorseFilter] = useState<number | null>(null);

  if (!isOpen) return null;

  const filtered = historyRecords.filter(record => {
    const matchesSearch = 
      record.raceNumber.toString().includes(searchTerm) ||
      record.winnerHorseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.winnerColorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.timeCaracas.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesHorse = selectedHorseFilter === null || record.winnerHorseNumber === selectedHorseFilter;

    return matchesSearch && matchesHorse;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-amber-500/50 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden ring-1 ring-amber-400/20">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40 shadow-inner">
              <Trophy className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-extrabold text-white font-racing tracking-wide">
                HISTORIAL DE CABALLOS GANADORES
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Registro oficial con la hora exacta y caballo ganador de cada carrera
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

        {/* Filter Bar */}
        <div className="p-3 sm:p-4 bg-slate-950/60 border-b border-slate-800 space-y-2.5">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por carrera, caballo, color u hora..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            {selectedHorseFilter !== null && (
              <button
                onClick={() => setSelectedHorseFilter(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-amber-400 text-xs font-bold font-racing hover:bg-slate-700"
              >
                Todos los Caballos
              </button>
            )}
          </div>

          {/* Quick Filter Horse Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-[10px] text-slate-500 shrink-0 font-medium font-racing uppercase">Filtrar por Nº:</span>
            {[1, 2, 3, 4, 5, 6].map(num => (
              <button
                key={num}
                onClick={() => setSelectedHorseFilter(selectedHorseFilter === num ? null : num)}
                className={`px-2.5 py-1 rounded-lg font-bold font-racing text-xs shrink-0 transition-all ${
                  selectedHorseFilter === num
                    ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-400'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Caballo #{num}
              </button>
            ))}
          </div>
        </div>

        {/* List of Race Records */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-800/80 text-slate-500 flex items-center justify-center mx-auto border border-slate-700">
                <History className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-slate-300 font-racing">
                AÚN NO HAY CARRERAS REGISTRADAS
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Tan pronto el propietario lance una carrera o se dispute la hora oficial de Caracas, quedará guardado aquí el caballo ganador con su hora exacta.
              </p>
            </div>
          ) : (
            filtered.map(record => (
              <div
                key={record.id}
                className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
              >
                <div className="flex items-center gap-3.5">
                  {/* Giant Winner Horse Number Badge */}
                  <div
                    className="w-12 h-12 rounded-xl flex flex-col items-center justify-center text-white font-extrabold shadow-md shrink-0 border-2 border-white/80"
                    style={{ backgroundColor: record.winnerColorHex }}
                  >
                    <span className="text-[9px] font-bold uppercase leading-none">Nº</span>
                    <span className="text-2xl font-racing font-black leading-none">{record.winnerHorseNumber}</span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-slate-800 text-amber-400 font-mono font-bold px-2 py-0.5 rounded">
                        Carrera #{record.raceNumber}
                      </span>
                      <span className="text-xs text-slate-300 font-racing font-bold">
                        {record.winnerHorseName.toUpperCase()}
                      </span>
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded text-white"
                        style={{ backgroundColor: record.winnerColorHex }}
                      >
                        {record.winnerColorName}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-mono text-slate-400 mt-1">
                      <span className="flex items-center gap-1 text-amber-300 font-bold">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Hora: {record.timeCaracas}</span>
                      </span>
                      <span className="flex items-center gap-1 text-slate-400">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>{record.dateCaracas}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] text-slate-500 block uppercase font-mono">Cuota Oficial:</span>
                    <span className="text-sm font-bold text-emerald-400 font-mono">
                      x{record.multiplier} pagado
                    </span>
                  </div>

                  <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-amber-400 shrink-0">
                    <Flag className="w-4 h-4 fill-current text-amber-400" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>Total carreras registradas: <strong className="text-white">{historyRecords.length}</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase font-racing transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
