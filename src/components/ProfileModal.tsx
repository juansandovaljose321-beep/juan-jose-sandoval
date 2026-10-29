import React, { useState } from 'react';
import { User, BankAccount, Transaction, BetTicket } from '../types';
import { formatBs, VENEZUELAN_BANKS } from '../utils/formatters';
import { X, UserCheck, Plus, MessageCircle, Building, History, Shield, LogOut } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  userTickets: BetTicket[];
  userTransactions: Transaction[];
  onAddBankAccount: (bank: Omit<BankAccount, 'id'>) => void;
  onLogout: () => void;
  supportPhone: string;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  userTickets,
  userTransactions,
  onAddBankAccount,
  onLogout,
  supportPhone,
}) => {
  const [tab, setTab] = useState<'perfil' | 'bancos' | 'historial'>('perfil');
  const [showAddBank, setShowAddBank] = useState<boolean>(false);
  const [newBankName, setNewBankName] = useState<string>(VENEZUELAN_BANKS[0].name);
  const [newCedula, setNewCedula] = useState<string>(currentUser?.cedula || '');
  const [newPhone, setNewPhone] = useState<string>(currentUser?.phone || '');

  if (!isOpen || !currentUser) return null;

  const handleSaveBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhone.trim() || !newCedula.trim()) return;

    const bankObj = VENEZUELAN_BANKS.find(b => b.name === newBankName);
    onAddBankAccount({
      bankCode: bankObj?.code || '0102',
      bankName: newBankName,
      cedula: newCedula.trim().toUpperCase(),
      phone: newPhone.trim(),
    });
    setShowAddBank(false);
  };

  const whatsappSupportUrl = `https://wa.me/${supportPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
    `Hola Juan Sandoval, me comunico desde la plataforma JeyhBet solicitando soporte para mi cuenta (${currentUser.name} ${currentUser.lastName}, C.I: ${currentUser.cedula}).`
  )}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* User Card Header */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-extrabold text-xl font-racing">
            {currentUser.name.charAt(0)}{currentUser.lastName.charAt(0)}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white leading-tight font-racing">
              {currentUser.name} {currentUser.lastName}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-mono text-amber-400 font-bold">
                Saldo: {formatBs(currentUser.balance)}
              </span>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                {currentUser.role === 'admin' ? 'Propietario' : 'Jugador Verificado'}
              </span>
            </div>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-1 border-b border-slate-800 my-3 text-xs font-semibold">
          <button
            onClick={() => setTab('perfil')}
            className={`flex-1 py-2 rounded-lg transition-colors ${
              tab === 'perfil' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Datos Personales
          </button>
          <button
            onClick={() => setTab('bancos')}
            className={`flex-1 py-2 rounded-lg transition-colors ${
              tab === 'bancos' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Cuentas Pago Móvil
          </button>
          <button
            onClick={() => setTab('historial')}
            className={`flex-1 py-2 rounded-lg transition-colors ${
              tab === 'historial' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Movimientos ({userTransactions.length})
          </button>
        </div>

        {/* Content 1: Personal Data */}
        {tab === 'perfil' && (
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-400">Nombre Completo:</span>
                <span className="font-semibold text-slate-200">{currentUser.name} {currentUser.lastName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-400">Cédula de Identidad:</span>
                <span className="font-mono font-semibold text-slate-200">{currentUser.cedula}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-400">Teléfono:</span>
                <span className="font-mono font-semibold text-slate-200">{currentUser.phone}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Correo Registrado:</span>
                <span className="font-semibold text-slate-200">{currentUser.email}</span>
              </div>
            </div>

            {/* Support WhatsApp Action as requested */}
            <div className="pt-2">
              <a
                href={whatsappSupportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase flex items-center justify-center gap-2 shadow-lg transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Soporte Oficial por WhatsApp ({supportPhone})</span>
              </a>
              <p className="text-[10px] text-slate-500 text-center mt-1">
                Atención directa con Juan Sandoval para asistencia o verificación especial.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        )}

        {/* Content 2: Bank Accounts & Pago Móvil */}
        {tab === 'bancos' && (
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-semibold">Tus Cuentas Bancarias Registradas:</span>
              <button
                type="button"
                onClick={() => setShowAddBank(!showAddBank)}
                className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/30"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar (+)</span>
              </button>
            </div>

            {/* List */}
            {currentUser.bankAccounts.map(acc => (
              <div key={acc.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-white">
                    <Building className="w-3.5 h-3.5 text-amber-400" />
                    <span>{acc.bankName}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    C.I: {acc.cedula} · Tel: {acc.phone}
                  </div>
                </div>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                  Activa
                </span>
              </div>
            ))}

            {showAddBank && (
              <form onSubmit={handleSaveBank} className="p-3 bg-slate-950 rounded-2xl border border-amber-500/40 space-y-2 mt-2">
                <span className="font-bold text-amber-400 block text-xs uppercase">
                  Nueva Cuenta Pago Móvil
                </span>
                <div>
                  <label className="text-[11px] text-slate-400 block">Banco</label>
                  <select
                    value={newBankName}
                    onChange={(e) => setNewBankName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white"
                  >
                    {VENEZUELAN_BANKS.map(b => (
                      <option key={b.code} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-400 block">Cédula</label>
                    <input
                      type="text"
                      required
                      value={newCedula}
                      onChange={(e) => setNewCedula(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block">Teléfono</label>
                    <input
                      type="text"
                      required
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button type="submit" className="flex-1 py-1.5 bg-amber-500 text-slate-950 font-bold rounded-lg text-xs">
                    Guardar
                  </button>
                  <button type="button" onClick={() => setShowAddBank(false)} className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs">
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Content 3: Transactions */}
        {tab === 'historial' && (
          <div className="space-y-2 text-xs max-h-[350px] overflow-y-auto pr-1">
            {userTransactions.length === 0 ? (
              <div className="p-4 text-center text-slate-400 bg-slate-950 rounded-xl">
                Aún no tienes transacciones registradas.
              </div>
            ) : (
              userTransactions.map(tx => (
                <div key={tx.id} className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white capitalize">{tx.type}</span>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] uppercase font-bold ${
                        tx.status === 'aprobado' ? 'text-emerald-400' : 'text-amber-400'
                      }`}>
                        {tx.status}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(tx.createdAt).toLocaleTimeString('es-VE')} {tx.reference ? `· Ref: ${tx.reference}` : ''}
                    </div>
                  </div>
                  <span className={`font-mono font-bold text-sm ${
                    tx.type === 'deposito' || tx.type === 'premio' ? 'text-emerald-400' : 'text-slate-200'
                  }`}>
                    {tx.type === 'deposito' || tx.type === 'premio' ? '+' : '-'}{formatBs(tx.amountBs)}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
