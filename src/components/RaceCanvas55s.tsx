import React, { useEffect, useRef, useState } from 'react';
import { Horse } from '../types';
import { playRaceHorn, getNextRaceSchedule } from '../utils/formatters';
import confetti from 'canvas-confetti';
import { Trophy, Timer, Volume2, VolumeX, Flag, Sparkles, Clock, CheckCircle2, Eye, EyeOff } from 'lucide-react';

interface RaceCanvasProps {
  horses: Horse[];
  isRacing: boolean;
  onRaceFinish: (winnerHorseNumber: number) => void;
  predeterminedWinner?: number | null;
  raceNumber: number;
}

interface RankedHorse {
  horse: Horse;
  position: number;
  distance: number;
}

export const RaceCanvas55s: React.FC<RaceCanvasProps> = ({
  horses,
  isRacing,
  onRaceFinish,
  predeterminedWinner,
  raceNumber,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [elapsed, setElapsed] = useState<number>(0);
  const [winner, setWinner] = useState<Horse | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [rankings, setRankings] = useState<RankedHorse[]>([]);
  const [raceCommentary, setRaceCommentary] = useState<string>('Caballos y jinetes listos en las gateras de salida.');
  const [scheduleInfo, setScheduleInfo] = useState(getNextRaceSchedule());
  const [showWinnerOverlay, setShowWinnerOverlay] = useState<boolean>(true);

  const raceDuration = 30; // 30 seconds exactly

  // Keep schedule countdown updated
  useEffect(() => {
    const timer = setInterval(() => {
      setScheduleInfo(getNextRaceSchedule());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sand and dust particles
  const particlesRef = useRef<Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    alpha: number;
    color: string;
  }>>([]);

  const stateRef = useRef<{
    positions: number[]; // 0 to 1000
    isFinished: boolean;
    targetWinner: number;
    leadSequence: number[];
    startTime: number;
    isRacingPrev: boolean;
  }>({
    positions: [0, 0, 0, 0, 0, 0],
    isFinished: false,
    targetWinner: 1,
    leadSequence: [2, 4, 1, 3],
    startTime: 0,
    isRacingPrev: false,
  });

  // Sound generator
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRacing && soundEnabled) {
      playRaceHorn();
      try {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          const ctx = new AudioContextClass();
          let beat = 0;
          interval = setInterval(() => {
            if (ctx.state === 'suspended') ctx.resume();
            const now = ctx.currentTime;
            
            // Hoofbeats
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(65 + (beat % 3) * 15 + Math.random() * 20, now);
            gain.gain.setValueAtTime(0.045, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(now + 0.07);

            beat++;
          }, 110);
        }
      } catch {
        // Audio policy
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRacing, soundEnabled]);

  // Race start & reset trigger
  useEffect(() => {
    if (isRacing && !stateRef.current.isRacingPrev) {
      stateRef.current.isRacingPrev = true;
      stateRef.current.startTime = Date.now();
      stateRef.current.isFinished = false;
      stateRef.current.positions = [0, 0, 0, 0, 0, 0];
      particlesRef.current = [];
      setWinner(null);
      setShowWinnerOverlay(true);

      // The winner is strictly predeterminedWinner if set, otherwise random 1-6
      const targetWinner = predeterminedWinner && predeterminedWinner >= 1 && predeterminedWinner <= 6
        ? predeterminedWinner
        : (Math.floor(Math.random() * 6) + 1);

      stateRef.current.targetWinner = targetWinner;

      // Plan multiple overtakes among all 6 runners
      const others = [1, 2, 3, 4, 5, 6].filter(n => n !== targetWinner).sort(() => 0.5 - Math.random());
      stateRef.current.leadSequence = [others[0], others[1], others[2], targetWinner];
    } else if (!isRacing) {
      stateRef.current.isRacingPrev = false;
      // Do NOT erase winner or positions if race already finished
      if (!stateRef.current.isFinished) {
        stateRef.current.positions = [0, 0, 0, 0, 0, 0];
        setElapsed(0);
        setWinner(null);
        setRaceCommentary('Caballos y jinetes listos en las gateras de salida.');
      }
    }
  }, [isRacing, predeterminedWinner]);

  // Main 60fps Loop
  useEffect(() => {
    let animId: number;

    const mainLoop = () => {
      const now = Date.now();
      let currentElapsed = 0;

      if (isRacing && stateRef.current.startTime > 0) {
        currentElapsed = (now - stateRef.current.startTime) / 1000;
        setElapsed(currentElapsed);

        const progress = Math.min(1, currentElapsed / raceDuration);
        const targetDist = 1000;
        const baseDistance = progress * targetDist;
        const positions = stateRef.current.positions;

        const [earlyLeader, midLeader1, midLeader2, targetWinner] = stateRef.current.leadSequence;

        // Calculate positions with continuous overtakes across the 30s
        for (let i = 0; i < 6; i++) {
          const horseNum = i + 1;
          let offset = 0;
          const strideOsc = Math.sin(currentElapsed * 8 + i * 1.8) * 10;
          offset += strideOsc;

          // Phase 1 (0-8s): Gate burst!
          if (currentElapsed < 8) {
            const t = currentElapsed / 8;
            if (horseNum === earlyLeader) offset += 45 * Math.sin(t * Math.PI * 0.5);
            else if (horseNum === midLeader1) offset += 22 * t;
            else if (horseNum === targetWinner) offset += 10 * t;
            else offset -= 16 * t;
          }
          // Phase 2 (8-16s): Midpack counter-attack and first lead change!
          else if (currentElapsed < 16) {
            const t = (currentElapsed - 8) / 8;
            if (horseNum === midLeader1) offset += 26 + (30 * t); // Takes lead!
            else if (horseNum === earlyLeader) offset += 45 - (35 * t); // Drops back
            else if (horseNum === midLeader2) offset += 16 + (22 * t);
            else if (horseNum === targetWinner) offset += 12 + (10 * t);
            else offset -= 14 + (10 * Math.sin(t * Math.PI));
          }
          // Phase 3 (16-23s): Turn battle and second lead change!
          else if (currentElapsed < 23) {
            const t = (currentElapsed - 16) / 7;
            if (horseNum === midLeader2) offset += 38 + (24 * t); // Takes lead!
            else if (horseNum === midLeader1) offset += 56 - (28 * t);
            else if (horseNum === targetWinner) offset += 22 + (36 * t); // Preparing final charge!
            else if (horseNum === earlyLeader) offset += 10 - (20 * t);
            else offset -= 6 + (16 * t);
          }
          // Phase 4 (23-30s): Recta Final! Target winner surges past all runners to cross the meta!
          else {
            const t = (currentElapsed - 23) / 7;
            if (horseNum === targetWinner) offset += 58 + (82 * t); // Overcomes everyone to cross 1st!
            else if (horseNum === midLeader2) offset += 62 - (24 * t);
            else if (horseNum === midLeader1) offset += 28 + (6 * (1 - t));
            else offset -= 10 + (26 * t);
          }

          positions[i] = Math.max(0, Math.min(targetDist, baseDistance + offset));
        }

        // Live Rankings
        const currentRankings: RankedHorse[] = horses
          .map(h => ({
            horse: h,
            position: 1,
            distance: positions[h.number - 1] || 0,
          }))
          .sort((a, b) => b.distance - a.distance)
          .map((item, idx) => ({ ...item, position: idx + 1 }));

        setRankings(currentRankings);

        // Dynamic Commentary
        if (currentElapsed < 4) {
          setRaceCommentary(`¡ABREN LAS COMPUERTAS! ¡Salen a romper pista los 6 ejemplares!`);
        } else if (currentElapsed < 9) {
          setRaceCommentary(`¡#${earlyLeader} toma la delantera a gran velocidad!`);
        } else if (currentElapsed < 16) {
          setRaceCommentary(`¡REBASE! ¡#${midLeader1} pasa al frente por fuera!`);
        } else if (currentElapsed < 23) {
          setRaceCommentary(`¡Pelea feroz en el giro! ¡#${midLeader2} ataca por dentro y lidera!`);
        } else if (currentElapsed < 28) {
          setRaceCommentary(`¡RECTA FINAL! ¡#${targetWinner} arremete con fuerza buscando la meta!`);
        } else {
          setRaceCommentary(`¡¡LLEGADA OFICIAL!! ¡¡CABALLO #${targetWinner} CRUZA LA META EN PRIMER LUGAR!!`);
        }

        // Kick up dirt & sand particles
        for (let i = 0; i < 6; i++) {
          const laneY = (i * (480 / 6)) + (480 / 12);
          const x = 90 + (positions[i] / 1000) * (900 - 200);
          if (Math.random() > 0.3) {
            particlesRef.current.push({
              x: x - 26,
              y: laneY + 20 + (Math.random() * 8 - 4),
              vx: -(Math.random() * 5 + 3),
              vy: -(Math.random() * 3 + 0.5),
              size: Math.random() * 4 + 2,
              alpha: 0.85,
              color: Math.random() > 0.4 ? '#d97706' : '#22543d',
            });
          }
        }

        // Particles update
        particlesRef.current = particlesRef.current
          .map(p => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.18,
            alpha: p.alpha - 0.04,
          }))
          .filter(p => p.alpha > 0);

        // Check if finished at 30 seconds
        if (progress >= 1 && !stateRef.current.isFinished) {
          stateRef.current.isFinished = true;
          const winningHorse = horses.find(h => h.number === targetWinner) || currentRankings[0].horse;
          setWinner(winningHorse);
          setShowWinnerOverlay(true);
          onRaceFinish(winningHorse.number);

          try {
            confetti({
              particleCount: 160,
              spread: 100,
              origin: { y: 0.45 },
            });
          } catch {
            // ignore
          }
        }
      } else {
        if (!stateRef.current.isFinished || !winner) {
          const defaultRankings: RankedHorse[] = horses.map((h, idx) => ({
            horse: h,
            position: idx + 1,
            distance: 0,
          }));
          setRankings(defaultRankings);
        }
      }

      // Render the complete scene
      renderFullTrack(currentElapsed, stateRef.current.positions, isRacing);

      animId = requestAnimationFrame(mainLoop);
    };

    animId = requestAnimationFrame(mainLoop);
    return () => cancelAnimationFrame(animId);
  }, [isRacing, horses, predeterminedWinner, onRaceFinish, winner]);

  // COMPLETE CANVAS RENDERING (900x480, 80px per lane, ULTRA DETAILED TRACK)
  const renderFullTrack = (currentElapsed: number, positions: number[], racing: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 900;
    const height = 480;
    const laneHeight = height / 6; // 80px per lane

    ctx.clearRect(0, 0, width, height);

    // --- 1. DETAILED TRACK BACKGROUND & DUAL SURFACE (CÉSPED Y ARENA) ---
    for (let i = 0; i < 6; i++) {
      const y = i * laneHeight;

      // Each lane is split: top 36% is Césped (Turf), bottom 64% is Arena (Dirt)
      const turfHeight = laneHeight * 0.36;
      const arenaHeight = laneHeight * 0.64;

      // A. Césped (Turf Grass)
      const turfGrad = ctx.createLinearGradient(0, y, 0, y + turfHeight);
      turfGrad.addColorStop(0, i % 2 === 0 ? '#1b4b24' : '#163f1f');
      turfGrad.addColorStop(1, i % 2 === 0 ? '#235c2e' : '#1a4823');
      ctx.fillStyle = turfGrad;
      ctx.fillRect(0, y, width, turfHeight);

      // Lawnmower striping effect
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      for (let s = 0; s < width; s += 30) {
        if ((s / 30) % 2 === 0) {
          ctx.fillRect(s, y, 15, turfHeight);
        }
      }

      // B. Arena / Dirt Racing Surface
      const arenaGrad = ctx.createLinearGradient(0, y + turfHeight, 0, y + laneHeight);
      arenaGrad.addColorStop(0, '#8c531b');
      arenaGrad.addColorStop(0.5, '#b46e28');
      arenaGrad.addColorStop(1, '#7a4515');
      ctx.fillStyle = arenaGrad;
      ctx.fillRect(0, y + turfHeight, width, arenaHeight);

      // Harrow Sand Grooves
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.14)';
      ctx.lineWidth = 1;
      for (let r = 8; r < arenaHeight; r += 9) {
        ctx.beginPath();
        ctx.moveTo(0, y + turfHeight + r);
        ctx.lineTo(width, y + turfHeight + r);
        ctx.stroke();
      }

      // Curb Divider with White Reflector Studs
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(0, y + turfHeight);
      ctx.lineTo(width, y + turfHeight);
      ctx.stroke();

      // White Rail (Baranda Oficial con Postes)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, y + laneHeight);
      ctx.lineTo(width, y + laneHeight);
      ctx.stroke();

      // Vertical Rail Posts every 35px
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1.2;
      for (let p = 15; p < width; p += 35) {
        ctx.beginPath();
        ctx.moveTo(p, y + laneHeight - 5);
        ctx.lineTo(p, y + laneHeight);
        ctx.stroke();
      }
    }

    // --- 2. DISTANCE FURLONG POSTS & MARKERS ---
    const markers = [
      { label: '800m', x: 260 },
      { label: '500m', x: 440 },
      { label: '200m', x: 620 },
    ];

    markers.forEach(m => {
      // Dotted distance wire
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(m.x, 0);
      ctx.lineTo(m.x, height);
      ctx.stroke();
      ctx.setLineDash([]);

      // Overhead distance plaque
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(m.x - 22, 4, 44, 18);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      ctx.strokeRect(m.x - 22, 4, 44, 18);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(m.label, m.x, 17);
    });

    // --- 3. THE FINISH LINE (LA META) - 100% VISIBLE WITH OVERHEAD ARCH ---
    const finishX = 750;
    const checkWidth = 14;

    // Checkerboard Ground Tape
    for (let r = 0; r < Math.ceil(height / checkWidth); r++) {
      for (let c = 0; c < 2; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? '#ffffff' : '#0a0f1d';
        ctx.fillRect(finishX + c * checkWidth, r * checkWidth, checkWidth, checkWidth);
      }
    }

    // Golden Finish Line Towers
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(finishX - 4, 0, 6, height);
    ctx.fillRect(finishX + checkWidth * 2 - 2, 0, 6, height);

    // Red Laser Finish Wire
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.9)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(finishX + checkWidth, 0);
    ctx.lineTo(finishX + checkWidth, height);
    ctx.stroke();

    // Overhead Finish Arch ("🏁 META OFICIAL · JEYHBET 🏁")
    ctx.fillStyle = '#0a0f1d';
    ctx.fillRect(finishX - 45, 6, checkWidth * 2 + 90, 26);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.strokeRect(finishX - 45, 6, checkWidth * 2 + 90, 26);

    ctx.fillStyle = '#fbbf24';
    ctx.font = '900 13px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🏁 META OFICIAL · JEYHBET 🏁', finishX + checkWidth, 23);

    // --- 4. STARTING GATES (GATERAS / PARTIDORES) ON THE LEFT ---
    const gateX = 10;
    const gateWidth = 65;

    for (let i = 0; i < 6; i++) {
      const y = i * laneHeight;

      // Metal Stall Box
      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
      ctx.fillRect(gateX, y + 4, gateWidth, laneHeight - 8);

      // Steel Outline
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      ctx.strokeRect(gateX, y + 4, gateWidth, laneHeight - 8);

      // Stall Number Plate with horse color
      ctx.fillStyle = horses[i]?.colorHex || '#ffffff';
      ctx.fillRect(gateX + 4, y + 8, 22, laneHeight - 16);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px "Barlow Condensed", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${i + 1}`, gateX + 15, y + laneHeight / 2);

      // Gates Doors
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 3.5;
      if (!racing && !stateRef.current.isFinished) {
        // Doors Closed
        ctx.beginPath();
        ctx.moveTo(gateX + gateWidth, y + 6);
        ctx.lineTo(gateX + gateWidth, y + laneHeight - 6);
        ctx.stroke();
      } else {
        // Doors Flung Open!
        ctx.beginPath();
        ctx.moveTo(gateX + gateWidth, y + 6);
        ctx.lineTo(gateX + gateWidth + 18, y + 10);
        ctx.moveTo(gateX + gateWidth, y + laneHeight - 6);
        ctx.lineTo(gateX + gateWidth + 18, y + laneHeight - 10);
        ctx.stroke();

        // Gate burst sparks at 0-2s
        if (currentElapsed < 2 && racing) {
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(gateX + gateWidth + 10, y + laneHeight / 2, 4 + Math.random() * 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // --- 5. DRAW DIRT & SAND PARTICLES ---
    particlesRef.current.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // --- 6. DRAW ALL 6 HORSES & JOCKEYS ---
    const trackStartX = gateX + gateWidth + 20;
    const trackUsableWidth = (finishX + 45) - trackStartX;

    const horseCoatColors = [
      '#78350f', // 1: Alazán Dorado
      '#451a03', // 2: Castaño Oscuro
      '#5c2e0b', // 3: Zaino Brillante
      '#26150a', // 4: Azabache
      '#854d0e', // 5: Colorado
      '#94a3b8', // 6: Tordillo
    ];

    const isFinished = stateRef.current.isFinished;
    const targetWinner = stateRef.current.targetWinner;

    horses.forEach((horse, i) => {
      const y = i * laneHeight + 46;
      const progressRatio = (positions[i] || 0) / 1000;
      const x = trackStartX + progressRatio * trackUsableWidth;

      const timeNow = Date.now() / 1000;
      let bobY = 0;
      let gallopPhase = 0;
      let strideExt = 0;

      if (racing && !isFinished) {
        gallopPhase = Math.sin((currentElapsed * 26) + i * 2.3);
        bobY = gallopPhase * 4.5;
        strideExt = Math.cos((currentElapsed * 26) + i * 2.3);
      } else if (isFinished) {
        bobY = Math.sin(timeNow * 4 + i) * 2;
        strideExt = 0.2;
      } else {
        bobY = Math.sin(timeNow * 3 + i) * 1.5;
        strideExt = 0;
      }

      const coatColor = horseCoatColors[i] || '#633112';

      // Horse Ground Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(x, y + 20, 32 + strideExt * 5, 7 - Math.abs(gallopPhase) * 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Tail
      ctx.strokeStyle = i === 5 ? '#f1f5f9' : '#180d06';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(x - 24, y - 4 + bobY);
      if (racing) {
        ctx.quadraticCurveTo(x - 40, y + gallopPhase * 10, x - 50, y + 6 + bobY);
      } else {
        ctx.quadraticCurveTo(x - 32, y + 10, x - 36, y + 18 + Math.sin(timeNow * 4 + i) * 3);
      }
      ctx.stroke();

      // Hind Legs
      ctx.strokeStyle = coatColor;
      ctx.lineWidth = 4;
      ctx.beginPath();
      if (racing) {
        ctx.moveTo(x - 12, y + 5 + bobY);
        ctx.lineTo(x - 24 - strideExt * 10, y + 16 + bobY);
        ctx.lineTo(x - 30 - strideExt * 15, y + 26 + bobY);
        ctx.moveTo(x - 8, y + 5 + bobY);
        ctx.lineTo(x - 16 + strideExt * 10, y + 15 + bobY);
        ctx.lineTo(x - 20 + strideExt * 15, y + 25 + bobY);
      } else {
        ctx.moveTo(x - 12, y + 5 + bobY);
        ctx.lineTo(x - 14, y + 16 + bobY);
        ctx.lineTo(x - 15, y + 26 + bobY);
        ctx.moveTo(x - 8, y + 5 + bobY);
        ctx.lineTo(x - 9, y + 16 + bobY);
        ctx.lineTo(x - 10, y + 26 + bobY);
      }
      ctx.stroke();

      // Hind Hooves
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(racing ? x - 32 - strideExt * 15 : x - 17, y + 25 + bobY, 6, 4);
      ctx.fillRect(racing ? x - 22 + strideExt * 15 : x - 12, y + 24 + bobY, 6, 4);

      // Torso & Barrel (Muscular athletic body)
      ctx.fillStyle = coatColor;
      ctx.beginPath();
      ctx.ellipse(x, y + bobY, 24, 13, -0.08, 0, Math.PI * 2);
      ctx.fill();

      // Flank & Shoulder Muscle
      ctx.beginPath();
      ctx.arc(x - 14, y - 3 + bobY, 13, 0, Math.PI * 2);
      ctx.arc(x + 14, y - 2 + bobY, 13, 0, Math.PI * 2);
      ctx.fill();

      // Forelegs
      ctx.strokeStyle = coatColor;
      ctx.lineWidth = 4;
      ctx.beginPath();
      if (racing) {
        ctx.moveTo(x + 14, y + 6 + bobY);
        ctx.lineTo(x + 25 + strideExt * 15, y + 16 + bobY);
        ctx.lineTo(x + 32 + strideExt * 18, y + 26 + bobY);
        ctx.moveTo(x + 10, y + 6 + bobY);
        ctx.lineTo(x + 19 - strideExt * 12, y + 16 + bobY);
        ctx.lineTo(x + 22 - strideExt * 15, y + 25 + bobY);
      } else {
        ctx.moveTo(x + 14, y + 6 + bobY);
        ctx.lineTo(x + 15, y + 16 + bobY);
        ctx.lineTo(x + 16, y + 26 + bobY);
        ctx.moveTo(x + 10, y + 6 + bobY);
        ctx.lineTo(x + 11, y + 16 + bobY);
        ctx.lineTo(x + 12, y + 26 + bobY);
      }
      ctx.stroke();

      // Fore Hooves
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(racing ? x + 30 + strideExt * 18 : x + 14, y + 25 + bobY, 6, 4);
      ctx.fillRect(racing ? x + 20 - strideExt * 15 : x + 10, y + 24 + bobY, 6, 4);

      // Neck & Crest
      ctx.fillStyle = coatColor;
      ctx.beginPath();
      ctx.moveTo(x + 10, y - 7 + bobY);
      ctx.lineTo(x + 29, y - 21 + bobY);
      ctx.lineTo(x + 36, y - 16 + bobY);
      ctx.lineTo(x + 23, y + 3 + bobY);
      ctx.closePath();
      ctx.fill();

      // Flowing Mane
      ctx.strokeStyle = i === 5 ? '#ffffff' : '#170c05';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + 12, y - 8 + bobY);
      ctx.lineTo(x + 19, y - 14 + bobY);
      ctx.lineTo(x + 25, y - 19 + bobY);
      ctx.lineTo(x + 31, y - 23 + bobY);
      ctx.stroke();

      // Head, Muzzle & Ears
      ctx.fillStyle = coatColor;
      ctx.beginPath();
      ctx.moveTo(x + 27, y - 21 + bobY);
      ctx.lineTo(x + 38, y - 26 + bobY);
      ctx.lineTo(x + 48, y - 18 + bobY);
      ctx.lineTo(x + 45, y - 13 + bobY);
      ctx.lineTo(x + 34, y - 12 + bobY);
      ctx.closePath();
      ctx.fill();

      // White Blaze
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x + 37, y - 21 + bobY, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Nostril & Eye
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(x + 45, y - 16 + bobY, 1.5, 0, Math.PI * 2);
      ctx.arc(x + 35, y - 19 + bobY, 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Ears
      ctx.fillStyle = coatColor;
      ctx.beginPath();
      ctx.moveTo(x + 33, y - 23 + bobY);
      ctx.lineTo(x + 36, y - 31 + bobY);
      ctx.lineTo(x + 39, y - 24 + bobY);
      ctx.fill();

      // Bridle & Reins
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(x + 44, y - 15 + bobY);
      ctx.lineTo(x + 35, y - 23 + bobY);
      ctx.moveTo(x + 44, y - 15 + bobY);
      ctx.lineTo(x + 14, y - 13 + bobY);
      ctx.stroke();

      // Saddle Cloth (Vibrant Horse Color)
      ctx.fillStyle = horse.colorHex;
      ctx.fillRect(x - 9, y - 10 + bobY, 20, 14);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 9, y - 10 + bobY, 20, 14);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 13px "Barlow Condensed", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${horse.number}`, x + 1, y + bobY);

      // --- JOCKEY WITH RACING SILKS ---
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.ellipse(x - 4, y - 11 + bobY, 8, 5, 0.4, 0, Math.PI * 2);
      ctx.fill();

      // Boots
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(x - 3, y - 6 + bobY, 6, 7);

      // Silks Torso
      ctx.fillStyle = horse.colorHex;
      ctx.beginPath();
      ctx.ellipse(x + 1, y - 17 + bobY, 9, 8, 0.5, 0, Math.PI * 2);
      ctx.fill();

      // Silks White Chevron
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(x - 4, y - 17 + bobY);
      ctx.lineTo(x + 4, y - 21 + bobY);
      ctx.stroke();

      // Jockey Helmet
      ctx.fillStyle = horse.colorHex;
      ctx.beginPath();
      ctx.arc(x + 8, y - 26 + bobY, 6, 0, Math.PI * 2);
      ctx.fill();

      // Helmet Visor
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(x + 10, y - 27 + bobY);
      ctx.lineTo(x + 16, y - 24 + bobY);
      ctx.lineTo(x + 10, y - 23 + bobY);
      ctx.fill();

      // Jockey Arm
      const isWinnerCelebrating = isFinished && horse.number === targetWinner;

      if (isWinnerCelebrating) {
        // VICTORY CELEBRATION! Jockey raises arm high pumping whip!
        ctx.strokeStyle = horse.colorHex;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(x + 3, y - 18 + bobY);
        ctx.lineTo(x + 8, y - 35 + bobY);
        ctx.stroke();

        // Raised whip with gold handle
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x + 8, y - 35 + bobY);
        ctx.lineTo(x + 14, y - 46 + bobY);
        ctx.stroke();
      } else {
        ctx.strokeStyle = horse.colorHex;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(x + 3, y - 18 + bobY);
        ctx.lineTo(x + 13, y - 13 + bobY);
        ctx.stroke();

        if (racing) {
          const whipAngle = Math.sin(currentElapsed * 18 + i) * 0.5;
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x + 12, y - 14 + bobY);
          ctx.lineTo(x + 4 - Math.cos(whipAngle) * 11, y - 22 - Math.sin(whipAngle) * 11 + bobY);
          ctx.stroke();
        }
      }

      // --- 7. ANIMACIÓN DE FESTEJO CON BANDERA (100% VISIBLE, NUNCA CORTADA) ---
      if (isWinnerCelebrating) {
        // A. Golden Winner Spotlight Aura
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.ellipse(x, y + 10, 48, 25, 0, 0, Math.PI * 2);
        ctx.stroke();

        // B. Large Waving Silk Victory Flag (STRICTLY CLAMPED WITHIN CANVAS BOUNDS)
        const flagWidth = 60;
        const flagHeight = 38;

        // Clamp flagPoleX horizontally so the 60px flag never exits the right border
        const flagPoleX = Math.min(x + 12, width - flagWidth - 15);

        // Crucial Fix: If horse is in lane 0 or 1 (y < 120), clamp so flag never cuts off at y=0!
        const desiredBaseY = y - 14 + bobY;
        const minimumAllowedBaseY = flagHeight + 20; // Needs at least 58px above baseY
        const safeBaseY = Math.max(minimumAllowedBaseY, desiredBaseY);
        const flagTopY = safeBaseY - flagHeight - 10;

        // Flagpole (Gold staff with finial)
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(flagPoleX, safeBaseY + 5);
        ctx.lineTo(flagPoleX, flagTopY);
        ctx.stroke();

        // Gold spearhead top on pole
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(flagPoleX, flagTopY - 2, 4, 0, Math.PI * 2);
        ctx.fill();

        // Waving Flag Fabric (Cloth flutter simulation)
        const wave = Math.sin(timeNow * 8) * 5;
        ctx.fillStyle = horse.colorHex;
        ctx.beginPath();
        ctx.moveTo(flagPoleX, flagTopY);
        ctx.quadraticCurveTo(flagPoleX + flagWidth * 0.5, flagTopY + wave, flagPoleX + flagWidth, flagTopY + 3 + wave);
        ctx.lineTo(flagPoleX + flagWidth, flagTopY + flagHeight + wave);
        ctx.quadraticCurveTo(flagPoleX + flagWidth * 0.5, flagTopY + flagHeight - 4 + wave, flagPoleX, flagTopY + flagHeight - 4);
        ctx.closePath();
        ctx.fill();

        // Gold fringe border on victory flag
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // NUMBER ON THE VICTORY FLAG!
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 22px "Barlow Condensed", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Nº ${horse.number}`, flagPoleX + flagWidth * 0.5, flagTopY + 22 + wave);

        ctx.font = 'bold 8.5px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('¡GANADOR!', flagPoleX + flagWidth * 0.5, flagTopY + 32 + wave);
      } else {
        // Standard Horse Identification Badge
        const rankObj = rankings.find(r => r.horse.number === horse.number);
        const posLabel = rankObj ? `${rankObj.position}º` : `${horse.number}º`;

        const badgeX = x;
        // Clamp badge so it doesn't leave the top edge in lane 0
        const badgeY = Math.max(16, y - 44 + bobY);

        ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
        const labelText = `#${horse.number} ${horse.name.toUpperCase()} (${posLabel})`;
        ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
        const tw = ctx.measureText(labelText).width;
        ctx.fillRect(badgeX - tw / 2 - 6, badgeY - 11, tw + 12, 16);

        ctx.strokeStyle = horse.colorHex;
        ctx.lineWidth = 2;
        ctx.strokeRect(badgeX - tw / 2 - 6, badgeY - 11, tw + 12, 16);

        ctx.fillStyle = rankObj && rankObj.position === 1 ? '#fbbf24' : '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(labelText, badgeX, badgeY + 1);
      }
    });
  };

  const remainingSeconds = Math.max(0, Math.ceil(raceDuration - elapsed));
  const progressPercent = Math.min(100, Math.round((elapsed / raceDuration) * 100));

  return (
    <div className="relative rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl space-y-0">
      {/* Race Top HUD Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-extrabold tracking-wider text-slate-100 uppercase font-racing text-base">
            Hipódromo en Vivo · Carrera #{raceNumber}
          </span>
          <span className="text-amber-400 font-mono font-bold hidden sm:inline">· 6 CABALLOS EN PISTA</span>
        </div>

        <div className="flex items-center gap-3">
          {isRacing && (
            <div className="flex items-center gap-1.5 font-mono text-amber-400 font-extrabold bg-amber-950/70 px-3 py-1 rounded-xl border border-amber-500/50 shadow-inner">
              <Timer className="w-4 h-4 text-amber-400 animate-spin" />
              <span className="text-sm">{remainingSeconds}s restantes</span>
            </div>
          )}

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-900 border border-slate-800 transition-colors"
            title={soundEnabled ? 'Silenciar Sonido' : 'Activar Sonido'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>
        </div>
      </div>

      {/* Dynamic Commentary Bar */}
      <div className="px-4 py-2 bg-gradient-to-r from-amber-500/15 via-slate-950 to-amber-500/15 border-b border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 truncate">
          <span className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-bold font-racing text-[10px] uppercase">
            NARRADOR EN VIVO
          </span>
          <span className="font-medium text-slate-200 truncate italic">
            "{raceCommentary}"
          </span>
        </div>

        {rankings[0] && (
          <div className="shrink-0 flex items-center gap-1.5 text-[11px] font-mono">
            <span className="text-slate-400">Puntero:</span>
            <span
              className="px-2 py-0.5 rounded text-white font-bold shadow"
              style={{ backgroundColor: rankings[0].horse.colorHex }}
            >
              #{rankings[0].horse.number} {rankings[0].horse.name}
            </span>
          </div>
        )}
      </div>

      {/* FULL TRACK CANVAS CONTAINER */}
      <div className="relative w-full bg-[#0a0f1d] overflow-hidden">
        <canvas
          ref={canvasRef}
          width={900}
          height={480}
          className="w-full h-auto block aspect-[900/480]"
        />

        {/* 🏆 EN LA PANTALLA DE LA CARRERA / EL CUADRITO DE LOS CABALLOS (REQUERIMIENTO EXPLÍCITO) */}
        {winner && showWinnerOverlay && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-[2px] flex flex-col items-center justify-center p-3 sm:p-5 z-20 animate-in fade-in duration-200">
            <div className="bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-amber-400 rounded-3xl p-5 max-w-lg w-full text-center shadow-2xl space-y-3 ring-4 ring-amber-400/20">
              <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-amber-500 text-slate-950 font-black text-xs font-racing uppercase tracking-wider shadow">
                <Trophy className="w-3.5 h-3.5 fill-current" />
                <span>¡LLEGADA OFICIAL · CARRERA #{raceNumber}!</span>
              </div>

              {/* Big Winner Horse Presentation */}
              <div className="flex items-center justify-center gap-4 py-1">
                <div
                  className="w-20 h-20 rounded-2xl flex flex-col items-center justify-center text-white font-extrabold shadow-2xl border-4 border-amber-400 shrink-0"
                  style={{ backgroundColor: winner.colorHex }}
                >
                  <span className="text-[11px] font-bold uppercase tracking-widest text-white/90">Nº</span>
                  <span className="text-5xl font-racing font-black leading-none">{winner.number}</span>
                </div>

                <div className="text-left">
                  <span className="text-xs text-amber-400 font-bold uppercase font-racing block">
                    GANADOR DE LA CARRERA
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-racing tracking-wide leading-tight">
                    ¡GANÓ EL CABALLO Nº {winner.number}!
                  </h2>
                  <p className="text-sm text-slate-200 font-racing tracking-wider font-bold">
                    EJEMPLAR: {winner.name.toUpperCase()}
                  </p>
                  <p className="text-xs text-slate-300 font-mono mt-0.5">
                    Color: <strong className="text-white">{winner.colorName}</strong> · Cuota Oficial: <strong className="text-emerald-400 text-sm">x{winner.currentMultiplier}</strong>
                  </p>
                </div>
              </div>

              {/* User Explicit Notice Requirement: "al final tu pones en pantalla ganó tal caballo espera a la siguiente Carrara tal hora" */}
              <div className="p-3.5 bg-slate-950 border border-amber-500/50 rounded-2xl space-y-1">
                <span className="text-base sm:text-lg font-racing font-extrabold text-amber-300 block uppercase tracking-wide">
                  ⏰ ESPERA A LA SIGUIENTE CARRERA A LAS {scheduleInfo.nextSlotStr}
                </span>
                <span className="text-[11px] text-slate-400 font-mono block">
                  Horario Caracas · Partidas cada media hora (09:00 AM a 10:00 PM)
                </span>
                <div className="pt-1">
                  <span className="text-xs text-slate-300 font-mono">
                    Cuenta regresiva: <strong className="text-amber-400 font-bold font-mono text-sm">{Math.floor(scheduleInfo.secondsRemaining / 60).toString().padStart(2, '0')}:{(scheduleInfo.secondsRemaining % 60).toString().padStart(2, '0')}</strong>
                  </span>
                </div>
              </div>

              {/* Close / Minimize to inspect track button */}
              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  onClick={() => setShowWinnerOverlay(false)}
                  className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold font-racing uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Ver Pista de Caballos</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Floating reopen button if overlay is closed */}
        {winner && !showWinnerOverlay && (
          <button
            type="button"
            onClick={() => setShowWinnerOverlay(true)}
            className="absolute top-3 right-3 bg-slate-950/90 border border-amber-400 text-amber-300 px-3 py-1.5 rounded-xl text-xs font-racing font-bold flex items-center gap-1.5 shadow-xl hover:bg-slate-900 transition-colors z-10"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400 fill-current" />
            <span>Ver Ganador (Nº {winner.number})</span>
          </button>
        )}
      </div>

      {/* Progress Bar (0 to 30s) */}
      <div className="h-1.5 w-full bg-slate-950">
        <div
          className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-500 transition-all duration-150"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Positions Strip Below Canvas (OUTSIDE canvas so no horse is covered!) */}
      {rankings.length === 6 && (
        <div className="px-3 py-2 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-1 overflow-x-auto text-xs">
          <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider mr-2 shrink-0 font-racing">
            {isRacing ? 'POSICIONES EN PISTA:' : 'ORDEN DE EJEMPLARES:'}
          </span>
          <div className="flex items-center gap-2 flex-1 justify-around">
            {rankings.map(r => (
              <div key={r.horse.number} className="flex items-center gap-1.5 text-xs shrink-0 bg-slate-900/80 px-2 py-1 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold font-mono">
                  {r.position}º
                </span>
                <div
                  className="w-5 h-5 rounded-md flex items-center justify-center font-bold text-white text-[11px] font-racing shadow-sm"
                  style={{ backgroundColor: r.horse.colorHex }}
                >
                  {r.horse.number}
                </div>
                <span className="text-[11px] text-slate-200 font-bold truncate max-w-[65px]">
                  {r.horse.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🏆 Official Result Banner Below Track */}
      {winner && (
        <div className="p-4 bg-gradient-to-br from-amber-500/15 via-slate-950 to-slate-900 border-t-2 border-amber-400 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-3.5 w-full sm:w-auto">
            <div
              className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center text-white font-extrabold shadow-xl shrink-0 border-2 border-amber-400"
              style={{ backgroundColor: winner.colorHex }}
            >
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/90">Nº</span>
              <span className="text-4xl font-racing font-black leading-none">{winner.number}</span>
            </div>

            <div>
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest font-racing flex items-center gap-1.5">
                <Flag className="w-3.5 h-3.5 text-amber-400" />
                <span>LLEGADA OFICIAL · CARRERA #{raceNumber}</span>
              </span>
              <h3 className="text-xl sm:text-2xl font-extrabold text-white font-racing tracking-wide">
                ¡GANÓ EL CABALLO Nº {winner.number} {winner.name.toUpperCase()}!
              </h3>
              <p className="text-xs text-slate-300 font-mono mt-0.5">
                Color: <strong className="text-white font-bold">{winner.colorName}</strong> · Cuota Oficial: <strong className="text-emerald-400 font-bold">x{winner.currentMultiplier}</strong>
              </p>
            </div>
          </div>

          <div className="p-3 bg-slate-900 border border-amber-500/40 rounded-xl text-center sm:text-right shrink-0">
            <span className="text-xs sm:text-sm font-racing font-bold text-amber-300 block uppercase">
              ⏰ ESPERA A LA SIGUIENTE CARRERA A LAS {scheduleInfo.nextSlotStr}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Zona Horaria Caracas
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
