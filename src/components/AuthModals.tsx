import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { VENEZUELAN_BANKS } from '../utils/formatters';
import { generateRecoveryCode, verifyRecoveryCode } from '../utils/storage';
import { Eye, EyeOff, X, AlertCircle, CheckCircle2, KeyRound, Clock, Shield, Lock, UserPlus, LogIn } from 'lucide-react';

interface AuthModalsProps {
  isOpen: boolean;
  onClose: () => void;
  existingUsers: User[];
  onLoginSuccess: (user: User) => void;
  onRegisterSuccess: (newUser: User) => void;
  onPasswordResetSuccess: (email: string, newPass: string) => void;
  initialView?: 'login' | 'register';
  timeoutReason?: string | null;
  onClearTimeoutReason?: () => void;
}

export const AuthModals: React.FC<AuthModalsProps> = ({
  isOpen,
  onClose,
  existingUsers,
  onLoginSuccess,
  onRegisterSuccess,
  onPasswordResetSuccess,
  initialView = 'login',
  timeoutReason,
  onClearTimeoutReason,
}) => {
  const [view, setView] = useState<'login' | 'register' | 'forgot'>(initialView);

  useEffect(() => {
    if (initialView) {
      setView(initialView);
    }
  }, [initialView, isOpen]);

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Register form
  const [regName, setRegName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regCedula, setRegCedula] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regBank, setRegBank] = useState(VENEZUELAN_BANKS[0].name);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);

  // Recovery form
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryStep, setRecoveryStep] = useState<'request' | 'verify'>('request');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [enteredCode, setEnteredCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoverySuccess, setRecoverySuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  // Check unique cedula in real-time
  const normalizedRegCedula = regCedula.trim().toUpperCase();
  const isDuplicateCedula = existingUsers.some(
    u => u.cedula.replace(/[^0-9]/g, '') === normalizedRegCedula.replace(/[^0-9]/g, '') && normalizedRegCedula.length >= 6
  );

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const input = loginEmail.trim().toLowerCase();
    const cleanDigits = input.replace(/[^0-9]/g, '');

    // Allow login by email, cedula (with or without 'V-') or phone
    const user = existingUsers.find(u => {
      const emailMatch = u.email.toLowerCase() === input;
      const cedulaMatch = u.cedula.toLowerCase() === input || 
        (cleanDigits.length >= 6 && u.cedula.replace(/[^0-9]/g, '') === cleanDigits);
      const phoneMatch = cleanDigits.length >= 7 && u.phone.replace(/[^0-9]/g, '') === cleanDigits;
      return emailMatch || cedulaMatch || phoneMatch;
    });

    if (!user) {
      setLoginError('No se encontró ninguna cuenta con este correo, cédula o teléfono.');
      return;
    }

    if (user.password !== loginPassword) {
      setLoginError('Contraseña incorrecta. Por favor verifica tus datos o recupera tu contraseña.');
      return;
    }

    if (onClearTimeoutReason) {
      onClearTimeoutReason();
    }
    onLoginSuccess(user);
    onClose();
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegSuccess(null);

    if (isDuplicateCedula) {
      setRegError('Ya existe un usuario registrado con este número de cédula. Cada jugador debe tener una cédula única.');
      return;
    }

    if (existingUsers.some(u => u.email.toLowerCase() === regEmail.trim().toLowerCase())) {
      setRegError('Este correo electrónico ya se encuentra registrado.');
      return;
    }

    const bankObj = VENEZUELAN_BANKS.find(b => b.name === regBank);

    const newUser: User = {
      id: `usr_${Date.now()}`,
      name: regName.trim(),
      lastName: regLastName.trim(),
      email: regEmail.trim().toLowerCase(),
      password: regPassword,
      cedula: regCedula.trim().toUpperCase(),
      phone: regPhone.trim(),
      role: 'player',
      balance: 0,
      bankAccounts: [
        {
          id: `bnk_${Date.now()}`,
          bankCode: bankObj?.code || '0102',
          bankName: regBank,
          cedula: regCedula.trim().toUpperCase(),
          phone: regPhone.trim(),
        },
      ],
      createdAt: Date.now(),
    };

    onRegisterSuccess(newUser);
    onLoginSuccess(newUser); // Automatically log in the newly registered user!
    if (onClearTimeoutReason) {
      onClearTimeoutReason();
    }
    setRegSuccess('¡Registro exitoso! Iniciando sesión en tu cuenta...');
    setTimeout(() => {
      onClose();
      setRegSuccess(null);
    }, 1200);
  };

  const handleRequestRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);

    const exists = existingUsers.some(u => u.email.toLowerCase() === recoveryEmail.trim().toLowerCase());
    if (!exists) {
      setRecoveryError('No encontramos una cuenta con ese correo.');
      return;
    }

    const code = generateRecoveryCode(recoveryEmail);
    setGeneratedCode(code);
    setRecoveryStep('verify');
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);

    const isValid = verifyRecoveryCode(recoveryEmail, enteredCode);
    if (!isValid) {
      setRecoveryError('Código de verificación incorrecto o expirado.');
      return;
    }

    if (newPassword.length < 5) {
      setRecoveryError('La contraseña debe tener al menos 5 caracteres.');
      return;
    }

    onPasswordResetSuccess(recoveryEmail, newPassword);
    setRecoverySuccess('¡Contraseña restablecida con éxito! Ya puedes iniciar sesión.');
    setTimeout(() => {
      setLoginEmail(recoveryEmail);
      setView('login');
      setRecoverySuccess(null);
      setRecoveryStep('request');
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 10-Minute Timeout Notice Banner */}
        {timeoutReason && (
          <div className="mb-4 p-3.5 bg-amber-500/15 border-2 border-amber-500/60 rounded-2xl flex items-start gap-2.5 text-xs text-amber-200 shadow-md animate-in fade-in">
            <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
            <div>
              <strong className="block text-amber-300 font-racing font-bold text-sm uppercase">
                SESIÓN FINALIZADA (10 MINUTOS FUERA)
              </strong>
              <p className="text-slate-300 mt-0.5 leading-relaxed">
                {timeoutReason}
              </p>
            </div>
          </div>
        )}

        {/* Quick Tab Switcher: Iniciar Sesión / Registrarse */}
        {view !== 'forgot' && (
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950 rounded-2xl border border-slate-800 mb-4">
            <button
              type="button"
              onClick={() => { setView('login'); setLoginError(null); }}
              className={`py-2 px-3 rounded-xl font-racing font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                view === 'login'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Iniciar Sesión</span>
            </button>
            <button
              type="button"
              onClick={() => { setView('register'); setRegError(null); }}
              className={`py-2 px-3 rounded-xl font-racing font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                view === 'register'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Registrarse</span>
            </button>
          </div>
        )}

        {/* Privacy & Secret Account Note */}
        <div className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center gap-2 text-[11px] text-slate-400 mb-3">
          <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong className="text-slate-200">Cuentas 100% privadas:</strong> Cada jugador tiene sus credenciales secretas. Nadie entra automáticamente en cuenta ajena.
          </span>
        </div>

        {/* View 1: Login */}
        {view === 'login' && (
          <div className="space-y-4">
            <div>
              <span className="text-xs font-bold text-amber-400 tracking-wider font-racing uppercase">
                Bienvenido a JeyhBet
              </span>
              <h3 className="text-2xl font-extrabold text-white font-racing tracking-wide">
                INICIAR SESIÓN
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Ingresa con tu correo, cédula o teléfono y tu contraseña para jugar.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Correo Electrónico, Cédula o Teléfono
                </label>
                <input
                  type="text"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="ejemplo@gmail.com, V-12345678 o 04141234567"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Contraseña
                  </label>
                  <button
                    type="button"
                    onClick={() => setView('forgot')}
                    className="text-[11px] text-amber-400 hover:underline font-semibold"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-3 pr-10 py-2.5 text-white text-sm focus:border-amber-400 focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-white"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {loginError && (
                <div className="p-2.5 bg-rose-950/70 border border-rose-800 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm uppercase font-racing tracking-wider shadow-lg shadow-amber-500/20 active:scale-[0.99] transition-all"
              >
                ENTRAR AL SISTEMA
              </button>
            </form>

            <div className="text-center pt-2 border-t border-slate-800 text-xs text-slate-400">
              ¿No tienes cuenta todavía?{' '}
              <button
                type="button"
                onClick={() => setView('register')}
                className="text-amber-400 hover:underline font-bold"
              >
                Regístrate aquí
              </button>
            </div>
          </div>
        )}

        {/* View 2: Registration */}
        {view === 'register' && (
          <div className="space-y-4">
            <div>
              <span className="text-xs font-bold text-amber-400 tracking-wider font-racing uppercase">
                Nuevos Jugadores
              </span>
              <h3 className="text-2xl font-extrabold text-white font-racing tracking-wide">
                REGISTRO OFICIAL
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Crea tu cuenta única para apostar en bolívares venezolanos.
              </p>
            </div>

            <form onSubmit={handleRegister} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Nombre</label>
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Carlos"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:border-amber-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Apellido</label>
                  <input
                    type="text"
                    required
                    value={regLastName}
                    onChange={(e) => setRegLastName(e.target.value)}
                    placeholder="Mendoza"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Cédula Única</label>
                  <input
                    type="text"
                    required
                    value={regCedula}
                    onChange={(e) => setRegCedula(e.target.value)}
                    placeholder="V-28123456"
                    className={`w-full bg-slate-950 border rounded-xl px-3 py-2 text-white text-xs font-mono focus:outline-none ${
                      isDuplicateCedula ? 'border-rose-500' : 'border-slate-700 focus:border-amber-400'
                    }`}
                  />
                  {isDuplicateCedula && (
                    <span className="text-[10px] text-rose-400 block mt-0.5 font-bold">
                      Cédula ya registrada en el sistema.
                    </span>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Teléfono</label>
                  <input
                    type="text"
                    required
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="04121234567"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Tu Banco para Pago Móvil
                </label>
                <select
                  value={regBank}
                  onChange={(e) => setRegBank(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                >
                  {VENEZUELAN_BANKS.map((b) => (
                    <option key={b.code} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="micorreo@gmail.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-3 pr-10 py-2 text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                  >
                    {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {regError && (
                <div className="p-2.5 bg-rose-950/70 border border-rose-800 text-rose-300 text-xs rounded-xl">
                  {regError}
                </div>
              )}

              {regSuccess && (
                <div className="p-2.5 bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{regSuccess}</span>
                </div>
              )}

              {/* Register button disabled if duplicate cedula */}
              <button
                type="submit"
                disabled={isDuplicateCedula}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm uppercase font-racing tracking-wider shadow-lg shadow-amber-500/20 active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                REGISTRARSE EN JEYHBET
              </button>
            </form>

            <div className="text-center pt-2 border-t border-slate-800 text-xs text-slate-400">
              ¿Ya estás registrado?{' '}
              <button
                type="button"
                onClick={() => setView('login')}
                className="text-amber-400 hover:underline font-bold"
              >
                Inicia sesión aquí
              </button>
            </div>
          </div>
        )}

        {/* View 3: Password Recovery */}
        {view === 'forgot' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-400" />
              <h3 className="text-xl font-extrabold text-white font-racing tracking-wide">
                RECUPERAR CONTRASEÑA
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Ingresa el correo que registraste para generar un código de verificación y reestablecer tu acceso.
            </p>

            {recoveryStep === 'request' ? (
              <form onSubmit={handleRequestRecovery} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Correo Electrónico Registrado
                  </label>
                  <input
                    type="email"
                    required
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    placeholder="tucorreo@gmail.com"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-amber-400 focus:outline-none"
                  />
                </div>

                {recoveryError && (
                  <div className="p-2.5 bg-rose-950/70 border border-rose-800 text-rose-300 text-xs rounded-xl">
                    {recoveryError}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase font-racing tracking-wider shadow-lg"
                >
                  SOLICITAR CÓDIGO DE RECUPERACIÓN
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-3">
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300">
                  Código de verificación generado: <strong className="font-mono text-base text-white">{generatedCode}</strong>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Ingresa el Código Recibido
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={enteredCode}
                    onChange={(e) => setEnteredCode(e.target.value)}
                    placeholder="123456"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-center text-lg font-mono tracking-widest text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Nueva Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-3 pr-10 py-2 text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {recoveryError && (
                  <div className="p-2.5 bg-rose-950/70 border border-rose-800 text-rose-300 text-xs rounded-xl">
                    {recoveryError}
                  </div>
                )}

                {recoverySuccess && (
                  <div className="p-2.5 bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{recoverySuccess}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase font-racing tracking-wider shadow-lg"
                >
                  CAMBIAR CONTRASEÑA Y ENTRAR
                </button>
              </form>
            )}

            <div className="text-center pt-2 border-t border-slate-800 text-xs text-slate-400">
              <button
                type="button"
                onClick={() => setView('login')}
                className="text-amber-400 hover:underline font-bold"
              >
                Volver a Iniciar Sesión
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
