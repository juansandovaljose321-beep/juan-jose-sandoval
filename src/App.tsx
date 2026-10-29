import React, { useState, useEffect, useRef } from 'react';
import { 
  User, Horse, BetTicket, Transaction, PlatformConfig, BetSelection, BankAccount,
  RaceHistoryRecord, ChatMessage
} from './types';
import { 
  getStoredUsers, saveStoredUsers, getCurrentUser, setCurrentUser as persistCurrentUser,
  getStoredConfig, saveStoredConfig, getStoredHorses, saveStoredHorses,
  getStoredTickets, saveStoredTickets, getStoredTransactions, saveStoredTransactions,
  getStoredRaceHistory, addRaceHistoryRecord, getStoredChatMessages, addChatMessage,
  cycleHorsesForNextRace, OWNER_USER, touchSessionActivity, checkSessionValidity,
  clearCurrentUserSession, SESSION_TIMEOUT_MS
} from './utils/storage';
import { formatBs, getNextRaceSchedule, getCaracasTime } from './utils/formatters';

// Components
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { RaceCanvas55s } from './components/RaceCanvas55s';
import { BettingBoard } from './components/BettingBoard';
import { DepositModal } from './components/DepositModal';
import { WithdrawModal } from './components/WithdrawModal';
import { OwnerAdminPanel } from './components/OwnerAdminPanel';
import { AuthModals } from './components/AuthModals';
import { ProfileModal } from './components/ProfileModal';
import { TicketHistory } from './components/TicketHistory';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { RaceHistoryModal } from './components/RaceHistoryModal';
import { CommunityChat } from './components/CommunityChat';
import { usePWAInstall } from './hooks/usePWAInstall';

import { 
  Play, Timer, Shield, AlertTriangle, ArrowRight, MessageCircle, 
  HelpCircle, Sparkles, RefreshCw, Smartphone, Trophy, Moon, Clock, LogIn, UserPlus, Wallet
} from 'lucide-react';

export default function App() {
  // --- Global Application State ---
  const [users, setUsers] = useState<User[]>(getStoredUsers);
  // Current user starts strictly from verified session (null for any new visitor/phone!)
  const [currentUser, setCurrentUserState] = useState<User | null>(getCurrentUser);
  const [sessionTimeoutNotice, setSessionTimeoutNotice] = useState<string | null>(null);
  const [initialAuthView, setInitialAuthView] = useState<'login' | 'register'>('login');

  const [config, setConfigState] = useState<PlatformConfig>(getStoredConfig);
  const [horses, setHorsesState] = useState<Horse[]>(getStoredHorses);
  const [tickets, setTicketsState] = useState<BetTicket[]>(getStoredTickets);
  const [transactions, setTransactionsState] = useState<Transaction[]>(getStoredTransactions);
  const [raceHistory, setRaceHistory] = useState<RaceHistoryRecord[]>(getStoredRaceHistory);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(getStoredChatMessages);

  // Active Navigation & Modals
  const [activeTab, setActiveTab] = useState<'apostar' | 'carrera' | 'tickets' | 'cuenta' | 'admin'>('apostar');
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [depositDefaultAmount, setDepositDefaultAmount] = useState<number>(50);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  // Open auth modal if user is not authenticated on startup
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(!getCurrentUser());
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [impersonatingRealAdmin, setImpersonatingRealAdmin] = useState<User | null>(null);
  // PWA Install State & Handlers
  const pwa = usePWAInstall();

  // Race Simulation State
  const [isRacing, setIsRacing] = useState(false);
  const [manualWinnerOverride, setManualWinnerOverride] = useState<number | null>(null);

  // Countdown timer to next scheduled race (Caracas time)
  const [scheduleInfo, setScheduleInfo] = useState(() => getNextRaceSchedule(config.taquillasAbiertas));


  // --- Real-time 10-Minute Departure & Inactivity Session Control ---
  useEffect(() => {
    // 1. Initial verification on mount
    if (currentUser) {
      const check = checkSessionValidity();
      if (!check.valid) {
        handleSetCurrentUser(null);
        setSessionTimeoutNotice(
          'Tu sesión ha expirado por superar más de 10 minutos fuera de la plataforma. Por tu seguridad, debes iniciar sesión nuevamente.'
        );
        setInitialAuthView('login');
        setIsAuthOpen(true);
      } else {
        touchSessionActivity();
      }
    }

    // 2. Visibility change listener (tab switch, minimizing browser, phone home screen)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // User leaves or minimizes the app -> record exact departure timestamp
        touchSessionActivity();
      } else if (document.visibilityState === 'visible') {
        // User returns to the platform -> verify if within 10 minutes
        if (currentUser) {
          const check = checkSessionValidity();
          if (!check.valid) {
            // Exceeded 10 minutes outside!
            handleSetCurrentUser(null);
            setSessionTimeoutNotice(
              'Tu sesión ha expirado automáticamente por superar más de 10 minutos fuera de la plataforma. Por tu seguridad, debes iniciar sesión nuevamente.'
            );
            setInitialAuthView('login');
            setIsAuthOpen(true);
          } else {
            // Returned within 10 minutes: keep session alive!
            touchSessionActivity();
          }
        }
      }
    };

    // 3. Window focus listener
    const handleWindowFocus = () => {
      if (currentUser) {
        const check = checkSessionValidity();
        if (!check.valid) {
          handleSetCurrentUser(null);
          setSessionTimeoutNotice(
            'Tu sesión ha expirado automáticamente por superar más de 10 minutos fuera de la plataforma. Por tu seguridad, debes iniciar sesión nuevamente.'
          );
          setInitialAuthView('login');
          setIsAuthOpen(true);
        } else {
          touchSessionActivity();
        }
      }
    };

    // 4. Save timestamp before leaving or closing
    const handlePageHide = () => {
      touchSessionActivity();
    };

    // 5. In-session activity tracking (throttled)
    let lastActivityTime = Date.now();
    const handleUserActivity = () => {
      const now = Date.now();
      if (now - lastActivityTime > 5000) {
        lastActivityTime = now;
        touchSessionActivity();
      }
    };

    // 6. Periodic check every 10 seconds while page is open
    const intervalTimer = setInterval(() => {
      if (currentUser) {
        const check = checkSessionValidity();
        if (!check.valid) {
          handleSetCurrentUser(null);
          setSessionTimeoutNotice(
            'Tu sesión ha expirado por superar 10 minutos de inactividad. Por tu seguridad, vuelve a iniciar sesión.'
          );
          setInitialAuthView('login');
          setIsAuthOpen(true);
        }
      }
    }, 10000);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);
    window.addEventListener('click', handleUserActivity, { passive: true });
    window.addEventListener('keydown', handleUserActivity, { passive: true });
    window.addEventListener('touchstart', handleUserActivity, { passive: true });
    window.addEventListener('scroll', handleUserActivity, { passive: true });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
      clearInterval(intervalTimer);
    };
  }, [currentUser]);

  const [profitTransferNotice, setProfitTransferNotice] = useState<string | null>(null);

  // Update State & Persistence Wrappers
  const handleSetCurrentUser = (user: User | null) => {
    setCurrentUserState(user);
    persistCurrentUser(user);
    if (!user) {
      clearCurrentUserSession();
    }
  };

  const handleUpdateConfig = (newConfig: PlatformConfig) => {
    setConfigState(newConfig);
    saveStoredConfig(newConfig);

    // Synchronize Caja Inicial directly with Owner's available balance:
    // "mi caja inicial es mi saldo disponible es decir si yo en caja inicial la modifico lo que tenga en caja inicial quiero que se me refleja en mi saldo disponible"
    const ownerIndex = users.findIndex(u => u.role === 'admin' || u.email.toLowerCase() === OWNER_USER.email.toLowerCase());
    if (ownerIndex !== -1) {
      const targetOwnerBalance = newConfig.cajaInicialBs + (newConfig.gananciaTransferidaAlSaldo || 0);
      if (users[ownerIndex].balance !== targetOwnerBalance) {
        const updatedUsers = [...users];
        updatedUsers[ownerIndex] = {
          ...updatedUsers[ownerIndex],
          balance: targetOwnerBalance,
        };
        setUsers(updatedUsers);
        saveStoredUsers(updatedUsers);

        if (currentUser && (currentUser.role === 'admin' || currentUser.email.toLowerCase() === OWNER_USER.email.toLowerCase())) {
          const freshOwner = { ...currentUser, balance: targetOwnerBalance };
          setCurrentUserState(freshOwner);
          persistCurrentUser(freshOwner);
        }
      }
    }
  };

  const handleUpdateHorses = (newHorses: Horse[]) => {
    setHorsesState(newHorses);
    saveStoredHorses(newHorses);
  };

  const handleUpdateUsers = (newUsers: User[]) => {
    setUsers(newUsers);
    saveStoredUsers(newUsers);
    if (currentUser) {
      const freshCurrent = newUsers.find(u => u.id === currentUser.id);
      if (freshCurrent) handleSetCurrentUser(freshCurrent);
    }
  };

  // Synchronize owner balance with cajaInicialBs on initial mount or when owner logs in
  useEffect(() => {
    const isOwner = currentUser?.role === 'admin' || currentUser?.email.toLowerCase() === OWNER_USER.email.toLowerCase();
    const targetOwnerBalance = config.cajaInicialBs + (config.gananciaTransferidaAlSaldo || 0);
    if (isOwner && currentUser && currentUser.balance !== targetOwnerBalance) {
      const fresh = { ...currentUser, balance: targetOwnerBalance };
      handleSetCurrentUser(fresh);
      const updatedUsers = users.map(u => (u.role === 'admin' || u.email.toLowerCase() === OWNER_USER.email.toLowerCase()) ? fresh : u);
      setUsers(updatedUsers);
      saveStoredUsers(updatedUsers);
    }
  }, [config.cajaInicialBs, config.gananciaTransferidaAlSaldo, currentUser?.id]);

  // Transfer Platform Net Profit to Owner's Personal Balance
  const handleTransferNetProfitToOwnerBalance = (): { success: boolean; transferredBs: number; message: string } => {
    const isOwner = currentUser?.role === 'admin' || currentUser?.email.toLowerCase() === OWNER_USER.email.toLowerCase();
    if (!isOwner || !currentUser) {
      return { success: false, transferredBs: 0, message: 'Operación permitida únicamente al propietario Juan Sandoval.' };
    }

    const totalCollected = tickets.reduce((sum, t) => sum + t.totalStakeBs, 0);
    const totalPaidOut = tickets.reduce((sum, t) => sum + (t.totalPaidBs || 0), 0);
    const platformNetProfit = totalCollected - totalPaidOut;
    const transferredSoFar = config.gananciaTransferidaAlSaldo || 0;
    const pendingProfit = Math.max(0, platformNetProfit - transferredSoFar);

    if (pendingProfit <= 0) {
      const msg = 'No hay ganancias netas nuevas de taquilla para transferir en este momento. A medida que los jugadores apuesten y se liquiden las carreras, podrás transferirlas a tu saldo.';
      setProfitTransferNotice(msg);
      setTimeout(() => setProfitTransferNotice(null), 6000);
      return { success: false, transferredBs: 0, message: msg };
    }

    // 1. Credit owner's personal balance
    const updatedBalance = currentUser.balance + pendingProfit;
    const updatedOwner: User = {
      ...currentUser,
      balance: updatedBalance,
    };
    const updatedUsers = users.map(u => 
      (u.role === 'admin' || u.email.toLowerCase() === OWNER_USER.email.toLowerCase())
        ? { ...u, balance: updatedBalance }
        : u
    );
    setUsers(updatedUsers);
    saveStoredUsers(updatedUsers);
    handleSetCurrentUser(updatedOwner);

    // 2. Update config tracking
    const newTransferred = transferredSoFar + pendingProfit;
    const updatedConfig: PlatformConfig = {
      ...config,
      gananciaTransferidaAlSaldo: newTransferred,
    };
    setConfigState(updatedConfig);
    saveStoredConfig(updatedConfig);

    // 3. Register transaction record
    const newTx: Transaction = {
      id: `tx_profit_${Date.now()}`,
      userId: currentUser.id,
      userName: `${currentUser.name} ${currentUser.lastName}`,
      type: 'ajuste_caja',
      amountBs: pendingProfit,
      status: 'aprobado',
      note: `Ganancia neta recaudada transferida a saldo personal del propietario (+${formatBs(pendingProfit)})`,
      createdAt: Date.now(),
    };
    handleUpdateTransactions([newTx, ...transactions]);

    const successMsg = `¡Ganancia neta transferida con éxito! Se han acreditado ${formatBs(pendingProfit)} a tu saldo personal. Nuevo saldo disponible: ${formatBs(updatedBalance)}.`;
    setProfitTransferNotice(successMsg);
    setTimeout(() => setProfitTransferNotice(null), 6000);

    return { success: true, transferredBs: pendingProfit, message: successMsg };
  };

  const handleUpdateTickets = (newTickets: BetTicket[]) => {
    setTicketsState(newTickets);
    saveStoredTickets(newTickets);
  };

  const handleUpdateTransactions = (newTransactions: Transaction[]) => {
    setTransactionsState(newTransactions);
    saveStoredTransactions(newTransactions);
  };

  // --- Betting Logic ---
  const handlePlaceBet = (selections: BetSelection[], totalStake: number) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return { success: false, error: 'Debes iniciar sesión.' };
    }

    if (!config.taquillasAbiertas) {
      return { 
        success: false, 
        error: 'Las taquillas están temporalmente cerradas por el propietario. Espera su apertura para apostar.' 
      };
    }

    if (scheduleInfo.isNightClosed && !config.taquillasAbiertas) {
      return { 
        success: false, 
        error: '🌙 Las taquillas están cerradas por horario nocturno. Reabrirán a las 09:00 AM (Zona Caracas).' 
      };
    }

    if (currentUser.balance < totalStake) {
      return { success: false, error: 'Saldo insuficiente.' };
    }

    // Deduct user balance
    const updatedUser: User = {
      ...currentUser,
      balance: currentUser.balance - totalStake,
    };

    // Update in users list
    const updatedUsers = users.map(u => u.id === currentUser.id ? updatedUser : u);
    handleUpdateUsers(updatedUsers);

    // Create Ticket
    const ticketNum = `TKT-${Math.floor(100000 + Math.random() * 900000)}`;
    const newTicket: BetTicket = {
      id: `tkt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      ticketNumber: ticketNum,
      userId: currentUser.id,
      userName: `${currentUser.name} ${currentUser.lastName}`,
      raceId: `race_${config.currentRaceNumber}`,
      raceNumber: config.currentRaceNumber,
      selections,
      totalStakeBs: totalStake,
      totalPotentialWinBs: selections.reduce((s, sel) => s + sel.potentialWinBs, 0),
      status: 'pendiente',
      createdAt: Date.now(),
    };

    handleUpdateTickets([newTicket, ...tickets]);

    // Create Transaction Record
    const newTx: Transaction = {
      id: `tx_${Date.now()}`,
      userId: currentUser.id,
      userName: `${currentUser.name} ${currentUser.lastName}`,
      type: 'apuesta',
      amountBs: totalStake,
      status: 'aprobado',
      note: `Ticket ${ticketNum} (Carrera #${config.currentRaceNumber})`,
      createdAt: Date.now(),
    };
    handleUpdateTransactions([newTx, ...transactions]);

    // Update horse bets pool
    const updatedHorses = horses.map(h => {
      const match = selections.find(s => s.horseNumber === h.number);
      if (match) {
        return {
          ...h,
          totalBetsBs: h.totalBetsBs + match.stakeBs,
          betCount: h.betCount + 1,
        };
      }
      return h;
    });
    handleUpdateHorses(updatedHorses);

    return { success: true };
  };

  // --- Start 30s Race ---
  const handleStartRace = (selectedWinner: number | null = null) => {
    if (isRacing) return;
    const target = selectedWinner || config.chosenWinnerHorseNumber || null;
    setManualWinnerOverride(target);
    setIsRacing(true);
    setActiveTab('carrera'); // Switch to live race view
  };

  // --- Live Community Chat Message Handler ---
  const handleSendChatMessage = (text: string, horsePicked?: number) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }
    const { timeStr } = getCaracasTime();
    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: currentUser.id,
      userName: `${currentUser.name} ${currentUser.lastName}`.trim(),
      userRole: currentUser.role,
      text,
      timeStr,
      timestamp: Date.now(),
      horsePicked,
    };
    const updated = addChatMessage(newMsg);
    setChatMessages(updated);
  };

  // --- Race Finish Callback ---
  const handleRaceFinish = (winnerHorseNumber: number) => {
    setIsRacing(false);

    const winningHorse = horses.find(h => h.number === winnerHorseNumber) || horses[0];
    const nextSchedule = getNextRaceSchedule();
    const { timeStr, dateStr } = getCaracasTime();

    const lastWinnerData = {
      raceNumber: config.currentRaceNumber,
      horseNumber: winningHorse.number,
      horseName: winningHorse.name,
      colorName: winningHorse.colorName,
      colorHex: winningHorse.colorHex,
      multiplier: winningHorse.currentMultiplier,
      nextRaceTimeStr: nextSchedule.nextSlotStr,
      nextRaceNotice: `Espera a la siguiente carrera a las ${nextSchedule.nextSlotStr} (Zona horaria Caracas)`,
      timestamp: Date.now(),
    };

    // Settle all pending tickets for current race
    let totalPaidToWinners = 0;
    const userWinningsMap: Record<string, number> = {};

    const updatedTickets = tickets.map(ticket => {
      if (ticket.status === 'pendiente' && ticket.raceNumber === config.currentRaceNumber) {
        // Check if any selection chose the winning horse
        const winningSelection = ticket.selections.find(s => s.horseNumber === winnerHorseNumber);

        if (winningSelection) {
          const payout = winningSelection.potentialWinBs;
          totalPaidToWinners += payout;
          userWinningsMap[ticket.userId] = (userWinningsMap[ticket.userId] || 0) + payout;

          return {
            ...ticket,
            status: 'ganado' as const,
            winningHorseNumber: winnerHorseNumber,
            totalPaidBs: payout,
          };
        } else {
          return {
            ...ticket,
            status: 'perdido' as const,
            winningHorseNumber: winnerHorseNumber,
          };
        }
      }
      return ticket;
    });

    handleUpdateTickets(updatedTickets);

    // Save official winner into Race History Database
    const historyRecord: RaceHistoryRecord = {
      id: `rec_${Date.now()}_${winnerHorseNumber}`,
      raceNumber: config.currentRaceNumber,
      winnerHorseNumber: winningHorse.number,
      winnerHorseName: winningHorse.name,
      winnerColorName: winningHorse.colorName,
      winnerColorHex: winningHorse.colorHex,
      multiplier: winningHorse.currentMultiplier,
      timeCaracas: timeStr,
      dateCaracas: dateStr,
      timestamp: Date.now(),
      totalPoolBs: winningHorse.totalBetsBs,
      totalPaidBs: totalPaidToWinners,
    };
    const updatedHistory = addRaceHistoryRecord(historyRecord);
    setRaceHistory(updatedHistory);

    // Broadcast winner notice into Community Chat
    const chatBroadcast: ChatMessage = {
      id: `chat_win_${Date.now()}`,
      userId: 'system',
      userName: 'OFICIAL JEYHBET',
      userRole: 'admin',
      text: `🏆 ¡OFICIAL! Carrera #${config.currentRaceNumber} ganada por el Caballo Nº ${winningHorse.number} ${winningHorse.name.toUpperCase()} (${winningHorse.colorName}) pagando x${winningHorse.currentMultiplier}. Próxima carrera: ${nextSchedule.nextSlotStr}.`,
      timeStr,
      timestamp: Date.now(),
      horsePicked: winningHorse.number,
    };
    const nextChat = addChatMessage(chatBroadcast);
    setChatMessages(nextChat);

    // Credit winners' balances
    if (Object.keys(userWinningsMap).length > 0) {
      const updatedUsers = users.map(u => {
        if (userWinningsMap[u.id]) {
          return {
            ...u,
            balance: u.balance + userWinningsMap[u.id],
          };
        }
        return u;
      });
      handleUpdateUsers(updatedUsers);

      // Create transactions for prizes
      const newPrizeTxs: Transaction[] = Object.entries(userWinningsMap).map(([uId, amount]) => {
        const u = users.find(usr => usr.id === uId);
        return {
          id: `tx_prize_${Date.now()}_${uId}`,
          userId: uId,
          userName: u ? `${u.name} ${u.lastName}` : 'Jugador Ganador',
          type: 'premio',
          amountBs: amount,
          status: 'aprobado',
          note: `Premio Carrera #${config.currentRaceNumber} - Caballo #${winnerHorseNumber}`,
          createdAt: Date.now(),
        };
      });
      handleUpdateTransactions([...newPrizeTxs, ...transactions]);
    }

    // Advance Race Number and cycle names / odds
    const nextRaceNum = config.currentRaceNumber + 1;
    handleUpdateConfig({
      ...config,
      currentRaceNumber: nextRaceNum,
      oddsRoundCounter: config.oddsRoundCounter + 1,
      lastRaceWinner: lastWinnerData,
    });

    // Rotate horses and reset bets for the new race
    const nextHorses = cycleHorsesForNextRace(nextRaceNum);
    handleUpdateHorses(nextHorses);
  };

  // --- Automated 30-Minute Race Trigger & Countdown Controller ---
  // "las carreras se iniciarán solas cada media hora claro dejando todo como está"
  const lastAutoStartedSlotRef = useRef<string>('');

  useEffect(() => {
    const checkAndRunAutomatedRace = () => {
      const schedule = getNextRaceSchedule(config.taquillasAbiertas);
      setScheduleInfo(schedule);

      // Automated launch condition:
      // 1. Taquillas must be open
      // 2. Daytime operating hours active (09:00 AM to 10:00 PM Caracas time)
      // 3. Not in night closure
      // 4. Not currently in a running race
      // 5. Countdown reached zero / race time reached for this 30-min slot
      if (
        config.taquillasAbiertas &&
        schedule.isActiveOperatingHours &&
        !schedule.isNightClosed &&
        !isRacing
      ) {
        if (schedule.secondsRemaining <= 0 || schedule.isRaceTime) {
          if (lastAutoStartedSlotRef.current !== schedule.currentSlotKey) {
            lastAutoStartedSlotRef.current = schedule.currentSlotKey;
            handleStartRace(null);
          }
        }
      }
    };

    checkAndRunAutomatedRace();
    const interval = setInterval(checkAndRunAutomatedRace, 1000);
    return () => clearInterval(interval);
  }, [config.taquillasAbiertas, isRacing, config.chosenWinnerHorseNumber]);

  // --- Deposits & Withdrawals ---
  const handleSubmitDeposit = (amountBs: number, reference: string, captureUrl?: string, bankName?: string) => {
    if (!currentUser) return;

    const newTx: Transaction = {
      id: `tx_dep_${Date.now()}`,
      userId: currentUser.id,
      userName: `${currentUser.name} ${currentUser.lastName}`,
      type: 'deposito',
      amountBs,
      status: 'pendiente', // Owner must verify or approve
      reference,
      captureUrl,
      bankDetails: {
        bankName: bankName || 'Banco de Venezuela',
        cedula: currentUser.cedula,
        phone: currentUser.phone,
      },
      createdAt: Date.now(),
    };

    handleUpdateTransactions([newTx, ...transactions]);
  };

  const handleApproveDeposit = (transactionId: string) => {
    const tx = transactions.find(t => t.id === transactionId);
    if (!tx || tx.status !== 'pendiente') return;

    // Credit the player's account
    const targetUser = users.find(u => u.id === tx.userId);
    if (targetUser) {
      const updatedUser: User = {
        ...targetUser,
        balance: targetUser.balance + tx.amountBs,
      };
      const updatedUsers = users.map(u => u.id === tx.userId ? updatedUser : u);
      handleUpdateUsers(updatedUsers);
    }

    // Mark transaction as approved
    const updatedTxs = transactions.map(t => 
      t.id === transactionId ? { ...t, status: 'aprobado' as const } : t
    );
    handleUpdateTransactions(updatedTxs);
  };

  const handleRejectDeposit = (transactionId: string) => {
    const updatedTxs = transactions.map(t => 
      t.id === transactionId ? { ...t, status: 'rechazado' as const } : t
    );
    handleUpdateTransactions(updatedTxs);
  };

  const handleProcessWithdrawal = (amountBs: number, account: BankAccount) => {
    if (!currentUser) return { success: false, error: 'No autenticado.' };
    if (currentUser.balance < amountBs) return { success: false, error: 'Saldo insuficiente.' };

    // Deduct immediately from user balance
    const updatedUser: User = {
      ...currentUser,
      balance: currentUser.balance - amountBs,
    };
    const updatedUsers = users.map(u => u.id === currentUser.id ? updatedUser : u);
    handleUpdateUsers(updatedUsers);

    // Create withdrawal transaction
    const newTx: Transaction = {
      id: `tx_wth_${Date.now()}`,
      userId: currentUser.id,
      userName: `${currentUser.name} ${currentUser.lastName}`,
      type: 'retiro',
      amountBs,
      status: 'pendiente', // Owner must transfer
      bankDetails: {
        bankName: account.bankName,
        cedula: account.cedula,
        phone: account.phone,
      },
      createdAt: Date.now(),
    };
    handleUpdateTransactions([newTx, ...transactions]);

    return { success: true };
  };

  const handlePayWithdrawal = (transactionId: string) => {
    const updatedTxs = transactions.map(t => 
      t.id === transactionId ? { ...t, status: 'aprobado' as const } : t
    );
    handleUpdateTransactions(updatedTxs);
  };

  // Add Bank Account to User
  const handleAddBankAccount = (bankData: Omit<BankAccount, 'id'>) => {
    if (!currentUser) return;
    const newAccount: BankAccount = {
      ...bankData,
      id: `bnk_${Date.now()}`,
    };
    const updatedUser: User = {
      ...currentUser,
      bankAccounts: [...currentUser.bankAccounts, newAccount],
    };
    const updatedUsers = users.map(u => u.id === currentUser.id ? updatedUser : u);
    handleUpdateUsers(updatedUsers);
  };

  // Impersonate / Assist User Flow
  const handleImpersonateUser = (targetUser: User) => {
    if (currentUser?.role === 'admin') {
      setImpersonatingRealAdmin(currentUser);
      handleSetCurrentUser(targetUser);
      setActiveTab('apostar');
    }
  };

  const handleReturnToAdmin = () => {
    if (impersonatingRealAdmin) {
      handleSetCurrentUser(impersonatingRealAdmin);
      setImpersonatingRealAdmin(null);
      setActiveTab('admin');
    }
  };

  // Format countdown string
  const formatCountdown = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const userTickets = tickets.filter(t => t.userId === currentUser?.id);
  const userTransactions = transactions.filter(t => t.userId === currentUser?.id);
  const pendingTicketsCount = userTickets.filter(t => t.status === 'pendiente').length;

  const totalCollectedBs = tickets.reduce((sum, t) => sum + t.totalStakeBs, 0);
  const totalPaidOutBs = tickets.reduce((sum, t) => sum + (t.totalPaidBs || 0), 0);
  const platformNetProfitBs = totalCollectedBs - totalPaidOutBs;
  const transferredProfitBs = config.gananciaTransferidaAlSaldo || 0;
  const pendingNetProfitBs = Math.max(0, platformNetProfitBs - transferredProfitBs);
  const isOwner = currentUser?.role === 'admin' || currentUser?.email.toLowerCase() === OWNER_USER.email.toLowerCase();

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950 pb-20 sm:pb-12">
      {/* Impersonation Banner if Owner is inside a player's account */}
      {impersonatingRealAdmin && (
        <div className="sticky top-0 z-50 bg-amber-500 text-slate-950 font-bold px-4 py-2 text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span>
              MODO ASISTENCIA ACTIVO: Viendo la cuenta de <strong>{currentUser?.name} {currentUser?.lastName}</strong> ({currentUser?.cedula})
            </span>
          </div>
          <button
            onClick={handleReturnToAdmin}
            className="px-3 py-1 bg-slate-950 text-amber-400 rounded-lg text-xs font-racing uppercase tracking-wider hover:bg-slate-900 transition-colors"
          >
            Regresar al Panel Propietario
          </button>
        </div>
      )}

      {/* Main Top Header */}
      <Header
        currentUser={currentUser}
        config={config}
        onOpenDeposit={() => {
          setDepositDefaultAmount(100);
          setIsDepositOpen(true);
        }}
        onOpenWithdraw={() => setIsWithdrawOpen(true)}
        onOpenAuth={(view?: 'login' | 'register') => {
          setInitialAuthView(view || 'login');
          setSessionTimeoutNotice(null);
          setIsAuthOpen(true);
        }}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenAdmin={() => setActiveTab('admin')}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenChat={() => setIsChatOpen(!isChatOpen)}
        onInstallPwa={pwa.install}
        isPwaInstallable={!pwa.isInstalled}
      />

      {/* Main Vertical Responsive Container - guaranteed no horizontal overflow */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-3 sm:px-6 py-4 space-y-4 overflow-hidden">
        {/* PWA In-App Install Prompt Banner */}
        <PWAInstallPrompt />

        {/* Tarjeta Vertical Principal de Saldo y Operaciones (100% visible dentro de la pantalla vertical sin echar hacia la derecha) */}
        {currentUser && (
          <div className="bg-gradient-to-br from-slate-900 via-[#0c1322] to-slate-900 border-2 border-amber-500/40 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 w-full sm:w-auto">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-slate-950 flex items-center justify-center font-black shadow-lg shrink-0">
                <Wallet className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-racing font-extrabold uppercase text-amber-400 tracking-wider">
                    MI SALDO DISPONIBLE
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    (Bolívares Digitales)
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-mono font-black text-white tracking-tight break-all">
                  {formatBs(currentUser.balance)}
                </div>
                <p className="text-[11px] text-slate-400 truncate">
                  Usuario: <strong className="text-slate-200">{currentUser.name} {currentUser.lastName}</strong> · Cédula: <span className="font-mono text-slate-300">{currentUser.cedula}</span>
                </p>
              </div>
            </div>

            {/* Botones de Operación: Recargar y Retirar visibles dentro de la pantalla vertical */}
            <div className="grid grid-cols-2 gap-2.5 w-full sm:w-auto shrink-0">
              <button
                type="button"
                onClick={() => {
                  setDepositDefaultAmount(100);
                  setIsDepositOpen(true);
                }}
                className="py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-racing font-extrabold text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              >
                <span className="text-base leading-none font-black">+</span>
                <span>Recargar</span>
              </button>

              <button
                type="button"
                onClick={() => setIsWithdrawOpen(true)}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-white border border-amber-500/30 font-racing font-extrabold text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              >
                <span className="text-base leading-none font-black">⤓</span>
                <span>Retirar</span>
              </button>
            </div>
          </div>
        )}

        {/* Tarjeta Exclusiva del Propietario (Juan Sandoval) - Sincronización Caja Inicial y Ganancia Neta Recaudada */}
        {currentUser && isOwner && (
          <div className="bg-gradient-to-br from-amber-950/60 via-slate-900 to-emerald-950/40 border-2 border-amber-400/80 rounded-2xl p-4 shadow-xl space-y-3 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-500/20 pb-2.5">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-400" />
                <div>
                  <span className="text-[10px] text-amber-400 font-racing font-extrabold uppercase tracking-widest block leading-none">
                    CONTROL DEL PROPIETARIO (JUAN SANDOVAL)
                  </span>
                  <h4 className="text-base font-extrabold text-white font-racing">
                    CAJA INICIAL Y GANANCIA NETA RECAUDADA
                  </h4>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-300 font-mono">
                  Caja Inicial: <strong className="text-amber-400">{formatBs(config.cajaInicialBs)}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('admin')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 text-amber-300 hover:text-white border border-amber-500/30 text-[10px] font-racing font-bold uppercase transition-colors"
                >
                  Modificar Caja
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs text-slate-300 block">
                  Ganancia Neta Recaudada por Taquilla (Disponible para tu saldo):
                </span>
                <div className="text-xl sm:text-2xl font-mono font-black text-emerald-400 mt-0.5">
                  +{formatBs(pendingNetProfitBs)}
                </div>
                <p className="text-[11px] text-slate-400">
                  Total recaudado: <span className="font-mono text-slate-200">{formatBs(totalCollectedBs)}</span> · Premios pagados: <span className="font-mono text-rose-400">{formatBs(totalPaidOutBs)}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={handleTransferNetProfitToOwnerBalance}
                className="py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-racing font-extrabold text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shrink-0"
              >
                <Sparkles className="w-4 h-4 fill-current" />
                <span>TRANSFERIR GANANCIA NETA A MI SALDO (+{formatBs(pendingNetProfitBs)})</span>
              </button>
            </div>

            {profitTransferNotice && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-500/80 rounded-xl text-xs font-semibold text-emerald-200 flex items-center justify-between">
                <span>{profitTransferNotice}</span>
                <button
                  type="button"
                  onClick={() => setProfitTransferNotice(null)}
                  className="text-slate-400 hover:text-white text-xs px-2 py-0.5 bg-slate-900 rounded"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        )}

        {/* Unauthenticated / Guest Notification Banner */}
        {!currentUser && (
          <div className="bg-gradient-to-r from-amber-500/15 via-slate-900 to-amber-500/15 border-2 border-amber-500/50 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 font-bold shadow">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <span className="font-racing font-extrabold text-white text-sm sm:text-base uppercase tracking-wide block">
                  ACCESO PRIVADO Y SEGURO A JEYHBET
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Todos los usuarios son secretos e independientes. Inicia sesión con tus credenciales o regístrate si entras por primera vez desde este teléfono.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  setInitialAuthView('login');
                  setSessionTimeoutNotice(null);
                  setIsAuthOpen(true);
                }}
                className="flex-1 sm:flex-initial py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-racing font-extrabold text-xs uppercase tracking-wider shadow-md transition-all active:scale-95"
              >
                Iniciar Sesión
              </button>
              <button
                type="button"
                onClick={() => {
                  setInitialAuthView('register');
                  setSessionTimeoutNotice(null);
                  setIsAuthOpen(true);
                }}
                className="flex-1 sm:flex-initial py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-racing font-bold text-xs uppercase tracking-wider border border-slate-700 transition-all active:scale-95"
              >
                Registrarse
              </button>
            </div>
          </div>
        )}

        {/* Next Scheduled Race Countdown & Status Banner */}
        <div className={`bg-gradient-to-r ${
          isRacing
            ? 'from-emerald-950/95 via-slate-950 to-emerald-950/95 border-emerald-400 shadow-emerald-900/30'
            : scheduleInfo.isNightClosed 
            ? 'from-indigo-950/90 via-slate-950 to-indigo-950/90 border-indigo-700/60' 
            : scheduleInfo.isEarlyMorningOpen
            ? 'from-amber-950/70 via-slate-950 to-amber-950/70 border-amber-500/70'
            : 'from-slate-900 via-slate-950 to-slate-900 border-slate-800'
        } border rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg transition-all`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${
              isRacing
                ? 'bg-emerald-500 text-slate-950 font-black shadow-lg shadow-emerald-500/30 animate-bounce'
                : scheduleInfo.isNightClosed 
                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40' 
                : scheduleInfo.isEarlyMorningOpen
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
            } flex items-center justify-center shrink-0`}>
              {isRacing ? (
                <Sparkles className="w-5 h-5 fill-current" />
              ) : scheduleInfo.isNightClosed ? (
                <Moon className="w-5 h-5" />
              ) : scheduleInfo.isEarlyMorningOpen ? (
                <Sparkles className="w-5 h-5 text-amber-400" />
              ) : (
                <Timer className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center flex-wrap gap-2">
                <span className="font-racing font-extrabold text-base text-white uppercase tracking-wide">
                  {isRacing
                    ? `🏇 ¡CARRERA EN PISTA! (EN VIVO 30s)`
                    : scheduleInfo.isNightClosed 
                    ? 'CERRADO (10:01 PM - 09:00 AM)' 
                    : scheduleInfo.isEarlyMorningOpen
                    ? '☀️ BUENOS DÍAS · PRIMERA JUGADA: 09:00 AM'
                    : `PRÓXIMA CARRERA AUTOMÁTICA: ${scheduleInfo.nextSlotStr}`}
                </span>
                <span className={`text-[10px] ${
                  isRacing
                    ? 'bg-emerald-500 text-slate-950 font-black animate-pulse'
                    : scheduleInfo.isNightClosed 
                    ? 'bg-indigo-900/60 text-indigo-300 border border-indigo-700/50' 
                    : scheduleInfo.isEarlyMorningOpen
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'bg-slate-800 text-amber-400'
                } font-mono font-bold px-2 py-0.5 rounded`}>
                  {isRacing
                    ? `En Vivo · Carrera #${config.currentRaceNumber}`
                    : scheduleInfo.isNightClosed 
                    ? 'Reapertura Mañana 09:00 AM' 
                    : scheduleInfo.isEarlyMorningOpen
                    ? 'Taquillas Abiertas'
                    : `Carrera #${config.currentRaceNumber} · Auto 30m`}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isRacing
                  ? `Compitiendo los 6 ejemplares en la pista de 30 segundos. Liquidación automática de tickets al cruzar la meta.`
                  : scheduleInfo.nextRaceTimeNotice}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-center">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block font-medium">
                {isRacing ? 'Estado de Pista:' : scheduleInfo.isNightClosed ? 'Reapertura En:' : 'Partida Automática En:'}
              </span>
              <span className={`text-lg font-mono font-extrabold ${isRacing ? 'text-emerald-400 animate-pulse' : 'text-amber-400'} tracking-wider`}>
                {isRacing ? '¡CORRIENDO!' : formatCountdown(scheduleInfo.secondsRemaining)}
              </span>
            </div>

            {/* Quick Historial Button */}
            <button
              type="button"
              onClick={() => setIsHistoryOpen(true)}
              className="py-2 px-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-amber-400 border border-amber-500/30 font-racing font-bold text-xs uppercase flex items-center gap-1.5 transition-colors shadow"
              title="Ver Historial de Ganadores"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Historial</span>
            </button>

            {/* Owner Manual Force Start Option */}
            {currentUser?.role === 'admin' && (
              <button
                type="button"
                disabled={isRacing}
                onClick={() => handleStartRace(null)}
                className="py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-racing font-extrabold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md transition-transform active:scale-95 disabled:opacity-50"
                title="Control del Propietario: Iniciar carrera manual de 30 segundos"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{isRacing ? 'Corriendo (30s)...' : 'Lanzar Carrera Manual (30s)'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab View: APOSTAR (Tablero + Carreras) */}
        {activeTab === 'apostar' && (
          <div className="space-y-4">
            {/* Live 30s Race Track Preview / Running View */}
            <RaceCanvas55s
              horses={horses}
              isRacing={isRacing}
              onRaceFinish={handleRaceFinish}
              predeterminedWinner={manualWinnerOverride || config.chosenWinnerHorseNumber || null}
              raceNumber={config.currentRaceNumber}
            />

            {/* Persistent Winner Announcement Banner (Only during operating daytime hours) */}
            {!scheduleInfo.isNightClosed && config.lastRaceWinner && (
              <div className="p-4 bg-gradient-to-r from-amber-500/20 via-slate-900 to-amber-500/10 border-2 border-amber-400/80 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl animate-in fade-in">
                <div className="flex items-center gap-3.5">
                  <div
                    className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center text-white font-extrabold shadow-lg shrink-0 border-2 border-amber-400"
                    style={{ backgroundColor: config.lastRaceWinner.colorHex }}
                  >
                    <span className="text-[10px] font-bold uppercase">Nº</span>
                    <span className="text-3xl font-racing font-black leading-none">{config.lastRaceWinner.horseNumber}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-amber-400 font-racing font-bold uppercase tracking-wider block">
                      🏆 ÚLTIMO GANADOR OFICIAL · CARRERA #{config.lastRaceWinner.raceNumber}
                    </span>
                    <h4 className="text-xl font-racing font-extrabold text-white">
                      ¡GANÓ EL CABALLO Nº {config.lastRaceWinner.horseNumber} {config.lastRaceWinner.horseName.toUpperCase()}!
                    </h4>
                    <p className="text-xs text-slate-300 font-mono">
                      Color: <strong>{config.lastRaceWinner.colorName}</strong> · Cuota pagada: <strong className="text-emerald-400">x{config.lastRaceWinner.multiplier}</strong>
                    </p>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-950/80 border border-amber-500/40 rounded-xl text-center sm:text-right shrink-0">
                  <span className="text-xs sm:text-sm font-racing font-bold text-amber-300 block uppercase">
                    ⏰ ESPERA A LA SIGUIENTE CARRERA A LAS {config.lastRaceWinner.nextRaceTimeStr}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Zona Horaria Caracas
                  </span>
                </div>
              </div>
            )}

            {/* Morning Early Open Welcome Card */}
            {scheduleInfo.isEarlyMorningOpen && config.taquillasAbiertas && (
              <div className="p-4 bg-gradient-to-r from-amber-500/20 via-slate-900 to-amber-500/15 border-2 border-amber-400 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl animate-in fade-in">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/50 flex items-center justify-center shrink-0 shadow-inner">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[11px] text-amber-400 font-racing font-bold uppercase tracking-wider block">
                      ☀️ BIENVENIDO AL HIPÓDROMO JEYHBET
                    </span>
                    <h4 className="text-base sm:text-lg font-racing font-extrabold text-white">
                      Buenos días, hacer sus jugadas antes de las 9 de la mañana que es la primera jugada del día
                    </h4>
                    <p className="text-xs text-slate-300">
                      Taquillas abiertas para que selecciones tus caballos y armes tus tickets antes de la primera partida oficial de las 09:00 AM.
                    </p>
                  </div>
                </div>
                <div className="p-2.5 bg-slate-950/90 border border-amber-500/50 rounded-xl text-center sm:text-right shrink-0">
                  <span className="text-xs sm:text-sm font-racing font-bold text-amber-300 block uppercase">
                    PRIMERA CARRERA A LAS 09:00 AM
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Zona Horaria Caracas
                  </span>
                </div>
              </div>
            )}

            {/* Night Closed Notice only if taquillas are actually closed */}
            {!config.taquillasAbiertas && scheduleInfo.isNightClosed && (
              <div className="p-4 bg-gradient-to-r from-indigo-950/80 via-slate-900 to-indigo-950/80 border border-indigo-600/70 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 flex items-center justify-center shrink-0">
                    <Moon className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[11px] text-indigo-400 font-racing font-bold uppercase tracking-wider block">
                      🌙 HIPÓDROMO CERRADO POR HORARIO NOCTURNO
                    </span>
                    <h4 className="text-base sm:text-lg font-racing font-extrabold text-white">
                      Taquillas cerradas automáticamente a las 10:01 PM
                    </h4>
                    <p className="text-xs text-slate-300">
                      No hay carreras activas durante la noche. Las partidas se reanudan a las <strong>09:00 AM</strong>.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsHistoryOpen(true)}
                  className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-racing font-bold text-xs uppercase flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <Trophy className="w-4 h-4" />
                  <span>Historial de Ganadores</span>
                </button>
              </div>
            )}

            {/* Hero / Promo Strip */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-lg">
              <div className="flex flex-col md:flex-row items-center justify-between p-4 sm:p-5 gap-4">
                <div className="space-y-1.5 max-w-lg">
                  <span className="text-xs font-bold text-amber-400 tracking-wider font-racing uppercase flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Plataforma Oficial de Hipismo Venezolano</span>
                  </span>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white font-racing tracking-wide leading-tight">
                    CARRERAS EN VIVO Y APUESTAS EN BOLÍVARES
                  </h2>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    6 caballos en pista en tiempo real. Multiplicadores dinámicos que aumentan cada 5 rondas. Recargas y retiros directos por Pago Móvil.
                  </p>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {!currentUser ? (
                    <button
                      type="button"
                      onClick={() => setIsAuthOpen(true)}
                      className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase font-racing tracking-wider shadow-md transition-all"
                    >
                      Registrarse para Apostar
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setDepositDefaultAmount(100);
                        setIsDepositOpen(true);
                      }}
                      className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase font-racing tracking-wider shadow-md transition-all"
                    >
                      Recargar Saldo (Bs)
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Betting Board */}
            <BettingBoard
              horses={horses}
              currentUser={currentUser}
              config={config}
              allTickets={tickets}
              isNightClosed={scheduleInfo.isNightClosed}
              isEarlyMorningOpen={scheduleInfo.isEarlyMorningOpen}
              onPlaceBet={handlePlaceBet}
              onOpenDeposit={(needed) => {
                setDepositDefaultAmount(needed || 100);
                setIsDepositOpen(true);
              }}
              onOpenAuth={() => setIsAuthOpen(true)}
            />
          </div>
        )}

        {/* Tab View: EN VIVO / CARRERA */}
        {activeTab === 'carrera' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-extrabold text-white font-racing">
                  HIPÓDROMO EN TIEMPO REAL
                </h3>
                <p className="text-xs text-slate-400">
                  Carreras de 30 segundos con física realista, jinetes con chaquetillas oficiales y foto finish.
                </p>
              </div>

              {currentUser?.role === 'admin' && !isRacing && (
                <button
                  type="button"
                  onClick={() => handleStartRace(null)}
                  className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-extrabold text-xs rounded-xl uppercase font-racing flex items-center gap-1.5 shadow-lg transition-transform active:scale-95"
                  title="Control del Propietario: Iniciar Carrera (30s)"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Iniciar Carrera (Propietario)</span>
                </button>
              )}
            </div>

            <RaceCanvas55s
              horses={horses}
              isRacing={isRacing}
              onRaceFinish={handleRaceFinish}
              predeterminedWinner={manualWinnerOverride || config.chosenWinnerHorseNumber || null}
              raceNumber={config.currentRaceNumber}
            />

            {/* Winner Announcement Card */}
            {!scheduleInfo.isNightClosed && config.lastRaceWinner && (
              <div className="p-4 bg-gradient-to-r from-amber-500/20 via-slate-900 to-amber-500/10 border-2 border-amber-400/80 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl animate-in fade-in">
                <div className="flex items-center gap-3.5">
                  <div
                    className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center text-white font-extrabold shadow-lg shrink-0 border-2 border-amber-400"
                    style={{ backgroundColor: config.lastRaceWinner.colorHex }}
                  >
                    <span className="text-[10px] font-bold uppercase">Nº</span>
                    <span className="text-3xl font-racing font-black leading-none">{config.lastRaceWinner.horseNumber}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-amber-400 font-racing font-bold uppercase tracking-wider block">
                      🏆 ÚLTIMO GANADOR OFICIAL · CARRERA #{config.lastRaceWinner.raceNumber}
                    </span>
                    <h4 className="text-xl font-racing font-extrabold text-white">
                      ¡GANÓ EL CABALLO Nº {config.lastRaceWinner.horseNumber} {config.lastRaceWinner.horseName.toUpperCase()}!
                    </h4>
                    <p className="text-xs text-slate-300 font-mono">
                      Color: <strong>{config.lastRaceWinner.colorName}</strong> · Cuota pagada: <strong className="text-emerald-400">x{config.lastRaceWinner.multiplier}</strong>
                    </p>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-950/80 border border-amber-500/40 rounded-xl text-center sm:text-right shrink-0">
                  <span className="text-xs sm:text-sm font-racing font-bold text-amber-300 block uppercase">
                    ⏰ ESPERA A LA SIGUIENTE CARRERA A LAS {config.lastRaceWinner.nextRaceTimeStr}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Zona Horaria Caracas
                  </span>
                </div>
              </div>
            )}

            {/* Morning Early Open Welcome Card */}
            {scheduleInfo.isEarlyMorningOpen && config.taquillasAbiertas && (
              <div className="p-4 bg-gradient-to-r from-amber-500/20 via-slate-900 to-amber-500/15 border-2 border-amber-400 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl animate-in fade-in">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/50 flex items-center justify-center shrink-0 shadow-inner">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[11px] text-amber-400 font-racing font-bold uppercase tracking-wider block">
                      ☀️ BIENVENIDO AL HIPÓDROMO JEYHBET
                    </span>
                    <h4 className="text-base sm:text-lg font-racing font-extrabold text-white">
                      Buenos días, hacer sus jugadas antes de las 9 de la mañana que es la primera jugada del día
                    </h4>
                    <p className="text-xs text-slate-300">
                      Taquillas abiertas para que selecciones tus caballos y armes tus tickets antes de la primera partida oficial de las 09:00 AM.
                    </p>
                  </div>
                </div>
                <div className="p-2.5 bg-slate-950/90 border border-amber-500/50 rounded-xl text-center sm:text-right shrink-0">
                  <span className="text-xs sm:text-sm font-racing font-bold text-amber-300 block uppercase">
                    PRIMERA CARRERA A LAS 09:00 AM
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Zona Horaria Caracas
                  </span>
                </div>
              </div>
            )}

            {/* Night Closed Notice only if taquillas are actually closed */}
            {!config.taquillasAbiertas && scheduleInfo.isNightClosed && (
              <div className="p-4 bg-gradient-to-r from-indigo-950/80 via-slate-900 to-indigo-950/80 border border-indigo-600/70 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 flex items-center justify-center shrink-0">
                    <Moon className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[11px] text-indigo-400 font-racing font-bold uppercase tracking-wider block">
                      🌙 HIPÓDROMO CERRADO POR HORARIO NOCTURNO
                    </span>
                    <h4 className="text-base sm:text-lg font-racing font-extrabold text-white">
                      Taquillas cerradas automáticamente a las 10:01 PM
                    </h4>
                    <p className="text-xs text-slate-300">
                      No hay carreras activas durante la noche. Las partidas se reanudan a las <strong>09:00 AM</strong>.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsHistoryOpen(true)}
                  className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-racing font-bold text-xs uppercase flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <Trophy className="w-4 h-4" />
                  <span>Historial de Ganadores</span>
                </button>
              </div>
            )}

            {/* Odds Table */}
            <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
              <h4 className="font-racing font-bold text-white text-base">
                DIVIDENDOS Y CUOTAS OFICIALES · CARRERA #{config.currentRaceNumber}
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {horses.map(h => (
                  <div key={h.number} className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md text-white font-bold text-xs flex items-center justify-center font-racing" style={{ backgroundColor: h.colorHex }}>
                        {h.number}
                      </span>
                      <span className="font-bold text-white">{h.name}</span>
                    </div>
                    <span className="font-mono font-bold text-amber-400">x{h.currentMultiplier}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab View: MIS TICKETS */}
        {activeTab === 'tickets' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-extrabold text-white font-racing">
                HISTORIAL DE JUGADAS Y PREMIOS
              </h3>
              <p className="text-xs text-slate-400">
                Consulta todos tus tickets jugados, premios cobrados y estado en tiempo real.
              </p>
            </div>

            <TicketHistory tickets={userTickets} />
          </div>
        )}

        {/* Tab View: MI CUENTA */}
        {activeTab === 'cuenta' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-extrabold text-white font-racing">
                MI CUENTA Y CONFIGURACIÓN
              </h3>
              <p className="text-xs text-slate-400">
                Gestiona tus datos personales, cuentas de Pago Móvil y transacciones.
              </p>
            </div>

            {currentUser ? (
              <div className="space-y-4">
                {/* Balance and Actions Card */}
                <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-950 rounded-3xl border border-amber-500/30 shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400 block">Saldo Disponible para Jugar:</span>
                      <span className="text-3xl font-extrabold text-amber-400 font-mono">
                        {formatBs(currentUser.balance)}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setDepositDefaultAmount(100);
                          setIsDepositOpen(true);
                        }}
                        className="py-2 px-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl uppercase font-racing shadow"
                      >
                        Recargar
                      </button>
                      <button
                        onClick={() => setIsWithdrawOpen(true)}
                        className="py-2 px-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl uppercase font-racing"
                      >
                        Retirar
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Titular:</span>
                      <span className="font-semibold text-slate-200">{currentUser.name} {currentUser.lastName}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Cédula:</span>
                      <span className="font-mono text-slate-200">{currentUser.cedula}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Teléfono:</span>
                      <span className="font-mono text-slate-200">{currentUser.phone}</span>
                    </div>
                  </div>
                </div>

                {/* WhatsApp Support Direct Button */}
                <a
                  href={`https://wa.me/584221475717?text=${encodeURIComponent(
                    `Hola Juan Sandoval, me comunico desde JeyhBet solicitando atención para mi usuario (${currentUser.name} ${currentUser.lastName}).`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-colors"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>Contactar Soporte WhatsApp (+58 4221475717)</span>
                </a>

                {/* User Bank Accounts Summary */}
                <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-racing font-bold text-white text-base">
                      CUENTAS DE PAGO MÓVIL REGISTRADAS
                    </h4>
                    <button
                      onClick={() => setIsWithdrawOpen(true)}
                      className="text-xs text-amber-400 hover:underline font-semibold"
                    >
                      Gestionar Cuentas
                    </button>
                  </div>

                  <div className="space-y-2 text-xs">
                    {currentUser.bankAccounts.map(acc => (
                      <div key={acc.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between">
                        <div>
                          <span className="font-bold text-white block">{acc.bankName}</span>
                          <span className="text-[11px] text-slate-400">C.I: {acc.cedula} · Tel: {acc.phone}</span>
                        </div>
                        <span className="text-[10px] text-emerald-400 font-bold self-center">Verificada</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-900 rounded-3xl border border-slate-800 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
                  <HelpCircle className="w-7 h-7" />
                </div>
                <h4 className="text-lg font-bold text-white font-racing">INICIA SESIÓN EN TU CUENTA</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Para acceder a tu saldo, gestionar tus bancos y ver tus tickets, inicia sesión con tus credenciales.
                </p>
                <button
                  type="button"
                  onClick={() => setIsAuthOpen(true)}
                  className="py-2.5 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase font-racing"
                >
                  Iniciar Sesión / Registrarse
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab View: ADMIN (Owner Control Panel) */}
        {activeTab === 'admin' && (
          <OwnerAdminPanel
            currentUser={currentUser}
            config={config}
            horses={horses}
            users={users}
            tickets={tickets}
            transactions={transactions}
            onUpdateConfig={handleUpdateConfig}
            onUpdateHorses={handleUpdateHorses}
            onStartRaceManual={handleStartRace}
            onApproveDeposit={handleApproveDeposit}
            onRejectDeposit={handleRejectDeposit}
            onPayWithdrawal={handlePayWithdrawal}
            onEditUser={(updated) => {
              const next = users.map(u => u.id === updated.id ? updated : u);
              handleUpdateUsers(next);
            }}
            onImpersonateUser={handleImpersonateUser}
            onTransferNetProfit={handleTransferNetProfitToOwnerBalance}
            onClosePanel={() => setActiveTab('apostar')}
          />
        )}
      </main>

      {/* Floating Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        currentUser={currentUser}
        pendingTicketsCount={pendingTicketsCount}
      />

      {/* Modals */}
      <DepositModal
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        currentUser={currentUser}
        config={config}
        defaultAmount={depositDefaultAmount}
        onSubmitDeposit={handleSubmitDeposit}
      />

      <WithdrawModal
        isOpen={isWithdrawOpen}
        onClose={() => setIsWithdrawOpen(false)}
        currentUser={currentUser}
        onAddBankAccount={handleAddBankAccount}
        onProcessWithdrawal={handleProcessWithdrawal}
      />

      <AuthModals
        isOpen={isAuthOpen}
        onClose={() => {
          setIsAuthOpen(false);
          setSessionTimeoutNotice(null);
        }}
        existingUsers={users}
        onLoginSuccess={(user) => {
          handleSetCurrentUser(user);
          setSessionTimeoutNotice(null);
        }}
        onRegisterSuccess={(newUser) => {
          handleUpdateUsers([...users, newUser]);
        }}
        onPasswordResetSuccess={(email, newPass) => {
          const updatedUsers = users.map(u => 
            u.email.toLowerCase() === email.toLowerCase() ? { ...u, password: newPass } : u
          );
          handleUpdateUsers(updatedUsers);
        }}
        initialView={initialAuthView}
        timeoutReason={sessionTimeoutNotice}
        onClearTimeoutReason={() => setSessionTimeoutNotice(null)}
      />

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        currentUser={currentUser}
        userTickets={userTickets}
        userTransactions={userTransactions}
        onAddBankAccount={handleAddBankAccount}
        onLogout={() => handleSetCurrentUser(null)}
        supportPhone={config.supportPhoneWhatsApp}
      />

      {/* Official Race Winners History Modal */}
      <RaceHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        historyRecords={raceHistory}
      />

      {/* Live Interactive Community Chat */}
      <CommunityChat
        currentUser={currentUser}
        messages={chatMessages}
        onSendMessage={handleSendChatMessage}
        isOpen={isChatOpen}
        onToggle={() => setIsChatOpen(!isChatOpen)}
        onOpenAuth={() => setIsAuthOpen(true)}
      />
    </div>
  );
}
