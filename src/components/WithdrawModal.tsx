import React, { useState } from 'react';
import { User, BankAccount } from '../types';
import { formatBs, parseBsInput, VENEZUELAN_BANKS } from '../utils/formatters';
import { X, Plus, AlertCircle, CheckCircle2, Send, Building } from 'lucide-react';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onAddBankAccount: (bank: Omit<BankAccount, 'id'>) => void;
  onProcessWithdrawal: (amountBs: number, account: BankAccount) => { success: boolean; error?: string };
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onAddBankAccount,
  onProcessWithdrawal,
}) => {
  const [amountStr, setAmountStr] = useState<string>('');
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [showAddBank, setShowAddBank] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'error' | 'success'; text: string; waLink?: string } | null>(null);

  // New bank form fields
  const [newBankName, setNewBankName] = useState<string>(VENEZUELAN_BANKS[0].name);
  const [newCedula, setNewCedula] = useState<string>(currentUser?.cedula || '');
  const [newPhone, setNewPhone] = useState<string>(currentUser?.phone || '');

  if (!isOpen) return null;

  const accounts = currentUser?.bankAccounts || [];
  const activeAccount = accounts.find(a => a.id === selectedBankId) || accounts[0];

  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhone.trim() || !newCedula.trim()) return;

    const bankObj = VENEZUELAN_BANKS.find(b => b.name === newBankName);
    onAddBankAccount({
      bankCode: bankObj?.code || '0102',
      bankName: newBankName,
      cedula: newCedula.trim(),
      phone: newPhone.trim(),
    });
    setShowAddBank(false);
  };

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    const amount = parseBsInput(amountStr);

    // If user has 0 or insufficient balance
    if (!currentUser || currentUser.balance <= 0) {
      setStatusMessage({
        type: 'error',
        text: 'Sin saldo suficiente. Tu saldo actual es de 0,00 Bs. Realiza jugadas ganadoras para poder retirar fondos.',
      });
      return;
    }

    if (amount <= 0) {
      setStatusMessage({
        type: 'error',
        text: 'Por favor ingresa un monto válido a retirar.',
      });
      return;
    }

    const minWithdraw = 100;
    if (amount < minWithdraw) {
      setStatusMessage({
        type: 'error',
        text: `El monto mínimo de retiro es de ${formatBs(minWithdraw)} en adelante.`,
      });
      return;
    }

    if (amount > currentUser.balance) {
      setStatusMessage({
        type: 'error',
        text: `Sin saldo suficiente. Estás intentando retirar ${formatBs(amount)}, pero tu saldo disponible es de ${formatBs(currentUser.balance)}.`,
      });
      return;
    }

    if (!activeAccount) {
      setStatusMessage({
        type: 'error',
        text: 'Por favor agrega primero tu cuenta de Pago Móvil con el botón (+).',
      });
      return;
    }

    const res = onProcessWithdrawal(amount, activeAccount);
    if (res.success) {
      // Create WhatsApp notification text to Owner +58 4221475717
      const text = encodeURIComponent(
        `🏇 *SOLICITUD DE RETIRO - JEYHBET*\n\n` +
        `👤 *Usuario:* ${currentUser.name} ${currentUser.lastName} (${currentUser.cedula})\n` +
        `💰 *Monto a Transferir:* ${formatBs(amount)} (Debitado únicamente lo solicitado del saldo)\n` +
        `🏦 *Banco Destino:* ${activeAccount.bankName}\n` +
        `🪪 *Cédula Pago Móvil:* ${activeAccount.cedula}\n` +
        `📱 *Teléfono Pago Móvil:* ${activeAccount.phone}\n` +
        `⏱️ *Hora:* ${new Date().toLocaleTimeString('es-VE')}\n\n` +
        `⚡ *ENLACE DIRECTO PARA QUE JUAN REGISTRE EL PAGO REALIZADO:*\n` +
        `${window.location.origin}/?action=pay_wth\n\n` +
        `_Estimado Juan, por favor procesar mi transferencia de pago móvil._`
      );
      const waLink = `https://wa.me/584221475717?text=${text}`;

      setStatusMessage({
        type: 'success',
        text: `¡Solicitud registrada con éxito! Se ha debitado únicamente ${formatBs(amount)} de tu saldo. Notifica al propietario Juan Sandoval para que realice tu Pago Móvil de inmediato.`,
        waLink,
      });
      setAmountStr('');
    } else {
      setStatusMessage({
        type: 'error',
        text: res.error || 'Ocurrió un error al procesar la solicitud.',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-4">
          <div>
            <span className="text-xs font-bold text-amber-400 tracking-wider font-racing uppercase">
              RETIRO DE FONDOS
            </span>
            <h3 className="text-xl font-extrabold text-white font-racing">
              SOLICITAR PAGO MÓVIL
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Los pagos se procesan directamente a tu cuenta bancaria venezolana registrada.
            </p>
          </div>

          {/* Current Balance Banner */}
          <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">Saldo Disponible en Cuenta:</span>
            <span className="text-lg font-mono font-extrabold text-emerald-400">
              {formatBs(currentUser?.balance || 0)}
            </span>
          </div>

          {/* Bank Accounts Section with (+) Button */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">
                Tu Cuenta de Pago Móvil Registrada
              </label>
              <button
                type="button"
                onClick={() => setShowAddBank(!showAddBank)}
                className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/30"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Cuenta</span>
              </button>
            </div>

            {/* List of existing bank accounts */}
            {accounts.length > 0 ? (
              <div className="space-y-2">
                {accounts.map(acc => (
                  <div
                    key={acc.id}
                    onClick={() => setSelectedBankId(acc.id)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      (activeAccount?.id === acc.id)
                        ? 'border-amber-500 bg-amber-500/10 text-white'
                        : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <div className="flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-amber-400" />
                        <span>{acc.bankName}</span>
                      </div>
                      <span className="text-[10px] text-amber-400">
                        {activeAccount?.id === acc.id ? 'Seleccionada' : 'Elegir'}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400 flex gap-3">
                      <span>C.I: {acc.cedula}</span>
                      <span>Tel: {acc.phone}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-xl border border-dashed border-slate-700 text-center text-xs text-slate-400">
                No tienes ninguna cuenta de Pago Móvil agregada. Haz click en <strong>Agregar Cuenta (+)</strong> para ingresar tus datos.
              </div>
            )}

            {/* Form to add bank account */}
            {showAddBank && (
              <form onSubmit={handleAddAccount} className="p-3.5 bg-slate-950 rounded-2xl border border-amber-500/30 space-y-2.5 animate-in fade-in duration-150">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wide block">
                  Agregar Nueva Cuenta Bancaria
                </span>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-0.5">Banco Venezolano</label>
                  <select
                    value={newBankName}
                    onChange={(e) => setNewBankName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  >
                    {VENEZUELAN_BANKS.map(b => (
                      <option key={b.code} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-0.5">Cédula</label>
                    <input
                      type="text"
                      required
                      placeholder="V-12345678"
                      value={newCedula}
                      onChange={(e) => setNewCedula(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-0.5">Teléfono</label>
                    <input
                      type="text"
                      required
                      placeholder="04141234567"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors"
                  >
                    Guardar Cuenta
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddBank(false)}
                    className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-lg"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Amount to Withdraw */}
          <form onSubmit={handleWithdraw} className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-slate-300">
                  Monto a Retirar (en Bs)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-amber-400 font-bold">
                    Mínimo: 100,00 Bs
                  </span>
                  {currentUser && currentUser.balance >= 100 && (
                    <button
                      type="button"
                      onClick={() => setAmountStr(currentUser.balance.toString())}
                      className="text-[11px] text-emerald-400 hover:underline font-semibold"
                    >
                      Retirar Todo ({formatBs(currentUser.balance)})
                    </button>
                  )}
                </div>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="100"
                  step="10"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="Mínimo 100 Bs (Ej. 100)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-mono font-bold text-base focus:border-emerald-400 focus:outline-none"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">Bs</span>
              </div>

              {/* Quick amount chips */}
              <div className="grid grid-cols-4 gap-1.5 mt-2">
                {[100, 200, 500, 1000].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setAmountStr(chip.toString())}
                    className={`py-1 rounded-lg text-[11px] font-mono font-bold border transition-colors ${
                      amountStr === chip.toString()
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    {chip} Bs
                  </button>
                ))}
              </div>
            </div>

            {/* Status alerts */}
            {statusMessage && (
              <div
                className={`p-3 rounded-xl text-xs space-y-2 ${
                  statusMessage.type === 'error'
                    ? 'bg-rose-950/70 border border-rose-800 text-rose-300'
                    : 'bg-emerald-950/70 border border-emerald-800 text-emerald-300'
                }`}
              >
                <div className="flex items-start gap-2">
                  {statusMessage.type === 'error' ? (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  )}
                  <span>{statusMessage.text}</span>
                </div>

                {statusMessage.waLink && (
                  <a
                    href={statusMessage.waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase flex items-center justify-center gap-2 transition-colors mt-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Avisar al Propietario por WhatsApp</span>
                  </a>
                )}
              </div>
            )}

            {/* Prominent Withdraw Button (Always available and clickable to give immediate feedback!) */}
            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-extrabold text-sm uppercase tracking-wider font-racing shadow-lg shadow-emerald-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
            >
              SOLICITAR RETIRO POR PAGO MÓVIL
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
