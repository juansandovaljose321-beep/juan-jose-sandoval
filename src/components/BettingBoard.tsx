import React, { useState } from 'react';
import { Horse, BetSelection, User, PlatformConfig, BetTicket } from '../types';
import { formatBs } from '../utils/formatters';
import { checkBetRisk } from '../utils/storage';
import { ShieldAlert, CheckCircle2, AlertTriangle, Wallet, Moon, Sparkles } from 'lucide-react';

interface BettingBoardProps {
  horses: Horse[];
  currentUser: User | null;
  config: PlatformConfig;
  allTickets: BetTicket[];
  isNightClosed?: boolean;
  isEarlyMorningOpen?: boolean;
  onPlaceBet: (selections: BetSelection[], totalStake: number) => { success: boolean; error?: string };
  onOpenDeposit: (neededAmount?: number) => void;
  onOpenAuth: () => void;
}

export const BettingBoard: React.FC<BettingBoardProps> = ({
  horses,
  currentUser,
  config,
  allTickets,
  isNightClosed = false,
  isEarlyMorningOpen = false,
  onPlaceBet,
  onOpenDeposit,
  onOpenAuth,
}) => {
  // Storing stake for each horse number (1 to 6)
  const [selectedStakes, setSelectedStakes] = useState<Record<number, number>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const activeHorseCount = Object.keys(selectedStakes).filter(k => (selectedStakes[Number(k)] || 0) > 0).length;

  const handleToggleHorse = (horseNumber: number) => {
    if (!config.taquillasAbiertas) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    const currentStake = selectedStakes[horseNumber] || 0;
    if (currentStake > 0) {
      // Remove horse
      const next = { ...selectedStakes };
      delete next[horseNumber];
      setSelectedStakes(next);
    } else {
      // Check maximum 3 horses per ticket
      if (activeHorseCount >= 3) {
        setErrorMessage('Máximo puedes seleccionar 3 caballos independientes por jugada.');
        return;
      }
      setSelectedStakes({
        ...selectedStakes,
        [horseNumber]: config.minBetBs, // default min 10 Bs
      });
    }
  };

  const handleSetStake = (horseNumber: number, stake: number) => {
    setErrorMessage(null);
    if (stake <= 0) {
      const next = { ...selectedStakes };
      delete next[horseNumber];
      setSelectedStakes(next);
    } else {
      setSelectedStakes({
        ...selectedStakes,
        [horseNumber]: stake,
      });
    }
  };

  const handleAddChip = (horseNumber: number, amount: number) => {
    const current = selectedStakes[horseNumber] || 0;
    handleSetStake(horseNumber, current + amount);
  };

  // Calculate totals
  const totalStakeBs = Object.values(selectedStakes).reduce((sum, val) => sum + (val || 0), 0);

  // Build selections
  const currentSelections: BetSelection[] = Object.entries(selectedStakes)
    .filter(([_, stake]) => stake > 0)
    .map(([numStr, stake]) => {
      const num = Number(numStr);
      const horse = horses.find(h => h.number === num)!;
      // Formula: x1 -> bet 10 wins 10 profit (total payout 20)
      const potentialWin = stake * (horse.currentMultiplier + 1);
      return {
        horseNumber: num,
        horseName: horse.name,
        multiplier: horse.currentMultiplier,
        stakeBs: stake,
        potentialWinBs: potentialWin,
      };
    });

  const handleSubmitBet = () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!currentUser) {
      onOpenAuth();
      return;
    }

    if (!config.taquillasAbiertas) {
      setErrorMessage('Las taquillas están temporalmente cerradas por el propietario. Espere la reapertura.');
      return;
    }

    // Only block by night schedule if owner hasn't opened taquillas
    if (isNightClosed && !config.taquillasAbiertas) {
      setErrorMessage('🌙 Las taquillas están cerradas por horario nocturno. Reabrirán a las 09:00 AM (Zona Caracas).');
      return;
    }

    if (currentSelections.length === 0) {
      setErrorMessage('Selecciona al menos un caballo para apostar.');
      return;
    }

    if (totalStakeBs < config.minBetBs) {
      setErrorMessage(`La apuesta mínima permitida es de ${formatBs(config.minBetBs)}.`);
      return;
    }

    // Check individual horse stakes
    for (const sel of currentSelections) {
      if (sel.stakeBs < config.minBetBs) {
        setErrorMessage(`La apuesta en el Caballo #${sel.horseNumber} debe ser de al menos ${formatBs(config.minBetBs)}.`);
        return;
      }

      // Check Automated Risk Engine
      const riskCheck = checkBetRisk(sel.horseNumber, sel.stakeBs, sel.multiplier, config, allTickets);
      if (!riskCheck.allowed) {
        setErrorMessage(riskCheck.message || 'Apuesta excede el límite de taquilla disponible.');
        return;
      }
    }

    // Check user balance:
    // User requested: "si el jugador ya tiene saldo en su cuenta no le vas a pedir que recargue cuando haga la apuesta eso lo vas a hacer si el usuario no tiene fondo"
    if (currentUser.balance < totalStakeBs) {
      const missing = totalStakeBs - currentUser.balance;
      setErrorMessage(`Saldo insuficiente. Tienes ${formatBs(currentUser.balance)} y necesitas ${formatBs(totalStakeBs)}.`);
      // Offer deposit modal directly
      onOpenDeposit(missing);
      return;
    }

    // Execute bet
    const res = onPlaceBet(currentSelections, totalStakeBs);
    if (res.success) {
      setSuccessMessage('¡Ticket registrado exitosamente! Suerte en la carrera.');
      setSelectedStakes({});
    } else {
      setErrorMessage(res.error || 'Error al procesar el ticket.');
    }
  };

  // Preset quick chips in Bolívares
  const CHIP_VALUES = [10, 20, 50, 100, 500, 1000];

  return (
    <div className="space-y-4">
      {/* Morning Welcome Notice before 09:00 AM when taquillas are open */}
      {isEarlyMorningOpen && config.taquillasAbiertas && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-slate-900 to-amber-500/15 border-2 border-amber-400 text-amber-200 text-xs flex items-center gap-3 shadow-lg animate-in fade-in">
          <Sparkles className="w-6 h-6 text-amber-400 shrink-0" />
          <div>
            <strong className="font-extrabold block text-sm font-racing uppercase text-amber-300">
              ☀️ BUENOS DÍAS · HACER SUS JUGADAS ANTES DE LAS 9 DE LA MAÑANA
            </strong>
            <p className="text-slate-200 mt-0.5 leading-relaxed font-medium">
              Buenos días, hacer sus jugadas antes de las 9 de la mañana que es la primera jugada del día. Las taquillas están abiertas para que hagas tus selecciones.
            </p>
          </div>
        </div>
      )}

      {/* Night Closed Alert only if taquillas are actually CLOSED */}
      {!config.taquillasAbiertas && isNightClosed && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/90 via-slate-900 to-indigo-950/90 border border-indigo-700/80 text-indigo-200 text-xs flex items-center gap-3 shadow-lg">
          <Moon className="w-6 h-6 text-indigo-400 shrink-0" />
          <div>
            <strong className="font-extrabold block text-sm font-racing uppercase text-indigo-300">
              🌙 SISTEMA CERRADO POR HORARIO NOCTURNO (10:01 PM - 09:00 AM)
            </strong>
            <p className="text-slate-300 mt-0.5 leading-relaxed">
              El hipódromo cerró automáticamente a las 10:01 PM en hora oficial de Caracas. Las taquillas y la próxima partida oficial abrirán mañana a las <strong>09:00 AM</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Taquillas Status Alert if Closed manually */}
      {!config.taquillasAbiertas && !isNightClosed && (
        <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-200 text-xs flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
          <div>
            <strong className="font-semibold block text-sm">TAQUILLAS CERRADAS</strong>
            El propietario ha cerrado la recepción de apuestas para esta jugada. Podrás apostar en la siguiente tanda.
          </div>
        </div>
      )}

      {/* Horse Selection Table (TeInfobet Style) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-base tracking-wide font-racing flex items-center gap-2">
              TABLERO OFICIAL DE JUGADA
            </h3>
            <p className="text-[11px] text-slate-400">
              Selecciona hasta 3 caballos independientes. Mínimo {formatBs(config.minBetBs)} por caballo.
            </p>
          </div>
          <span className="text-xs bg-slate-800 text-amber-400 font-mono font-bold px-2.5 py-1 rounded-md border border-slate-700">
            {activeHorseCount}/3 Seleccionados
          </span>
        </div>

        <div className="divide-y divide-slate-800/80">
          {horses.map(horse => {
            const isSelected = (selectedStakes[horse.number] || 0) > 0;
            const currentStake = selectedStakes[horse.number] || 0;
            const potentialWin = currentStake * (horse.currentMultiplier + 1);

            return (
              <div
                key={horse.number}
                className={`p-3 transition-colors ${
                  isSelected ? 'bg-slate-800/60' : 'hover:bg-slate-800/30'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  {/* Horse Identifiers */}
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Horse Number Badge */}
                    <button
                      type="button"
                      disabled={!config.taquillasAbiertas}
                      onClick={() => handleToggleHorse(horse.number)}
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-racing font-extrabold text-xl text-white shadow-md shrink-0 transition-transform active:scale-95 disabled:opacity-50"
                      style={{ backgroundColor: horse.colorHex }}
                    >
                      {horse.number}
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-white text-base font-racing tracking-wide truncate">
                          {horse.name.toUpperCase()}
                        </span>
                        <span
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded text-white"
                          style={{ backgroundColor: horse.colorHex }}
                        >
                          {horse.colorName}
                        </span>
                      </div>
                      
                      {/* Total apostado en este caballo */}
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                        <span>Apostado:</span>
                        <span className="text-amber-400 font-mono font-bold">
                          {formatBs(horse.totalBetsBs || 0)}
                        </span>
                        <span className="text-slate-500 font-mono text-[10px]">
                          ({(horse.betCount || 0) === 0 ? '0 jugadas' : `${horse.betCount} ${horse.betCount === 1 ? 'jugada' : 'jugadas'}`})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Multiplier / Payout Badge */}
                  <div className="text-right shrink-0">
                    <div className="inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg">
                      <span className="text-xs text-amber-300 font-semibold font-racing">PAGA</span>
                      <span className="text-base font-extrabold text-amber-400 font-mono">
                        x{horse.currentMultiplier}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {horse.number === 1 ? 'Gana x1 de tu apuesta' : `Gana x${horse.currentMultiplier} de tu apuesta`}
                    </div>
                  </div>
                </div>

                {/* If Selected: Stake Controller & Quick Chips */}
                {isSelected && (
                  <div className="mt-3 pt-3 border-t border-slate-800/80 bg-slate-950/40 -mx-3 -mb-3 p-3 rounded-b-xl space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-300 font-medium">Monto a apostar:</span>
                      
                      {/* Stake Input with BS */}
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <input
                            type="number"
                            min={config.minBetBs}
                            step="5"
                            value={currentStake}
                            onChange={(e) => handleSetStake(horse.number, Math.max(0, parseFloat(e.target.value) || 0))}
                            className="w-28 bg-slate-900 border border-amber-500/50 rounded-lg px-2.5 py-1 text-right text-sm font-mono font-bold text-white focus:outline-none focus:border-amber-400"
                          />
                          <span className="absolute left-2 top-1.5 text-xs text-slate-400 font-bold">Bs</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Add Chips */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1">
                      <span className="text-[10px] text-slate-500 shrink-0 font-medium">+ Sumar:</span>
                      {CHIP_VALUES.map(chip => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => handleAddChip(horse.number, chip)}
                          className="px-2 py-0.5 text-[11px] font-mono font-bold rounded bg-slate-800 hover:bg-amber-500/20 hover:text-amber-300 border border-slate-700 text-slate-300 transition-colors shrink-0"
                        >
                          +{chip}
                        </button>
                      ))}
                    </div>

                    {/* Potential Win Preview for this Horse */}
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60">
                      <span className="text-slate-400">Si gana este caballo cobras:</span>
                      <span className="font-mono font-extrabold text-emerald-400 text-sm">
                        {formatBs(potentialWin)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Ticket Summary & Place Bet Action */}
      {currentSelections.length > 0 && (
        <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/30 rounded-2xl p-4 shadow-2xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div>
              <span className="text-xs text-amber-400 uppercase font-bold tracking-wider font-racing">
                RESUMEN DE TU TICKET
              </span>
              <div className="text-[11px] text-slate-400">
                {currentSelections.length} jugada(s) individual(es)
              </div>
            </div>

            <div className="text-right">
              <span className="text-[11px] text-slate-400 block">Total a Pagar:</span>
              <span className="text-lg font-extrabold text-amber-400 font-mono">
                {formatBs(totalStakeBs)}
              </span>
            </div>
          </div>

          {/* Breakdown items */}
          <div className="space-y-1.5">
            {currentSelections.map(sel => (
              <div key={sel.horseNumber} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-slate-800/50">
                <span className="text-slate-200">
                  Caballo #{sel.horseNumber} {sel.horseName} (x{sel.multiplier})
                </span>
                <div className="font-mono text-right">
                  <span className="text-slate-400 mr-2">{formatBs(sel.stakeBs)}</span>
                  <span className="text-emerald-400 font-bold">Gana {formatBs(sel.potentialWinBs)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Error Message if risk or insufficient */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Submit Bet Button */}
          <button
            type="button"
            disabled={!config.taquillasAbiertas}
            onClick={handleSubmitBet}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-base tracking-wide uppercase font-racing shadow-lg shadow-amber-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Wallet className="w-5 h-5 text-slate-950" />
            <span>
              {!currentUser
                ? `INICIAR SESIÓN O REGISTRARSE PARA JUGAR (${formatBs(totalStakeBs)})`
                : `CONFIRMAR Y JUGAR TICKET (${formatBs(totalStakeBs)})`}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
