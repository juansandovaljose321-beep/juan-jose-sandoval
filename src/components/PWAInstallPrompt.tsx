import React, { useState } from 'react';
import { Download, Smartphone, X, Share2, Check, ExternalLink, Globe } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallPrompt: React.FC = () => {
  const { isInstalled, showIOSGuide, setShowIOSGuide, showBrowserGuide, setShowBrowserGuide, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (isInstalled || dismissed) return null;

  const publicUrl = window.location.origin;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    });
  };

  return (
    <>
      <div className="bg-gradient-to-r from-amber-500/20 via-slate-900 to-amber-500/20 border-2 border-amber-500/50 rounded-2xl p-3.5 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center shrink-0 shadow-md">
            <Smartphone className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-white text-xs sm:text-sm font-racing uppercase tracking-wide truncate">
                Descarga JeyhBet como Aplicación Oficial
              </h4>
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-400 text-slate-950">
                PWA
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              Instálala en tu teléfono o computadora para jugar en pantalla completa, más rápido y sin abrir navegador.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
          <button
            type="button"
            onClick={handleCopyLink}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-racing uppercase tracking-wider flex items-center gap-1.5 transition-all"
            title="Copiar enlace para compartir o publicar"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-amber-400" />}
            <span className="hidden sm:inline">{copiedLink ? '¡Copiado!' : 'Compartir'}</span>
          </button>

          <button
            type="button"
            onClick={install}
            className="flex-1 sm:flex-none py-2 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs uppercase font-racing tracking-wider shadow-lg flex items-center justify-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Instalar App</span>
          </button>

          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="p-1.5 text-slate-500 hover:text-slate-300 rounded-lg hover:bg-slate-800 transition-colors"
            title="Cerrar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modal Instructivo para Android / Navegador General */}
      {showBrowserGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border-2 border-amber-500/40 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                  <Smartphone className="w-4 h-4" />
                </div>
                <h4 className="text-sm sm:text-base font-bold text-white font-racing">
                  CÓMO INSTALAR JEYHBET
                </h4>
              </div>
              <button 
                onClick={() => setShowBrowserGuide(false)} 
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Puedes instalar la aplicación de <strong>JeyhBet</strong> en tu teléfono o computadora desde el menú del navegador:
            </p>

            <div className="space-y-3 bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-xs text-slate-300">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  1
                </span>
                <p>
                  Abre el menú de tu navegador tocando los <strong>tres puntos (⋮)</strong> en la esquina superior o inferior.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  2
                </span>
                <p>
                  Toca la opción <strong>"Instalar aplicación"</strong> o <strong>"Agregar a la pantalla principal"</strong>.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  3
                </span>
                <p>
                  Confirma tocando <strong>"Instalar"</strong>. El icono oficial de JeyhBet se colocará en tu pantalla como cualquier aplicación instalada.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowBrowserGuide(false)}
              className="w-full py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-extrabold rounded-xl text-xs uppercase font-racing tracking-wider shadow-lg active:scale-95 transition-all cursor-pointer"
            >
              ¡Entendido!
            </button>
          </div>
        </div>
      )}

      {/* Modal Instructivo para iPhone / iPad iOS Safari */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border-2 border-amber-500/40 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                  <Smartphone className="w-4 h-4" />
                </div>
                <h4 className="text-sm sm:text-base font-bold text-white font-racing">
                  INSTALAR EN IPHONE / IPAD
                </h4>
              </div>
              <button 
                onClick={() => setShowIOSGuide(false)} 
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Apple Safari en iPhone permite instalar <strong>JeyhBet</strong> directamente en tu pantalla de inicio siguiendo estos 3 pasos:
            </p>

            <div className="space-y-3 bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-xs text-slate-300">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  1
                </span>
                <p>
                  Toca el botón <strong>Compartir</strong> en la barra inferior de Safari (el icono de un cuadro con una flecha hacia arriba: <span className="text-amber-400 font-bold">↑</span>).
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  2
                </span>
                <p>
                  Desliza hacia abajo en el menú de opciones y selecciona <strong>"Agregar a pantalla de inicio"</strong> (o <em>"Add to Home Screen"</em>).
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  3
                </span>
                <p>
                  Toca <strong>"Agregar"</strong> en la esquina superior derecha. ¡Listo! Tendrás el icono de <strong>JeyhBet</strong> junto a tus aplicaciones.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-extrabold rounded-xl text-xs uppercase font-racing tracking-wider shadow-lg active:scale-95 transition-all cursor-pointer"
            >
              ¡Entendido, voy a instalarla!
            </button>
          </div>
        </div>
      )}
    </>
  );
};
