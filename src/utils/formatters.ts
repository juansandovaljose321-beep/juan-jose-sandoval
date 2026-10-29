export const VENEZUELAN_BANKS = [
  { code: '0102', name: 'Banco de Venezuela (0102)' },
  { code: '0134', name: 'Banesco (0134)' },
  { code: '0105', name: 'Banco Mercantil (0105)' },
  { code: '0108', name: 'BBVA Banco Provincial (0108)' },
  { code: '0172', name: 'Bancamiga (0172)' },
  { code: '0191', name: 'Banco Nacional de Crédito BNC (0191)' },
  { code: '0114', name: 'Bancaribe (0114)' },
  { code: '0115', name: 'Banco Exterior (0115)' },
  { code: '0151', name: 'Banco Fondo Común BFC (0151)' },
  { code: '0163', name: 'Banco del Tesoro (0163)' },
  { code: '0175', name: 'Banco Bicentenario (0175)' },
  { code: '0156', name: '100% Banco (0156)' },
  { code: '0137', name: 'Banco Sofitasa (0137)' },
  { code: '0177', name: 'BANFANB (0177)' },
];

/**
 * Format currency in Venezuelan Bolívares (e.g. 20.000,00 Bs or 40.000,00 Bs)
 */
export function formatBs(amount: number | string | undefined | null): string {
  const num = typeof amount === 'string' ? parseFloat(amount) || 0 : amount || 0;
  
  const parts = num.toFixed(2).split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decimalPart = parts[1];

  return `${integerPart},${decimalPart} Bs`;
}

/**
 * Clean numeric string for input fields
 */
export function parseBsInput(value: string): number {
  if (!value) return 0;
  // Replace comma with dot if user typed comma
  const cleaned = value.replace(/\./g, '').replace(/,/g, '.').replace(/[^\d.]/g, '');
  return parseFloat(cleaned) || 0;
}

/**
 * Get current time in Caracas timezone (America/Caracas, UTC-4)
 */
export function getCaracasTime(): {
  dateStr: string;
  timeStr: string;
  hours: number;
  minutes: number;
  seconds: number;
} {
  const now = new Date();
  
  // Format in Caracas timezone
  const formatter = new Intl.DateTimeFormat('es-VE', {
    timeZone: 'America/Caracas',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const parts = formatter.formatToParts(now);
  const partMap: Record<string, string> = {};
  parts.forEach(p => {
    partMap[p.type] = p.value;
  });

  const hours = parseInt(partMap.hour || '0', 10);
  const minutes = parseInt(partMap.minute || '0', 10);
  const seconds = parseInt(partMap.second || '0', 10);
  const timeStr = `${partMap.hour}:${partMap.minute}:${partMap.second}`;
  const dateStr = `${partMap.day}/${partMap.month}/${partMap.year}`;

  return { dateStr, timeStr, hours, minutes, seconds };
}

export interface RaceScheduleInfo {
  nextSlotStr: string;
  nextRaceTimeNotice: string;
  secondsRemaining: number;
  isActiveOperatingHours: boolean;
  isNightClosed: boolean;
  isEarlyMorningOpen: boolean;
  isRaceTime: boolean;
  currentSlotKey: string;
}

/**
 * Calculate the next scheduled race time (every half hour from 09:00 AM to 10:00 PM Caracas time)
 * e.g. 9:00 AM, 9:30 AM, 10:00 AM, 10:30 AM, 11:00 AM, 11:30 AM ... 10:00 PM
 * If taquillasAbiertas is true before 9:00 AM, players can bet and notice greets:
 * "Buenos días, hacer sus jugadas antes de las 9 de la mañana que es la primera jugada del día"
 */
export function getNextRaceSchedule(taquillasAbiertas: boolean = true): RaceScheduleInfo {
  const { hours, minutes, seconds, dateStr } = getCaracasTime();
  
  const currentTotalSeconds = hours * 3600 + minutes * 60 + seconds;
  const startOperatingSeconds = 9 * 3600; // 09:00 AM (32,400s)
  const lastRaceStartSeconds = 22 * 3600; // 10:00 PM (79,200s)
  const autoCloseSeconds = 22 * 3600 + 60; // 10:01 PM (22:01:00) exact auto-close requested by user

  // Helper to format slot seconds into "HH:MM AM/PM"
  const formatSlotTime = (totalSec: number) => {
    const secInDay = totalSec % 86400;
    const h = Math.floor(secInDay / 3600);
    const m = Math.floor((secInDay % 3600) / 60);
    const period = h >= 12 && h < 24 ? 'PM' : 'AM';
    const displayH = h > 12 ? h - 12 : (h === 0 ? 12 : h);
    return `${displayH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`;
  };

  // Case 1: Before operating hours (00:00:00 to 08:59:59 AM)
  if (currentTotalSeconds < startOperatingSeconds) {
    const remaining = startOperatingSeconds - currentTotalSeconds;
    const slotKey = `slot_${dateStr}_09:00`;

    if (taquillasAbiertas) {
      return {
        nextSlotStr: '09:00 AM',
        nextRaceTimeNotice: 'Buenos días, hacer sus jugadas antes de las 9 de la mañana que es la primera jugada del día',
        secondsRemaining: remaining,
        isActiveOperatingHours: true,
        isNightClosed: false,
        isEarlyMorningOpen: true,
        isRaceTime: remaining <= 0,
        currentSlotKey: slotKey,
      };
    } else {
      return {
        nextSlotStr: '09:00 AM',
        nextRaceTimeNotice: '🌙 Taquillas cerradas por horario nocturno. Espera a la primera carrera a las 09:00 AM (Zona Caracas)',
        secondsRemaining: remaining,
        isActiveOperatingHours: false,
        isNightClosed: true,
        isEarlyMorningOpen: false,
        isRaceTime: false,
        currentSlotKey: slotKey,
      };
    }
  }

  // Case 2: After 10:01 PM (22:01:00) -> Closed until 09:00 AM tomorrow
  if (currentTotalSeconds >= autoCloseSeconds) {
    const secondsUntilMidnight = 24 * 3600 - currentTotalSeconds;
    const remaining = secondsUntilMidnight + startOperatingSeconds;
    const slotKey = `slot_next_09:00`;

    if (taquillasAbiertas) {
      return {
        nextSlotStr: 'Mañana 09:00 AM',
        nextRaceTimeNotice: 'Buenos días, hacer sus jugadas antes de las 9 de la mañana que es la primera jugada del día',
        secondsRemaining: remaining,
        isActiveOperatingHours: true,
        isNightClosed: false,
        isEarlyMorningOpen: true,
        isRaceTime: false,
        currentSlotKey: slotKey,
      };
    }

    return {
      nextSlotStr: 'Mañana 09:00 AM',
      nextRaceTimeNotice: '🌙 Sistema cerrado automáticamente a las 10:01 PM. La siguiente partida oficial será mañana a las 09:00 AM (Zona Caracas)',
      secondsRemaining: remaining,
      isActiveOperatingHours: false,
      isNightClosed: true,
      isEarlyMorningOpen: false,
      isRaceTime: false,
      currentSlotKey: slotKey,
    };
  }

  // Case 3: Operating daytime hours (09:00:00 to 22:00:59)
  // Races are scheduled every 1800s (30 minutes) starting at 09:00:00
  const elapsedSince9am = currentTotalSeconds - startOperatingSeconds;
  const currentIntervalIndex = Math.floor(elapsedSince9am / 1800);
  const secondsIntoInterval = elapsedSince9am % 1800;

  // The race for this slot runs during the first 35 seconds of the half-hour (30s race + 5s finish photo)
  const isCurrentlyInRace = secondsIntoInterval < 35;

  let targetSlotSeconds = startOperatingSeconds + currentIntervalIndex * 1800;
  let remaining = 0;

  if (isCurrentlyInRace) {
    // Current slot is in progress
    targetSlotSeconds = startOperatingSeconds + currentIntervalIndex * 1800;
    remaining = 0;
  } else {
    // Current slot finished, countdown to next slot
    targetSlotSeconds = startOperatingSeconds + (currentIntervalIndex + 1) * 1800;
    remaining = Math.max(0, targetSlotSeconds - currentTotalSeconds);
  }

  // If next slot exceeds 22:00 (10:00 PM), system will close until tomorrow
  if (targetSlotSeconds > lastRaceStartSeconds) {
    const secondsUntilMidnight = 24 * 3600 - currentTotalSeconds;
    const remToTomorrow = secondsUntilMidnight + startOperatingSeconds;
    return {
      nextSlotStr: 'Mañana 09:00 AM',
      nextRaceTimeNotice: '🌙 Última carrera del día completada. La siguiente partida oficial será mañana a las 09:00 AM (Zona Caracas)',
      secondsRemaining: remToTomorrow,
      isActiveOperatingHours: false,
      isNightClosed: true,
      isEarlyMorningOpen: false,
      isRaceTime: false,
      currentSlotKey: `slot_tomorrow_09:00`,
    };
  }

  const slotStr = formatSlotTime(targetSlotSeconds);
  const slotKey = `slot_${dateStr}_${slotStr}`;

  return {
    nextSlotStr: slotStr,
    nextRaceTimeNotice: isCurrentlyInRace 
      ? `🏇 ¡CARRERA EN PISTA AHORA MISMO! Partida oficial de las ${slotStr}`
      : `Espera a la siguiente carrera automática a las ${slotStr} (Zona horaria Caracas)`,
    secondsRemaining: remaining,
    isActiveOperatingHours: true,
    isNightClosed: false,
    isEarlyMorningOpen: false,
    isRaceTime: remaining <= 0,
    currentSlotKey: slotKey,
  };
}

/**
 * Sound synthesizer for race horn and excitement
 */
export function playRaceHorn() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const notes = [261.63, 329.63, 392.0, 523.25]; // C4, E4, G4, C5 bugle call
    let time = ctx.currentTime;

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0.2, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + 0.2);
      time += (i === notes.length - 1 ? 0.35 : 0.15);
    });
  } catch {
    // Audio context may require user interaction
  }
}
