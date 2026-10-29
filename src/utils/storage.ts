import { 
  User, Horse, BetTicket, Transaction, PlatformConfig, RaceSimulationState, 
  RaceHistoryRecord, ChatMessage 
} from '../types';

const STORAGE_KEYS = {
  USERS: 'jeyhbet_users_v1',
  CURRENT_USER: 'jeyhbet_active_session_v2', // bumped to v2 to erase legacy default owner session
  SESSION_LAST_ACTIVE: 'jeyhbet_session_last_active_v2',
  HORSES: 'jeyhbet_horses_v1',
  TICKETS: 'jeyhbet_tickets_v1',
  TRANSACTIONS: 'jeyhbet_transactions_v1',
  CONFIG: 'jeyhbet_config_v1',
  RACE_STATE: 'jeyhbet_race_state_v1',
  RECOVERY_CODES: 'jeyhbet_recovery_codes_v1',
  RACE_HISTORY: 'jeyhbet_race_history_v1',
  CHAT: 'jeyhbet_chat_messages_v1',
};

export const HORSE_NAMES_POOL = [
  'Lover', 'Flower', 'Crazy', 'Time', 'Faed', 'Storm',
  'Playero', 'Player', 'Cues', 'Speed', 'Tornado', 'Blazer',
  'Centella', 'Trueno', 'Relámpago', 'Pegaso', 'Caramelo', 'Azabache'
];

export const INITIAL_HORSES: Horse[] = [
  {
    number: 1,
    name: 'Lover',
    colorName: 'Rojo',
    colorHex: '#ef4444',
    jockeyColor: '#dc2626',
    baseMultiplier: 1, // User: "si va apostar 10 gana 10 más osea 20 de ganancia"
    currentMultiplier: 1,
    totalBetsBs: 0,
    betCount: 0,
  },
  {
    number: 2,
    name: 'Storm',
    colorName: 'Amarillo',
    colorHex: '#eab308',
    jockeyColor: '#ca8a04',
    baseMultiplier: 2,
    currentMultiplier: 2,
    totalBetsBs: 0,
    betCount: 0,
  },
  {
    number: 3,
    name: 'Blazer',
    colorName: 'Verde',
    colorHex: '#22c55e',
    jockeyColor: '#16a34a',
    baseMultiplier: 3,
    currentMultiplier: 3,
    totalBetsBs: 0,
    betCount: 0,
  },
  {
    number: 4,
    name: 'Crazy',
    colorName: 'Morado',
    colorHex: '#a855f7',
    jockeyColor: '#9333ea',
    baseMultiplier: 4,
    currentMultiplier: 4,
    totalBetsBs: 0,
    betCount: 0,
  },
  {
    number: 5,
    name: 'Speed',
    colorName: 'Azul',
    colorHex: '#3b82f6',
    jockeyColor: '#2563eb',
    baseMultiplier: 5,
    currentMultiplier: 5,
    totalBetsBs: 0,
    betCount: 0,
  },
  {
    number: 6,
    name: 'Tornado',
    colorName: 'Gris',
    colorHex: '#94a3b8',
    jockeyColor: '#64748b',
    baseMultiplier: 6,
    currentMultiplier: 6,
    totalBetsBs: 0,
    betCount: 0,
  },
];

export const INITIAL_CONFIG: PlatformConfig = {
  cajaInicialBs: 1060, // Caja inicial fijada en 1060 Bs (reflejada en saldo del propietario)
  taquillasAbiertas: true,
  minBetBs: 10, // Apuesta mínima 10 Bs
  minDepositBs: 100, // Recargas a partir de 100 Bs en adelante
  minWithdrawBs: 100, // Retiros a partir de 100 Bs en adelante
  gananciaTransferidaAlSaldo: 0,
  currentRaceNumber: 1,
  oddsRoundCounter: 0,
  chosenWinnerHorseNumber: null, // Propietario elige quién gana
  lastRaceWinner: null,
  pagoMovilOwner: {
    cedula: 'V-29609466',
    phone: '04225826966',
    bankName: 'Banco de Venezuela',
    bankCode: '0102',
    titular: 'Juan Sandoval (Propietario JeyhBet)',
  },
  supportPhoneWhatsApp: '+58 4221475717',
  adminEmail: 'juansandovaljose321@gmail.com',
  adminPin: '526352',
};

// Owner user pre-registered (ONLY registered user initially)
export const OWNER_USER: User = {
  id: 'usr_owner_juan',
  name: 'Juan',
  lastName: 'Sandoval',
  email: 'juansandovaljose321@gmail.com',
  password: 'Juan5263.jm',
  cedula: 'V-29609466',
  phone: '04225826966',
  role: 'admin',
  balance: 1060, // Saldo del propietario refleja directamente la caja inicial de 1060 Bs
  bankAccounts: [
    {
      id: 'bnk_owner_1',
      bankCode: '0102',
      bankName: 'Banco de Venezuela (0102)',
      cedula: 'V-29609466',
      phone: '04225826966',
    },
  ],
  createdAt: Date.now() - 86400000 * 30,
};

// --- Storage API ---

export function getStoredUsers(): User[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!raw) {
      const initialUsers = [OWNER_USER];
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(initialUsers));
      return initialUsers;
    }
    const parsed = JSON.parse(raw);
    // Filter out any mock users so only real users exist
    const cleaned = parsed.filter((u: User) => u.id !== 'usr_demo_player');
    // Ensure owner always exists
    const ownerIndex = cleaned.findIndex((u: User) => u.email.toLowerCase() === OWNER_USER.email.toLowerCase());
    if (ownerIndex === -1) {
      cleaned.unshift(OWNER_USER);
    } else {
      // If owner exists with 0 balance from previous test, ensure initial 1060 Bs
      if (cleaned[ownerIndex].balance === 0) {
        cleaned[ownerIndex].balance = 1060;
      }
    }
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(cleaned));
    return cleaned;
  } catch {
    return [OWNER_USER];
  }
}

export function saveStoredUsers(users: User[]) {
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
}

export const SESSION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes in milliseconds (600,000 ms)

export function touchSessionActivity() {
  try {
    if (localStorage.getItem(STORAGE_KEYS.CURRENT_USER)) {
      localStorage.setItem(STORAGE_KEYS.SESSION_LAST_ACTIVE, Date.now().toString());
    }
  } catch {
    // ignore
  }
}

export function clearCurrentUserSession() {
  try {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    localStorage.removeItem(STORAGE_KEYS.SESSION_LAST_ACTIVE);
    localStorage.removeItem('jeyhbet_current_user_v1'); // Clean legacy auto-logged session
  } catch {
    // ignore
  }
}

export function checkSessionValidity(): { valid: boolean; reason?: 'expired' | 'no_session' } {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (!raw) return { valid: false, reason: 'no_session' };

    const lastActiveRaw = localStorage.getItem(STORAGE_KEYS.SESSION_LAST_ACTIVE);
    if (!lastActiveRaw) {
      localStorage.setItem(STORAGE_KEYS.SESSION_LAST_ACTIVE, Date.now().toString());
      return { valid: true };
    }

    const lastActiveTime = parseInt(lastActiveRaw, 10);
    const elapsed = Date.now() - lastActiveTime;
    if (elapsed > SESSION_TIMEOUT_MS) {
      clearCurrentUserSession();
      return { valid: false, reason: 'expired' };
    }

    return { valid: true };
  } catch {
    return { valid: false, reason: 'no_session' };
  }
}

export function getCurrentUser(): User | null {
  try {
    // Always clean up legacy default owner session key
    localStorage.removeItem('jeyhbet_current_user_v1');

    const sessionCheck = checkSessionValidity();
    if (!sessionCheck.valid) {
      return null;
    }

    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.id || parsed.id === 'usr_demo_player') {
      clearCurrentUserSession();
      return null;
    }

    touchSessionActivity();

    // Sync latest user details from stored users
    const users = getStoredUsers();
    const fresh = users.find(u => u.id === parsed.id);
    return fresh || parsed;
  } catch {
    clearCurrentUserSession();
    return null;
  }
}

export function setCurrentUser(user: User | null) {
  try {
    if (!user) {
      clearCurrentUserSession();
    } else {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      localStorage.setItem(STORAGE_KEYS.SESSION_LAST_ACTIVE, Date.now().toString());
    }
  } catch {
    // ignore
  }
}

export function getStoredConfig(): PlatformConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(INITIAL_CONFIG));
      return INITIAL_CONFIG;
    }
    const parsed = JSON.parse(raw);
    const merged: PlatformConfig = { ...INITIAL_CONFIG, ...parsed };
    // If cajaInicialBs was 0 from legacy initial state, set to requested 1060 Bs
    if (merged.cajaInicialBs === 0 || merged.cajaInicialBs === undefined) {
      merged.cajaInicialBs = 1060;
    }
    merged.minDepositBs = 100;
    merged.minWithdrawBs = 100;
    if (merged.gananciaTransferidaAlSaldo === undefined) {
      merged.gananciaTransferidaAlSaldo = 0;
    }
    return merged;
  } catch {
    return INITIAL_CONFIG;
  }
}

export function saveStoredConfig(config: PlatformConfig) {
  localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
}

export function getStoredHorses(): Horse[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HORSES);
    let horsesToUse = INITIAL_HORSES;
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length === 6) {
          horsesToUse = parsed;
        }
      } catch {
        horsesToUse = INITIAL_HORSES;
      }
    }

    // REAL BETS ONLY: Calculate bets strictly from active tickets of current race
    const tickets = getStoredTickets();
    const config = getStoredConfig();
    const activeTickets = tickets.filter(t => t.status === 'pendiente' && t.raceNumber === config.currentRaceNumber);

    const synchronized = horsesToUse.map(h => {
      let totalStake = 0;
      let count = 0;
      activeTickets.forEach(t => {
        t.selections.forEach(s => {
          if (s.horseNumber === h.number) {
            totalStake += s.stakeBs;
            count += 1;
          }
        });
      });
      return {
        ...h,
        totalBetsBs: totalStake, // Starts at 0 if no tickets exist!
        betCount: count,
      };
    });

    localStorage.setItem(STORAGE_KEYS.HORSES, JSON.stringify(synchronized));
    return synchronized;
  } catch {
    return INITIAL_HORSES;
  }
}

export function saveStoredHorses(horses: Horse[]) {
  localStorage.setItem(STORAGE_KEYS.HORSES, JSON.stringify(horses));
}

export function getStoredTickets(): BetTicket[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TICKETS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveStoredTickets(tickets: BetTicket[]) {
  localStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(tickets));
}

export function getStoredTransactions(): Transaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));
      return [];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveStoredTransactions(transactions: Transaction[]) {
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
}

// --- Historial Oficial de Carreras y Ganadores ---
export function getStoredRaceHistory(): RaceHistoryRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RACE_HISTORY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveStoredRaceHistory(records: RaceHistoryRecord[]) {
  localStorage.setItem(STORAGE_KEYS.RACE_HISTORY, JSON.stringify(records));
}

export function addRaceHistoryRecord(record: RaceHistoryRecord) {
  const current = getStoredRaceHistory();
  const updated = [record, ...current].slice(0, 50); // Keep last 50 races
  saveStoredRaceHistory(updated);
  return updated;
}

// --- Chat de la Comunidad en Vivo ---
export function getStoredChatMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CHAT);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveStoredChatMessages(messages: ChatMessage[]) {
  localStorage.setItem(STORAGE_KEYS.CHAT, JSON.stringify(messages));
}

export function addChatMessage(message: ChatMessage): ChatMessage[] {
  const current = getStoredChatMessages();
  const updated = [...current, message].slice(-60); // Keep last 60 messages
  saveStoredChatMessages(updated);
  return updated;
}

// Rotate Horse Names & Multipliers dynamically after races
export function cycleHorsesForNextRace(roundNumber: number): Horse[] {
  const currentHorses = getStoredHorses();
  const shuffledNames = [...HORSE_NAMES_POOL].sort(() => 0.5 - Math.random());

  // Dynamic odds multiplier formula:
  const oddsCycle = Math.floor(roundNumber / 2) % 3; // 0, 1, 2
  
  const updated = currentHorses.map((horse, idx) => {
    let multiplier = horse.baseMultiplier;
    if (oddsCycle === 1) {
      multiplier = horse.baseMultiplier + 1;
    } else if (oddsCycle === 2) {
      multiplier = horse.baseMultiplier + (idx >= 3 ? 2 : 1);
    }

    return {
      ...horse,
      name: shuffledNames[idx] || horse.name,
      currentMultiplier: multiplier,
      totalBetsBs: 0, // Starts fresh at 0 Bs for the new race
      betCount: 0,
    };
  });

  saveStoredHorses(updated);
  return updated;
}

/**
 * Automated Risk Engine:
 * Analyzes whether platform has enough liquidity (Caja Inicial + current bets pool)
 * to pay out if this horse wins.
 */
export function checkBetRisk(
  horseNumber: number,
  stakeBs: number,
  multiplier: number,
  config: PlatformConfig,
  currentTickets: BetTicket[]
): {
  allowed: boolean;
  message?: string;
  maxStakeAllowed?: number;
} {
  // Pending tickets for this active race
  const activeTickets = currentTickets.filter(t => t.status === 'pendiente');
  
  // Total money collected in this race
  const currentPool = activeTickets.reduce((sum, t) => sum + t.totalStakeBs, 0);

  // Calculate current payout liability on this specific horse if it wins
  let currentHorseLiability = 0;
  activeTickets.forEach(t => {
    t.selections.forEach(s => {
      if (s.horseNumber === horseNumber) {
        currentHorseLiability += s.potentialWinBs;
      }
    });
  });

  // Potential win for new bet:
  // User spec: x1 means if bet 10, profit is 10, total win = 20 (stake * (multiplier + 1))
  const newPotentialWin = stakeBs * (multiplier + 1);
  const totalLiabilityIfHorseWins = currentHorseLiability + newPotentialWin;

  // Maximum house risk tolerance = Caja Inicial + Current Pool (plus safe credit threshold)
  const totalAvailableLiquidity = config.cajaInicialBs + currentPool + stakeBs;
  
  // If Caja Inicial is 0 and pool is small, allow small bets up to 100 Bs so game can start,
  // but prevent massive bets that exceed liquidity.
  const minimumSafetyFloor = 200; // Allow initial seeds
  const effectiveMaxCapacity = Math.max(totalAvailableLiquidity, minimumSafetyFloor);

  if (totalLiabilityIfHorseWins > effectiveMaxCapacity) {
    const maxWinAllowed = Math.max(0, effectiveMaxCapacity - currentHorseLiability);
    const maxStake = Math.max(config.minBetBs, Math.floor(maxWinAllowed / (multiplier + 1)));

    return {
      allowed: false,
      message: `La apuesta excede el límite de taquilla disponible para este caballo (${totalLiabilityIfHorseWins.toFixed(2)} Bs requeridos vs ${effectiveMaxCapacity.toFixed(2)} Bs disponibles). Puede apostar un máximo de ${maxStake} Bs.`,
      maxStakeAllowed: maxStake,
    };
  }

  return { allowed: true };
}

/**
 * Generate password reset verification code
 */
export function generateRecoveryCode(email: string): string {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RECOVERY_CODES) || '{}';
    const codes = JSON.parse(raw);
    codes[email.toLowerCase()] = {
      code,
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 mins
    };
    localStorage.setItem(STORAGE_KEYS.RECOVERY_CODES, JSON.stringify(codes));
  } catch {
    // fallback
  }
  return code;
}

export function verifyRecoveryCode(email: string, code: string): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RECOVERY_CODES);
    if (!raw) return false;
    const codes = JSON.parse(raw);
    const entry = codes[email.toLowerCase()];
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) return false;
    return entry.code === code.trim();
  } catch {
    return false;
  }
}
