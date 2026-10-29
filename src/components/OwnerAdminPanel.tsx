import React, { useState } from 'react';
import { User, Horse, BetTicket, Transaction, PlatformConfig } from '../types';
import { formatBs, parseBsInput } from '../utils/formatters';
import { 
  Lock, Shield, DollarSign, ToggleLeft, ToggleRight, Trophy, Users, 
  ArrowDownCircle, ArrowUpCircle, CheckCircle, XCircle, Search, Edit3, 
  LogOut, Play, BarChart3, AlertTriangle, KeyRound, Eye, EyeOff, Database,
  Copy, Check, Globe, Share2, ExternalLink, Download, Smartphone, Clock
} from 'lucide-react';

interface OwnerAdminPanelProps {
  currentUser: User | null;
  config: PlatformConfig;
  horses: Horse[];
  users: User[];
  tickets: BetTicket[];
  transactions: Transaction[];
  onUpdateConfig: (newConfig: PlatformConfig) => void;
  onUpdateHorses: (newHorses: Horse[]) => void;
  onStartRaceManual: (selectedWinner: number | null) => void;
  onApproveDeposit: (transactionId: string) => void;
  onRejectDeposit: (transactionId: string) => void;
  onPayWithdrawal: (transactionId: string) => void;
  onEditUser: (user: User) => void;
  onImpersonateUser: (user: User) => void;
  onTransferNetProfit: () => { success: boolean; transferredBs: number; message: string };
  onClosePanel: () => void;
}

export const OwnerAdminPanel: React.FC<OwnerAdminPanelProps> = ({
  currentUser,
  config,
  horses,
  users,
  tickets,
  transactions,
  onUpdateConfig,
  onStartRaceManual,
  onApproveDeposit,
  onRejectDeposit,
  onPayWithdrawal,
  onEditUser,
  onImpersonateUser,
  onTransferNetProfit,
  onClosePanel,
}) => {
  // Secret PIN state: 526352
  const [pinInput, setPinInput] = useState<string>('');
  const [isPinUnlocked, setIsPinUnlocked] = useState<boolean>(false);
  const [pinError, setPinError] = useState<string | null>(null);

  // Active Admin Sub-tab
  const [activeTab, setActiveTab] = useState<'taquillas' | 'caja' | 'usuarios' | 'depositos' | 'retiros' | 'tickets' | 'publicacion'>('taquillas');

  // Race control state
  const [predeterminedWinner, setPredeterminedWinner] = useState<number | null>(null);

  // Edit Caja Inicial state
  const [editCajaAmount, setEditCajaAmount] = useState<string>(config.cajaInicialBs.toString());
  const [ownerWithdrawAmount, setOwnerWithdrawAmount] = useState<string>('');
  const [cajaSuccessMsg, setCajaSuccessMsg] = useState<string | null>(null);
  const [profitNotice, setProfitNotice] = useState<{ text: string; isError?: boolean } | null>(null);

  const [copiedPublicUrl, setCopiedPublicUrl] = useState(false);

  // Users search, reveal passwords & edit
  const [userSearchTerm, setUserSearchTerm] = useState<string>('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleUnlockPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === config.adminPin) {
      setIsPinUnlocked(true);
      setPinError(null);
    } else {
      setPinError('Código PIN secreto inválido. Solo el propietario puede acceder.');
    }
  };

  // Toggle Taquillas (Open / Close)
  const handleToggleTaquillas = () => {
    const updated = {
      ...config,
      taquillasAbiertas: !config.taquillasAbiertas,
    };
    onUpdateConfig(updated);
  };

  // Save new Caja Inicial
  const handleSaveCaja = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseBsInput(editCajaAmount);
    onUpdateConfig({
      ...config,
      cajaInicialBs: val,
    });
    setCajaSuccessMsg(`Caja inicial y tu saldo disponible actualizados a ${formatBs(val)}.`);
    setTimeout(() => setCajaSuccessMsg(null), 3000);
  };

  // Owner Personal Expense Withdrawal
  const handleOwnerExpenseWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    const withdrawVal = parseBsInput(ownerWithdrawAmount);
    if (withdrawVal <= 0) return;
    if (withdrawVal > config.cajaInicialBs) {
      setCajaSuccessMsg('El monto excede el saldo actual en la caja inicial.');
      return;
    }
    const nextCaja = config.cajaInicialBs - withdrawVal;
    onUpdateConfig({
      ...config,
      cajaInicialBs: nextCaja,
    });
    setEditCajaAmount(nextCaja.toString());
    setOwnerWithdrawAmount('');
    setCajaSuccessMsg(`Retiro personal de ${formatBs(withdrawVal)} aplicado. Nueva caja y saldo disponible: ${formatBs(nextCaja)}.`);
    setTimeout(() => setCajaSuccessMsg(null), 3000);
  };

  // Financial Stats Calculation
  const totalCollectedBs = tickets.reduce((sum, t) => sum + t.totalStakeBs, 0);
  const totalPaidOutBs = tickets.reduce((sum, t) => sum + (t.totalPaidBs || 0), 0);
  const platformNetProfitBs = totalCollectedBs - totalPaidOutBs;
  const transferredProfitBs = config.gananciaTransferidaAlSaldo || 0;
  const pendingNetProfitBs = Math.max(0, platformNetProfitBs - transferredProfitBs);

  const handleTransferProfitClick = () => {
    const res = onTransferNetProfit();
    if (res.success) {
      setProfitNotice({ text: res.message, isError: false });
    } else {
      setProfitNotice({ text: res.message, isError: true });
    }
    setTimeout(() => setProfitNotice(null), 6000);
  };

  // Active race bets
  const activeTickets = tickets.filter(t => t.status === 'pendiente');
  const activeRacePoolBs = activeTickets.reduce((sum, t) => sum + t.totalStakeBs, 0);

  // Filtered users
  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    u.lastName.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    u.cedula.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    u.phone.includes(userSearchTerm)
  );

  // If PIN not unlocked yet
  if (!isPinUnlocked) {
    return (
      <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 shadow-2xl max-w-md mx-auto my-6 animate-in fade-in">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-3">
          <KeyRound className="w-7 h-7" />
        </div>
        <div className="text-center mb-4">
          <span className="text-xs font-bold text-amber-400 uppercase tracking-widest font-racing">
            ACCESO RESTRINGIDO
          </span>
          <h3 className="text-2xl font-extrabold text-white font-racing tracking-wide">
            PANEL DE GESTIÓN PROPIETARIO
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Hola Juan Sandoval. Para ingresar al control exclusivo de taquillas, ingresa tu PIN de seguridad (526352).
          </p>
        </div>

        <form onSubmit={handleUnlockPin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Código PIN de Seguridad (6 dígitos)
            </label>
            <input
              type="password"
              maxLength={6}
              autoFocus
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="••••••"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-center text-2xl font-mono tracking-widest text-amber-400 focus:border-amber-400 focus:outline-none"
            />
          </div>

          {pinError && (
            <div className="p-3 bg-rose-950/70 border border-rose-800 text-rose-300 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{pinError}</span>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm uppercase tracking-wider font-racing shadow-lg transition-colors"
            >
              INGRESAR AL PANEL
            </button>
            <button
              type="button"
              onClick={onClosePanel}
              className="px-4 py-3 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition-colors"
            >
              Volver
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-6">
      {/* Admin Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl sm:text-2xl font-extrabold text-white font-racing tracking-wide">
              PANEL DE CONTROL DEL PROPIETARIO
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Sesión activa: <strong className="text-slate-200">Juan Sandoval (Propietario)</strong> · Correo: {currentUser?.email}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Taquilla Toggle Button */}
          <button
            onClick={handleToggleTaquillas}
            className={`px-3 py-2 rounded-xl text-xs font-bold uppercase font-racing tracking-wider flex items-center gap-2 transition-all ${
              config.taquillasAbiertas
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-500/30'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/50 hover:bg-rose-500/30'
            }`}
          >
            {config.taquillasAbiertas ? (
              <>
                <ToggleRight className="w-4 h-4 text-emerald-400" />
                <span>TAQUILLAS ABIERTAS (Click para Cerrar)</span>
              </>
            ) : (
              <>
                <ToggleLeft className="w-4 h-4 text-rose-400" />
                <span>TAQUILLAS CERRADAS (Click para Abrir)</span>
              </>
            )}
          </button>

          <button
            onClick={onClosePanel}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
            title="Cerrar Panel Admin"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics Strip (Anti-Slop Clean Numbers) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800">
          <span className="text-[11px] text-slate-400 block font-medium">Caja Inicial / Reserva:</span>
          <span className="text-lg sm:text-xl font-mono font-extrabold text-amber-400 block mt-1">
            {formatBs(config.cajaInicialBs)}
          </span>
          <span className="text-[10px] text-slate-500">Saldo del Propietario</span>
        </div>

        <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800">
          <span className="text-[11px] text-slate-400 block font-medium">Recaudado en Jugadas:</span>
          <span className="text-lg sm:text-xl font-mono font-extrabold text-slate-200 block mt-1">
            {formatBs(totalCollectedBs)}
          </span>
          <span className="text-[10px] text-slate-500">{tickets.length} tickets emitidos</span>
        </div>

        <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800">
          <span className="text-[11px] text-slate-400 block font-medium">Premios Pagados:</span>
          <span className="text-lg sm:text-xl font-mono font-extrabold text-rose-400 block mt-1">
            {formatBs(totalPaidOutBs)}
          </span>
          <span className="text-[10px] text-slate-500">Acreditados a jugadores</span>
        </div>

        <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Ganancia Neta Casa:</span>
            <span className={`text-lg sm:text-xl font-mono font-extrabold block mt-1 ${
              platformNetProfitBs >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {formatBs(platformNetProfitBs)}
            </span>
            <span className="text-[10px] text-slate-500">
              Pendiente: <strong className="text-emerald-400 font-mono">+{formatBs(pendingNetProfitBs)}</strong>
            </span>
          </div>

          <button
            type="button"
            onClick={handleTransferProfitClick}
            className="mt-2 w-full py-1.5 px-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-racing font-extrabold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 shadow transition-transform active:scale-95"
            title="Reflejar y transferir ganancia neta recaudada a mi saldo personal"
          >
            <DollarSign className="w-3 h-3" />
            <span>Pasar a Mi Saldo</span>
          </button>
        </div>
      </div>

      {profitNotice && (
        <div className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in ${
          profitNotice.isError
            ? 'bg-amber-950/80 border border-amber-600/70 text-amber-200'
            : 'bg-emerald-950/80 border border-emerald-500/70 text-emerald-200'
        }`}>
          <span>{profitNotice.text}</span>
          <button
            onClick={() => setProfitNotice(null)}
            className="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded bg-slate-900"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-800 text-xs font-semibold">
        {[
          { id: 'taquillas', label: 'Control de Carrera' },
          { id: 'caja', label: 'Caja Inicial y Retiros' },
          { id: 'depositos', label: `Depósitos Pendientes (${transactions.filter(t => t.type === 'deposito' && t.status === 'pendiente').length})` },
          { id: 'retiros', label: `Retiros Pendientes (${transactions.filter(t => t.type === 'retiro' && t.status === 'pendiente').length})` },
          { id: 'usuarios', label: `Base de Datos Usuarios (${users.length})` },
          { id: 'tickets', label: 'Historial de Tickets' },
          { id: 'publicacion', label: '🌐 Publicar en Google y App' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-3 py-2 rounded-xl whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-amber-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Control de Carrera y Ganador */}
      {activeTab === 'taquillas' && (
        <div className="space-y-4">
          {/* Banner de Carreras Automáticas Cada Media Hora */}
          <div className="p-4 bg-gradient-to-r from-emerald-950/70 via-slate-900 to-emerald-950/70 rounded-2xl border-2 border-emerald-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-emerald-400 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm sm:text-base font-bold text-white font-racing">
                    CARRERAS AUTOMÁTICAS CADA MEDIA HORA
                  </h4>
                  <span className="px-2 py-0.5 rounded bg-emerald-500 text-slate-950 text-[10px] font-black font-racing uppercase tracking-wider">
                    🟢 ACTIVO
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Las partidas se inician 100% solas cada 30 minutos (09:00 AM, 09:30 AM, 10:00 AM ... hasta las 10:00 PM). Tú no tienes que tocar nada; los premios se pagan solos y la ruleta de cuotas avanza automáticamente.
                </p>
              </div>
            </div>

            <div className="shrink-0 p-2.5 bg-slate-950/90 rounded-xl border border-emerald-500/30 text-center sm:text-right">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Intervalo Oficial</span>
              <span className="text-xs font-racing font-extrabold text-amber-400">Cada 30 Minutos (:00 y :30)</span>
            </div>
          </div>

          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-bold text-white font-racing tracking-wide">
                  SELECCIONAR CABALLO GANADOR OFICIAL
                </h4>
                <p className="text-xs text-slate-400">
                  Como propietario, puedes fijar manualmente cuál de los 6 caballos ganará la próxima carrera, o dejarlo al azar.
                </p>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-slate-400 block">Pozo activo en sala:</span>
                <span className="text-base font-mono font-extrabold text-amber-400">
                  {formatBs(activeRacePoolBs)}
                </span>
              </div>
            </div>

            {/* Radio options for 6 horses */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              {horses.map(h => {
                const isSelected = config.chosenWinnerHorseNumber === h.number;
                return (
                  <button
                    key={h.number}
                    type="button"
                    onClick={() => {
                      const nextWinner = isSelected ? null : h.number;
                      onUpdateConfig({ ...config, chosenWinnerHorseNumber: nextWinner });
                    }}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                      isSelected
                        ? 'border-amber-400 bg-amber-500/20 text-white shadow-md ring-2 ring-amber-400/50'
                        : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-7 h-7 rounded-lg text-white font-racing font-bold text-sm flex items-center justify-center shrink-0 shadow"
                        style={{ backgroundColor: h.colorHex }}
                      >
                        {h.number}
                      </span>
                      <div className="truncate">
                        <span className="font-racing font-bold text-sm block truncate">{h.name}</span>
                        <span className="text-[10px] text-slate-400">x{h.currentMultiplier} · {formatBs(h.totalBetsBs)}</span>
                      </div>
                    </div>
                    {isSelected && (
                      <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {config.chosenWinnerHorseNumber && (
              <div className="p-3 bg-amber-950/60 border border-amber-500/60 rounded-xl flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-amber-200">
                    Ganador Fijado por Propietario: <strong className="text-white font-racing text-sm">CABALLO Nº {config.chosenWinnerHorseNumber}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onUpdateConfig({ ...config, chosenWinnerHorseNumber: null })}
                  className="text-[11px] text-amber-400 hover:underline font-semibold"
                >
                  Quitar (Aleatorio)
                </button>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <span className="text-xs text-slate-400">
                Ganador elegido: <strong>{config.chosenWinnerHorseNumber ? `Caballo #${config.chosenWinnerHorseNumber}` : 'Simulación Aleatoria'}</strong>
              </span>

              <button
                type="button"
                onClick={() => onStartRaceManual(config.chosenWinnerHorseNumber || null)}
                className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-extrabold text-xs uppercase font-racing tracking-wider flex items-center gap-2 shadow-lg transition-transform active:scale-95"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>INICIAR CARRERA EN VIVO (30s)</span>
              </button>
            </div>
          </div>

          {/* Real-time Risk Exposure Table */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
            <h4 className="text-sm font-bold text-white font-racing uppercase tracking-wide flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-400" />
              <span>Análisis de Riesgo y Liquidación por Caballo</span>
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2">Caballo</th>
                    <th className="py-2">Cuota</th>
                    <th className="py-2">Apostado en Sala</th>
                    <th className="py-2">Compromiso si Gana</th>
                    <th className="py-2">Balance Resultante</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {horses.map(h => {
                    const payoutIfWins = h.totalBetsBs * (h.currentMultiplier + 1);
                    const netIfWins = (config.cajaInicialBs + activeRacePoolBs) - payoutIfWins;
                    const isDeficit = netIfWins < 0;

                    return (
                      <tr key={h.number} className="hover:bg-slate-900/40">
                        <td className="py-2 font-sans font-bold flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: h.colorHex }} />
                          #{h.number} {h.name}
                        </td>
                        <td className="py-2 text-amber-400 font-bold">x{h.currentMultiplier}</td>
                        <td className="py-2 text-slate-200">{formatBs(h.totalBetsBs)}</td>
                        <td className="py-2 text-rose-400">{formatBs(payoutIfWins)}</td>
                        <td className={`py-2 font-bold ${isDeficit ? 'text-rose-500' : 'text-emerald-400'}`}>
                          {formatBs(netIfWins)} {isDeficit ? '⚠️ Déficit' : '✅ Cubierto'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Caja Inicial y Retiros del Propietario */}
      {activeTab === 'caja' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Transfer Net House Profit to Owner Balance */}
          <div className="md:col-span-2 p-5 bg-gradient-to-br from-amber-950/40 via-slate-950 to-emerald-950/30 rounded-2xl border-2 border-amber-500/50 shadow-xl space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <span className="text-[10px] font-bold text-amber-400 font-racing uppercase tracking-wider block">
                  RECAUDACIÓN NETA DE TAQUILLA
                </span>
                <h4 className="text-lg font-bold text-white font-racing tracking-wide flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-amber-400 shrink-0" />
                  <span>REFLEJAR GANANCIAS RECAUDADAS EN MI SALDO PERSONAL</span>
                </h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  Todo lo que se va ganando en jugadas de la plataforma puedes reflejarlo en tu saldo disponible con este botón cuando tú quieras.
                </p>
              </div>

              <div className="p-2.5 bg-slate-900/90 border border-emerald-500/50 rounded-xl text-left sm:text-right shrink-0">
                <span className="text-[10px] text-slate-400 uppercase font-racing block">Ganancia Neta Pendiente:</span>
                <span className="text-2xl font-mono font-black text-emerald-400">
                  +{formatBs(pendingNetProfitBs)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 bg-slate-900/70 rounded-xl border border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Total Recaudado en Jugadas:</span>
                <span className="font-mono font-bold text-slate-200 text-sm">{formatBs(totalCollectedBs)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Total Pagado en Premios:</span>
                <span className="font-mono font-bold text-rose-400 text-sm">{formatBs(totalPaidOutBs)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Ganancia Ya Acreditada a Tu Saldo:</span>
                <span className="font-mono font-bold text-amber-400 text-sm">{formatBs(transferredProfitBs)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTransferProfitClick}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-racing font-extrabold text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-[0.99] transition-all cursor-pointer"
            >
              <DollarSign className="w-5 h-5 fill-current" />
              <span>TRANSFERIR GANANCIA NETA A MI SALDO (+{formatBs(pendingNetProfitBs)})</span>
            </button>
          </div>

          {/* Edit Caja Inicial */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
            <h4 className="text-base font-bold text-white font-racing tracking-wide flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-amber-400" />
              <span>AJUSTAR CAJA INICIAL Y SALDO DISPONIBLE (JUAN)</span>
            </h4>
            <p className="text-xs text-slate-400">
              Tu Caja Inicial es directamente tu Saldo Disponible como propietario. Cualquier monto que modifiques aquí se sincroniza y refleja de inmediato en tu saldo.
            </p>

            <form onSubmit={handleSaveCaja} className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Monto Caja Inicial (Bs)</label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={editCajaAmount}
                  onChange={(e) => setEditCajaAmount(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold text-base focus:border-amber-400 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase font-racing transition-colors"
              >
                Actualizar Caja Inicial
              </button>
            </form>
          </div>

          {/* Owner Personal Expense Withdrawals */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
            <h4 className="text-base font-bold text-white font-racing tracking-wide flex items-center gap-2">
              <ArrowDownCircle className="w-4 h-4 text-emerald-400" />
              <span>RETIRO PARA GASTOS PERSONALES (JUAN)</span>
            </h4>
            <p className="text-xs text-slate-400">
              Como propietario, puedes retirar ganancias directamente de la caja inicial para tus gastos personales.
            </p>

            <form onSubmit={handleOwnerExpenseWithdraw} className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Monto a Retirar (Bs)</label>
                <input
                  type="number"
                  min="1"
                  step="10"
                  value={ownerWithdrawAmount}
                  onChange={(e) => setOwnerWithdrawAmount(e.target.value)}
                  placeholder="Ej. 500"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold text-base focus:border-emerald-400 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase font-racing transition-colors"
              >
                Registrar Retiro Personal
              </button>
            </form>
          </div>

          {cajaSuccessMsg && (
            <div className="md:col-span-2 p-3 bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs rounded-xl">
              {cajaSuccessMsg}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Depósitos Pendientes */}
      {activeTab === 'depositos' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-bold text-white font-racing tracking-wide">
              SOLICITUDES DE DEPÓSITO PAGO MÓVIL
            </h4>
            <span className="text-xs text-slate-400">
              Al hacer click en <strong>Aceptar</strong>, el saldo se acreditará inmediatamente en la cuenta del jugador.
            </span>
          </div>

          {transactions.filter(t => t.type === 'deposito').length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs bg-slate-950 rounded-2xl border border-slate-800">
              No hay depósitos registrados.
            </div>
          ) : (
            <div className="space-y-2.5">
              {transactions
                .filter(t => t.type === 'deposito')
                .map(tx => (
                  <div
                    key={tx.id}
                    className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{tx.userName}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          tx.status === 'aprobado'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : tx.status === 'rechazado'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800 animate-pulse'
                        }`}>
                          {tx.status}
                        </span>
                      </div>
                      <div className="text-slate-400 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                        <span>Referencia: <strong className="text-slate-200 font-mono">{tx.reference || 'N/A'}</strong></span>
                        <span>Fecha: {new Date(tx.createdAt).toLocaleTimeString('es-VE')}</span>
                      </div>
                      {tx.captureUrl && (
                        <div className="mt-2">
                          <a href={tx.captureUrl} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline flex items-center gap-1 font-semibold">
                            📷 Ver Comprobante / Capture de Pago
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-lg font-mono font-extrabold text-amber-400">
                        {formatBs(tx.amountBs)}
                      </span>

                      {tx.status === 'pendiente' && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onApproveDeposit(tx.id)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors flex items-center gap-1"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Aceptar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onRejectDeposit(tx.id)}
                            className="px-3 py-1.5 bg-rose-900/60 hover:bg-rose-800 text-rose-200 font-bold rounded-lg transition-colors flex items-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Rechazar</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Retiros Pendientes */}
      {activeTab === 'retiros' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-bold text-white font-racing tracking-wide">
              SOLICITUDES DE RETIRO PAGO MÓVIL
            </h4>
            <span className="text-xs text-slate-400">
              Transfiere desde tu banco a los datos de Pago Móvil y marca como pagado.
            </span>
          </div>

          {transactions.filter(t => t.type === 'retiro').length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs bg-slate-950 rounded-2xl border border-slate-800">
              No hay retiros registrados.
            </div>
          ) : (
            <div className="space-y-2.5">
              {transactions
                .filter(t => t.type === 'retiro')
                .map(tx => (
                  <div
                    key={tx.id}
                    className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{tx.userName}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          tx.status === 'aprobado'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}>
                          {tx.status === 'aprobado' ? 'Pagado' : 'Por Pagar'}
                        </span>
                      </div>
                      {tx.bankDetails && (
                        <div className="text-slate-300 mt-1 space-y-0.5 font-mono">
                          <div>Banco: <strong>{tx.bankDetails.bankName}</strong></div>
                          <div>Cédula: <strong>{tx.bankDetails.cedula}</strong> · Teléfono: <strong>{tx.bankDetails.phone}</strong></div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-lg font-mono font-extrabold text-emerald-400">
                        {formatBs(tx.amountBs)}
                      </span>

                      {tx.status === 'pendiente' && (
                        <button
                          type="button"
                          onClick={() => onPayWithdrawal(tx.id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors flex items-center gap-1"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Marcar Pagado</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Base de Datos Central de Usuarios Registrados */}
      {activeTab === 'usuarios' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
            <div>
              <h4 className="text-base sm:text-lg font-bold text-white font-racing tracking-wide flex items-center gap-2">
                <Database className="w-5 h-5 text-amber-400" />
                <span>BASE DE DATOS OFICIAL DE USUARIOS REGISTRADOS</span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Registro de nombres, cédulas, teléfonos, correos y contraseñas de acceso de todos los usuarios registrados.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[260px]">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por nombre, cédula, correo o tel..."
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="space-y-3">
            {filteredUsers.map(u => {
              const isPasswordRevealed = !!revealedPasswords[u.id];

              return (
                <div 
                  key={u.id} 
                  className="p-4 bg-slate-950 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all space-y-3 shadow-md"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-racing font-bold text-sm">
                        {u.name.charAt(0)}{u.lastName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm font-racing tracking-wide">
                            {u.name} {u.lastName}
                          </span>
                          {u.role === 'admin' ? (
                            <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 text-[10px] font-extrabold font-racing uppercase tracking-wider shadow">
                              👑 PROPIETARIO
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono">
                              Jugador
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono">
                          Registrado: {new Date(u.createdAt).toLocaleDateString('es-VE')} ({new Date(u.createdAt).toLocaleTimeString('es-VE')})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <div className="text-right mr-2">
                        <span className="text-[10px] text-slate-500 block uppercase font-mono">Saldo:</span>
                        <span className="font-mono font-bold text-amber-400 text-sm">{formatBs(u.balance)}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setEditingUser(u)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-xs font-bold font-racing flex items-center gap-1"
                        title="Editar Datos"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>

                      {u.id !== currentUser?.id && (
                        <button
                          type="button"
                          onClick={() => onImpersonateUser(u)}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold font-racing uppercase transition-colors"
                        >
                          Ingresar a su Cuenta
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Complete User Credentials Grid (Requested: correo, nombre, teléfono, cédula y contraseña) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-mono font-semibold">Cédula de Identidad:</span>
                      <strong className="text-white font-mono text-sm block mt-0.5">{u.cedula}</strong>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-mono font-semibold">Teléfono Móvil:</span>
                      <strong className="text-white font-mono text-sm block mt-0.5">{u.phone}</strong>
                    </div>

                    <div className="min-w-0">
                      <span className="text-slate-500 block text-[10px] uppercase font-mono font-semibold">Correo Electrónico:</span>
                      <strong className="text-white font-mono text-xs block mt-0.5 truncate" title={u.email}>{u.email}</strong>
                    </div>

                    {/* Contraseña con la que se registró con botón para ver */}
                    <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="text-amber-400 block text-[10px] uppercase font-mono font-bold flex items-center gap-1">
                          <KeyRound className="w-3 h-3 text-amber-400" />
                          <span>Contraseña:</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setRevealedPasswords(prev => ({ ...prev, [u.id]: !prev[u.id] }))}
                          className="text-slate-400 hover:text-amber-300 text-[10px] flex items-center gap-1 font-mono transition-colors"
                          title={isPasswordRevealed ? "Ocultar Contraseña" : "Ver Contraseña Registrada"}
                        >
                          {isPasswordRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          <span>{isPasswordRevealed ? 'Ocultar' : 'Ver Clave'}</span>
                        </button>
                      </div>

                      <div className="flex items-center justify-between mt-1">
                        <strong className="text-white font-mono text-xs tracking-wider">
                          {isPasswordRevealed ? (u.password || 'Sin contraseña') : '••••••••••••'}
                        </strong>

                        {isPasswordRevealed && u.password && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(u.password || '');
                              setCopiedId(u.id);
                              setTimeout(() => setCopiedId(null), 2000);
                            }}
                            className="text-amber-400 hover:text-amber-300 text-[10px]"
                            title="Copiar contraseña"
                          >
                            {copiedId === u.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Cuentas de Pago Móvil asociadas */}
                  {u.bankAccounts && u.bankAccounts.length > 0 && (
                    <div className="pt-1 text-[11px] text-slate-400 flex flex-wrap gap-2 items-center">
                      <span className="text-slate-500 font-semibold font-mono text-[10px]">Cuentas Pago Móvil:</span>
                      {u.bankAccounts.map(acc => (
                        <span key={acc.id} className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-300 font-mono">
                          {acc.bankName} (CI: {acc.cedula} · Tel: {acc.phone})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Modal to edit user details */}
          {editingUser && (
            <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-md w-full space-y-3">
                <h4 className="text-base font-bold text-white font-racing">
                  EDITAR DATOS DE USUARIO: {editingUser.name}
                </h4>

                <div className="space-y-2 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-0.5">Nombre y Apellido</label>
                    <input
                      type="text"
                      value={editingUser.name}
                      onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-0.5">Teléfono</label>
                    <input
                      type="text"
                      value={editingUser.phone}
                      onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-0.5">Saldo en Cuenta (Bs)</label>
                    <input
                      type="number"
                      step="5"
                      value={editingUser.balance}
                      onChange={(e) => setEditingUser({ ...editingUser, balance: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-amber-400 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-0.5">Restablecer Contraseña</label>
                    <input
                      type="text"
                      placeholder="Nueva contraseña..."
                      onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onEditUser(editingUser);
                      setEditingUser(null);
                    }}
                    className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs"
                  >
                    Guardar Cambios
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-3 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 6: Historial de Tickets */}
      {activeTab === 'tickets' && (
        <div className="space-y-3">
          <h4 className="text-base font-bold text-white font-racing tracking-wide">
            TODOS LOS TICKETS REGISTRADOS
          </h4>
          <div className="space-y-2">
            {tickets.map(t => (
              <div key={t.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-amber-400">{t.ticketNumber}</span>
                    <span className="text-slate-300 font-semibold">{t.userName}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                      t.status === 'ganado' ? 'bg-emerald-950 text-emerald-300' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {t.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {t.selections.map(s => `Caballo #${s.horseNumber} (${formatBs(s.stakeBs)})`).join(' · ')}
                  </div>
                </div>

                <div className="text-right font-mono">
                  <div className="text-slate-400 text-[10px]">Apostado: {formatBs(t.totalStakeBs)}</div>
                  {t.totalPaidBs ? (
                    <div className="text-emerald-400 font-bold">Pagó: {formatBs(t.totalPaidBs)}</div>
                  ) : (
                    <div className="text-slate-500">Pendiente</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 7: Publicar en Google y Descargar como App (PWA) */}
      {activeTab === 'publicacion' && (
        <div className="space-y-5 animate-in fade-in">
          {/* Tarjeta de Seguridad y Privacidad Absoluta */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-950/70 via-slate-900 to-emerald-950/70 rounded-2xl border-2 border-emerald-500/50 space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-emerald-400 font-racing font-extrabold uppercase tracking-widest block">
                  SEGURIDAD Y PRIVACIDAD TOTAL DE LAS CUENTAS
                </span>
                <h4 className="text-base sm:text-lg font-bold text-white font-racing">
                  Tus Cuentas y Saldos Son 100% Privados
                </h4>
              </div>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed">
              Lo que está publicado en Internet y en Google es <strong>exclusivamente la plataforma (el software de apuestas)</strong>. Ninguna cuenta personal, saldo, contraseña o datos de usuario se publican jamás. Cuando un cliente o visitante abre el enlace en su teléfono, entra en una sesión limpia sin iniciar sesión, y <strong>por ley tiene que registrarse o iniciar sesión con sus propias credenciales</strong>. Nadie puede ver tu cuenta de propietario ni entrar a este panel, el cual está protegido por tu PIN secreto (526352).
            </p>
          </div>

          {/* Tarjeta Enlace Público Oficial */}
          <div className="p-4 sm:p-5 bg-gradient-to-br from-slate-950 via-[#0a101f] to-slate-950 rounded-2xl border-2 border-amber-500/40 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-amber-400 font-racing font-extrabold uppercase tracking-widest block">
                  ENLACE OFICIAL DE PRODUCCIÓN
                </span>
                <h4 className="text-base sm:text-lg font-bold text-white font-racing">
                  Dirección Web Pública de la Plataforma
                </h4>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Comparte este enlace para que cualquier persona en Venezuela o el mundo pueda registrarse como usuario nuevo, jugar en las carreras cada 30 minutos y descargar la aplicación oficial en su teléfono.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-900 p-2.5 rounded-xl border border-slate-800">
              <input
                type="text"
                readOnly
                value="https://ais-pre-3wp4t237qpvcpijqj3n55b-893014071003.us-east1.run.app/"
                className="flex-1 bg-transparent text-amber-300 font-mono text-xs px-2 py-1 outline-none select-all truncate"
              />
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText('https://ais-pre-3wp4t237qpvcpijqj3n55b-893014071003.us-east1.run.app/');
                    setCopiedPublicUrl(true);
                    setTimeout(() => setCopiedPublicUrl(false), 3000);
                  }}
                  className="flex-1 sm:flex-none py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-racing font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                >
                  {copiedPublicUrl ? <Check className="w-3.5 h-3.5 text-slate-950" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPublicUrl ? '¡Copiado!' : 'Copiar Enlace'}</span>
                </button>

                <a
                  href={`https://wa.me/?text=${encodeURIComponent('🏇 ¡Entra a JeyhBet! La plataforma oficial de carreras de caballos en vivo cada 30 minutos en Venezuela. Recargas y retiros instantáneos por Pago Móvil en Bolívares (Bs) a partir de 100 Bs. Regístrate o instala la app aquí: https://ais-pre-3wp4t237qpvcpijqj3n55b-893014071003.us-east1.run.app/')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-racing font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Compartir en WhatsApp</span>
                </a>
              </div>
            </div>
          </div>

          {/* Tarjeta de Publicación en Google y Motores de Búsqueda */}
          <div className="p-4 sm:p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold">
                <Search className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white font-racing">
                  Aparecer en el Buscador de Google (SEO)
                </h4>
                <p className="text-xs text-slate-400">
                  Configuración técnica implementada para indexar JeyhBet en Google en los primeros resultados.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <CheckCircle className="w-4 h-4" />
                  <span>Robots.txt para Googlebot</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Configurado en <code className="text-amber-400">/robots.txt</code> con permiso total a Googlebot para indexar todas las páginas.
                </p>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <CheckCircle className="w-4 h-4" />
                  <span>Mapa del Sitio (Sitemap XML)</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Disponible en <code className="text-amber-400">/sitemap.xml</code> con prioridad 1.0 y frecuencia continua para indexación rápida.
                </p>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <CheckCircle className="w-4 h-4" />
                  <span>OpenGraph & Tarjeta Social</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Banner HD de 1200x630px con vista previa atractiva cuando compartes el link en WhatsApp, Telegram o Facebook.
                </p>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <CheckCircle className="w-4 h-4" />
                  <span>Datos Estructurados Schema.org</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Etiquetas JSON-LD de Aplicación Web y Juegos para resaltar con estrellas y descripción en Google Search.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-blue-950/30 border border-blue-500/30 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-300">
                <ExternalLink className="w-4 h-4 text-blue-400" />
                <span>¿Cómo acelerar la aparición en Google?</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Google rastrea automáticamente los enlaces que se comparten en redes sociales y sitios web. Para que aparezca aún más rápido en los resultados de Google, puedes abrir <strong>Google Search Console</strong> con tu cuenta de Google y pegar tu enlace público para solicitar la indexación inmediata:
              </p>
              <a
                href="https://search.google.com/search-console/welcome"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-racing text-xs uppercase tracking-wider transition-colors"
              >
                <span>Abrir Google Search Console</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Tarjeta de Aplicación Descargable (PWA) */}
          <div className="p-4 sm:p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white font-racing">
                  Instalación como Aplicación Móvil (PWA)
                </h4>
                <p className="text-xs text-slate-400">
                  La plataforma está 100% equipada como Progressive Web App instalable en cualquier dispositivo.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-amber-400 uppercase font-racing block">
                  En Teléfonos Android (Samsung, Xiaomi, etc.)
                </span>
                <ol className="text-xs text-slate-300 space-y-1.5 list-decimal list-inside leading-relaxed">
                  <li>Al abrir el enlace en Google Chrome aparece el aviso <strong>"Instalar App"</strong>.</li>
                  <li>El usuario toca <strong>"Instalar"</strong> y se descarga el icono oficial de <strong>JeyhBet</strong> en la pantalla de inicio del teléfono.</li>
                  <li>Funciona a pantalla completa como una app nativa, rápida y ligera sin consumir memoria.</li>
                </ol>
              </div>

              <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-sky-400 uppercase font-racing block">
                  En iPhone / iPad (Apple iOS)
                </span>
                <ol className="text-xs text-slate-300 space-y-1.5 list-decimal list-inside leading-relaxed">
                  <li>Abre el enlace en el navegador <strong>Safari</strong> de iPhone.</li>
                  <li>Toca el botón <strong>Compartir</strong> (icono con flecha hacia arriba).</li>
                  <li>Selecciona <strong>"Agregar a pantalla de inicio"</strong> y presiona <strong>"Agregar"</strong>.</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
