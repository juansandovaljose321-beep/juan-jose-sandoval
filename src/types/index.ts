export type UserRole = 'admin' | 'player';

export interface BankAccount {
  id: string;
  bankCode: string;
  bankName: string;
  cedula: string;
  phone: string;
}

export interface User {
  id: string;
  name: string;
  lastName: string;
  email: string;
  password?: string;
  cedula: string;
  phone: string;
  role: UserRole;
  balance: number;
  bankAccounts: BankAccount[];
  createdAt: number;
}

export interface Horse {
  number: number; // 1 to 6
  name: string;
  colorName: 'Rojo' | 'Amarillo' | 'Verde' | 'Morado' | 'Azul' | 'Gris';
  colorHex: string;
  jockeyColor: string;
  baseMultiplier: number;
  currentMultiplier: number;
  totalBetsBs: number;
  betCount: number;
}

export interface BetSelection {
  horseNumber: number;
  horseName: string;
  multiplier: number;
  stakeBs: number;
  potentialWinBs: number;
}

export interface BetTicket {
  id: string;
  ticketNumber: string;
  userId: string;
  userName: string;
  raceId: string;
  raceNumber: number;
  selections: BetSelection[];
  totalStakeBs: number;
  totalPotentialWinBs: number;
  status: 'pendiente' | 'ganado' | 'perdido' | 'cancelado';
  winningHorseNumber?: number;
  totalPaidBs?: number;
  createdAt: number;
}

export interface Transaction {
  id: string;
  userId: string;
  userName: string;
  type: 'deposito' | 'retiro' | 'apuesta' | 'premio' | 'ajuste_caja';
  amountBs: number;
  status: 'pendiente' | 'aprobado' | 'rechazado';
  reference?: string;
  captureUrl?: string;
  bankDetails?: {
    bankName: string;
    cedula: string;
    phone: string;
  };
  note?: string;
  createdAt: number;
}

export interface PlatformConfig {
  cajaInicialBs: number;
  taquillasAbiertas: boolean;
  minBetBs: number;
  minDepositBs?: number;
  minWithdrawBs?: number;
  gananciaTransferidaAlSaldo?: number;
  currentRaceNumber: number;
  oddsRoundCounter: number;
  chosenWinnerHorseNumber?: number | null; // El propietario elige qué caballo ganará
  lastRaceWinner?: {
    raceNumber: number;
    horseNumber: number;
    horseName: string;
    colorName: string;
    colorHex: string;
    multiplier: number;
    nextRaceTimeStr: string;
    nextRaceNotice: string;
    timestamp: number;
  } | null;
  pagoMovilOwner: {
    cedula: string;
    phone: string;
    bankName: string;
    bankCode: string;
    titular: string;
  };
  supportPhoneWhatsApp: string;
  adminEmail: string;
  adminPin: string;
}

export interface RaceSimulationState {
  raceId: string;
  raceNumber: number;
  status: 'idle' | 'countdown' | 'racing' | 'photo_finish' | 'finished';
  startTime: number;
  durationSeconds: number;
  elapsedSeconds: number;
  horsePositions: number[];
  horseSpeeds: number[];
  winnerHorseNumber: number | null;
  predeterminedWinner: number | null; // Set by owner
  raceName: string;
}

export interface RaceHistoryRecord {
  id: string;
  raceNumber: number;
  winnerHorseNumber: number;
  winnerHorseName: string;
  winnerColorName: string;
  winnerColorHex: string;
  multiplier: number;
  timeCaracas: string; // ej: "10:00 AM", "11:00 AM"
  dateCaracas: string; // ej: "28/10/2026"
  timestamp: number;
  totalPoolBs: number;
  totalPaidBs: number;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  text: string;
  timeStr: string;
  timestamp: number;
  horsePicked?: number;
}
