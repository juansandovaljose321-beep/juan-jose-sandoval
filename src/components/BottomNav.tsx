import React from 'react';
import { User } from '../types';
import { Gamepad2, Flag, Receipt, User as UserIcon, Shield } from 'lucide-react';

interface BottomNavProps {
  activeTab: 'apostar' | 'carrera' | 'tickets' | 'cuenta' | 'admin';
  onChangeTab: (tab: 'apostar' | 'carrera' | 'tickets' | 'cuenta' | 'admin') => void;
  currentUser: User | null;
  pendingTicketsCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  currentUser,
  pendingTicketsCount,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#070b14]/95 backdrop-blur-md border-t border-slate-800/80 px-2 py-1 safe-area-bottom">
      <div className="max-w-md mx-auto grid grid-cols-4 sm:grid-cols-5 items-center">
        {/* Tab 1: Apostar */}
        <button
          type="button"
          onClick={() => onChangeTab('apostar')}
          className={`min-h-[48px] flex flex-col items-center justify-center transition-colors ${
            activeTab === 'apostar' ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Gamepad2 className="w-5 h-5" />
          <span className="text-[10px] font-semibold tracking-tight mt-0.5">Apostar</span>
        </button>

        {/* Tab 2: En Vivo */}
        <button
          type="button"
          onClick={() => onChangeTab('carrera')}
          className={`min-h-[48px] flex flex-col items-center justify-center transition-colors ${
            activeTab === 'carrera' ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Flag className="w-5 h-5" />
          <span className="text-[10px] font-semibold tracking-tight mt-0.5">En Vivo</span>
        </button>

        {/* Tab 3: Mis Tickets */}
        <button
          type="button"
          onClick={() => onChangeTab('tickets')}
          className={`min-h-[48px] flex flex-col items-center justify-center relative transition-colors ${
            activeTab === 'tickets' ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Receipt className="w-5 h-5" />
          <span className="text-[10px] font-semibold tracking-tight mt-0.5">Mis Jugadas</span>
          {pendingTicketsCount > 0 && (
            <span className="absolute top-1 right-3 w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-bold text-[9px] flex items-center justify-center font-mono">
              {pendingTicketsCount}
            </span>
          )}
        </button>

        {/* Tab 4: Mi Cuenta */}
        <button
          type="button"
          onClick={() => onChangeTab('cuenta')}
          className={`min-h-[48px] flex flex-col items-center justify-center transition-colors ${
            activeTab === 'cuenta' ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserIcon className="w-5 h-5" />
          <span className="text-[10px] font-semibold tracking-tight mt-0.5">Mi Cuenta</span>
        </button>

        {/* Tab 5: Admin (if Owner) */}
        {currentUser?.role === 'admin' && (
          <button
            type="button"
            onClick={() => onChangeTab('admin')}
            className={`min-h-[48px] flex flex-col items-center justify-center transition-colors ${
              activeTab === 'admin' ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-5 h-5 text-amber-500" />
            <span className="text-[10px] font-bold tracking-tight mt-0.5 text-amber-400">Admin</span>
          </button>
        )}
      </div>
    </nav>
  );
};
