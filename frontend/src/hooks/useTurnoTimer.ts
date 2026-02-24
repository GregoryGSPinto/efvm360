// ============================================================================
// EFVM360 v3.2 — Hook: Turno Timer
// Extraído de App.tsx — cálculo de tempo decorrido do turno
// ============================================================================

import { useState, useCallback, useEffect } from 'react';

interface UseTurnoTimerReturn {
  tempoTurnoDecorrido: string;
  obterJanelaHoraria: () => string;
  obterLetraTurno: () => string;
}

export function useTurnoTimer(turnoSelecionado: string, usuarioLogado: unknown): UseTurnoTimerReturn {

  const calcularTempoTurnoDecorrido = useCallback((): string => {
    const agora = new Date();
    const horaAtual = agora.getHours();
    const minutoAtual = agora.getMinutes();

    const isDiurno = turnoSelecionado.includes('07:00-19:00') || turnoSelecionado.includes('07-19');
    const isNoturno = turnoSelecionado.includes('19:00-07:00') || turnoSelecionado.includes('19-07');

    if (!isDiurno && !isNoturno) return '00:00';

    let minutosDecorridos = 0;

    if (isDiurno) {
      if (horaAtual >= 7 && horaAtual < 19) {
        minutosDecorridos = (horaAtual - 7) * 60 + minutoAtual;
      } else if (horaAtual >= 19) {
        minutosDecorridos = 12 * 60;
      } else {
        minutosDecorridos = 0;
      }
    } else {
      if (horaAtual >= 19) {
        minutosDecorridos = (horaAtual - 19) * 60 + minutoAtual;
      } else if (horaAtual < 7) {
        minutosDecorridos = (5 * 60) + (horaAtual * 60) + minutoAtual;
      } else {
        minutosDecorridos = 12 * 60;
      }
    }

    minutosDecorridos = Math.max(0, Math.min(minutosDecorridos, 720));
    const horas = Math.floor(minutosDecorridos / 60);
    const minutos = minutosDecorridos % 60;

    return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
  }, [turnoSelecionado]);

  const [tempoTurnoDecorrido, setTempoTurnoDecorrido] = useState<string>('00:00');

  useEffect(() => {
    if (!usuarioLogado) return;
    setTempoTurnoDecorrido(calcularTempoTurnoDecorrido());
    const interval = setInterval(() => {
      setTempoTurnoDecorrido(calcularTempoTurnoDecorrido());
    }, 60000);
    return () => clearInterval(interval);
  }, [usuarioLogado, calcularTempoTurnoDecorrido]);

  const obterJanelaHoraria = useCallback((): string => {
    const turno = turnoSelecionado || '';
    if (turno.includes('07:00-19:00') || turno.includes('07-19')) return '07:00 – 19:00';
    if (turno.includes('19:00-07:00') || turno.includes('19-07')) return '19:00 – 07:00';
    const agora = new Date().getHours();
    return agora >= 7 && agora < 19 ? '07:00 – 19:00' : '19:00 – 07:00';
  }, [turnoSelecionado]);

  const obterLetraTurno = useCallback((): string => {
    const turno = turnoSelecionado || '';
    if (turno.includes('A') || turno.includes('07:00-19:00')) return 'A';
    if (turno.includes('B') || turno.includes('19:00-07:00')) return 'B';
    if (turno.includes('C')) return 'C';
    if (turno.includes('D')) return 'D';
    return new Date().getHours() >= 7 && new Date().getHours() < 19 ? 'A' : 'B';
  }, [turnoSelecionado]);

  return { tempoTurnoDecorrido, obterJanelaHoraria, obterLetraTurno };
}
