import React, { useState } from 'react';
import { User, PlatformConfig } from '../types';
import { formatBs, parseBsInput, VENEZUELAN_BANKS } from '../utils/formatters';
import { X, Copy, Check, AlertOctagon, Send, ShieldCheck, Upload } from 'lucide-react';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  config: PlatformConfig;
  defaultAmount?: number;
  onSubmitDeposit: (amountBs: number, reference: string, captureUrl?: string, bankName?: string, customTxId?: string) => void;
}

export const DepositModal: React.FC<DepositModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  config,
  defaultAmount = 100,
  onSubmitDeposit,
}) => {
  const minDeposit = config.minDepositBs || 100;
  const [amountStr, setAmountStr] = useState<string>(defaultAmount.toString());
  const [reference, setReference] = useState<string>('');
  const [selectedBank, setSelectedBank] = useState<string>(VENEZUELAN_BANKS[0].name);
  const [captureUrl, setCaptureUrl] = useState<string>('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submittedTxId, setSubmittedTxId] = useState<string>('');

  if (!isOpen) return null;

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCaptureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setCaptureUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const amount = parseBsInput(amountStr);
    if (amount < minDeposit) {
      setErrorMsg(`El monto mínimo de recarga es de ${formatBs(minDeposit)} en adelante.`);
      return;
    }

    if (!reference.trim() && !captureUrl) {
      setErrorMsg('Por favor introduce el número de referencia o sube el capture del pago móvil.');
      return;
    }

    const txId = `tx_dep_${Date.now()}`;
    setSubmittedTxId(txId);
    onSubmitDeposit(amount, reference.trim() || 'Capture adjunto', captureUrl, selectedBank, txId);
    setIsSuccess(true);
  };

  // WhatsApp verification link generator to Owner's personal phone +58 4221475717
  const generateWhatsAppReportUrl = () => {
    const amount = parseBsInput(amountStr);
    const approvalLink = `${window.location.origin}/?action=approve_dep&txId=${submittedTxId}`;
    const text = encodeURIComponent(
      `🏇 *REPORTE DE PAGO MÓVIL - JEYHBET*\n\n` +
      `👤 *Jugador:* ${currentUser?.name} ${currentUser?.lastName} (${currentUser?.cedula})\n` +
      `📞 *Teléfono:* ${currentUser?.phone}\n` +
      `💰 *Monto a Acreditar:* ${formatBs(amount)}\n` +
      `🏦 *Banco Emisor:* ${selectedBank}\n` +
      `🔢 *Referencia:* ${reference || 'Ver Capture Adjunto'}\n` +
      `⏱️ *Fecha/Hora:* ${new Date().toLocaleTimeString('es-VE')}\n\n` +
      `⚡ *ENLACE DIRECTO PARA QUE JUAN ACEPTE Y ACREDITE EN 1 CLIC:*\n` +
      `${approvalLink}\n\n` +
      `_Por favor verificar para acreditar mi saldo de inmediato._`
    );
    return `https://wa.me/584221475717?text=${text}`;
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

        {isSuccess ? (
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-9 h-9" />
            </div>
            <h3 className="text-xl font-bold text-white font-racing tracking-wide">
              ¡REPORTE DE DEPÓSITO ENVIADO!
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed px-2">
              Tu depósito ha sido registrado en el sistema. Los pagos pueden demorar
              <strong> unos minutos o hasta 1 hora por verificación</strong> por parte del propietario.
            </p>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-left text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Monto Reportado:</span>
                <span className="font-bold text-amber-400 font-mono">{formatBs(parseBsInput(amountStr))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Referencia:</span>
                <span className="font-mono text-slate-200">{reference || 'Capture subido'}</span>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <a
                href={generateWhatsAppReportUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase flex items-center justify-center gap-2 shadow-lg transition-colors"
              >
                <Send className="w-4 h-4" />
                <span>Notificar por WhatsApp a Juan (+58 4221475717)</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  setIsSuccess(false);
                  onClose();
                }}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Volver al Juego
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <span className="text-xs font-bold text-amber-400 tracking-wider font-racing uppercase">
                RECARGA DE SALDO
              </span>
              <h3 className="text-xl font-extrabold text-white font-racing">
                DATOS OFICIALES DE PAGO MÓVIL
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Transfiere directamente a los datos oficiales de la plataforma para acreditar tus jugadas.
              </p>
            </div>

            {/* Official Pago Móvil Box */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-amber-500/30 space-y-2.5">
              <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center justify-between border-b border-slate-800 pb-1.5">
                <span>Cuenta Receptora Oficial</span>
                <span className="text-[10px] text-slate-400">Juan Sandoval</span>
              </div>

              {/* Bank */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Banco:</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">{config.pagoMovilOwner.bankName} ({config.pagoMovilOwner.bankCode})</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(config.pagoMovilOwner.bankCode, 'bank')}
                    className="text-amber-400 hover:text-amber-300 p-1"
                  >
                    {copiedField === 'bank' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Teléfono Pago Móvil:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-white text-sm">{config.pagoMovilOwner.phone}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(config.pagoMovilOwner.phone, 'phone')}
                    className="text-amber-400 hover:text-amber-300 p-1"
                  >
                    {copiedField === 'phone' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Cédula */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Cédula de Identidad:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-white text-sm">{config.pagoMovilOwner.cedula}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(config.pagoMovilOwner.cedula.replace('V-', ''), 'cedula')}
                    className="text-amber-400 hover:text-amber-300 p-1"
                  >
                    {copiedField === 'cedula' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Strict Warnings mandated by user */}
            <div className="p-3 bg-rose-950/40 border border-rose-900/80 rounded-xl space-y-1 text-[11px] text-rose-300">
              <div className="flex items-center gap-1.5 font-bold text-rose-400">
                <AlertOctagon className="w-4 h-4 shrink-0" />
                <span>ADVERTENCIA OBLIGATORIA:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-slate-300 pl-1">
                <li>Los pagos pueden demorar <strong>unos minutos o hasta 1 hora</strong> por verificación.</li>
                <li><strong>NO SE ACEPTAN:</strong> Ubii Pagos, Zinli, Wally, UnoPlata ni billeteras virtuales. Serán rechazados automáticamente.</li>
                <li>Solo transferencias y Pago Móvil de la banca financiera venezolana tradicional.</li>
              </ul>
            </div>

            {/* Report Form */}
            <form onSubmit={handleSubmit} className="space-y-3 pt-1">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Monto a Recargar (en Bs)
                  </label>
                  <span className="text-[10px] text-amber-400 font-bold">
                    Mínimo: {formatBs(minDeposit)}
                  </span>
                </div>

                <div className="relative">
                  <input
                    type="number"
                    min={minDeposit}
                    step="10"
                    required
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    placeholder={`Mínimo ${minDeposit} Bs (Ej. 100)`}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-mono font-bold text-base focus:border-amber-400 focus:outline-none"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">Bs</span>
                </div>

                {/* Quick amount chips */}
                <div className="grid grid-cols-5 gap-1.5 mt-2">
                  {[100, 200, 500, 1000, 2000].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setAmountStr(chip.toString())}
                      className={`py-1 rounded-lg text-[11px] font-mono font-bold border transition-colors ${
                        amountStr === chip.toString()
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      {chip} Bs
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Banco desde el que realizaste el pago
                </label>
                <select
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-amber-400 focus:outline-none"
                >
                  {VENEZUELAN_BANKS.map((b) => (
                    <option key={b.code} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Número de Referencia (Últimos 4 o 6 dígitos)
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Ej. 849201"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm focus:border-amber-400 focus:outline-none"
                />
              </div>

              {/* Capture Upload */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Comprobante o Capture de Pago (Opcional)
                </label>
                <div className="flex items-center gap-2">
                  <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 p-2.5 rounded-xl border border-dashed border-slate-700 hover:border-amber-400 bg-slate-950/60 text-slate-400 hover:text-amber-400 text-xs transition-colors">
                    <Upload className="w-4 h-4" />
                    <span>{captureUrl ? 'Capture adjunto (Click para cambiar)' : 'Adjuntar capture de Pago Móvil'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCaptureUpload}
                      className="hidden"
                    />
                  </label>
                  {captureUrl && (
                    <img src={captureUrl} alt="Capture" className="w-10 h-10 rounded-lg object-cover border border-amber-500" />
                  )}
                </div>
              </div>

              {errorMsg && (
                <div className="p-2.5 bg-rose-950/70 border border-rose-800 text-rose-300 text-xs rounded-xl">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-sm uppercase tracking-wider font-racing shadow-lg shadow-amber-500/20 active:scale-[0.99] transition-all"
              >
                REPORTAR Y VERIFICAR PAGO ({formatBs(parseBsInput(amountStr))})
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
