"use client";

import { useEffect, useRef, useState } from "react";

/* ---------------------------- Chronomètre -------------------------- */
/*  Pour les défis en temps : on lance, on arrête, le temps (secondes   */
/*  entières, arrondi vers le bas) part directement dans le champ.      */
/*  Le temps se calcule sur l'horloge, pas en comptant des tics : il    */
/*  reste juste même si le téléphone se met en veille en cours de route.*/
export default function Stopwatch({ onTime }) {
  const [startedAt, setStartedAt] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [, setTick] = useState(0);
  const wakeLock = useRef(null);
  const running = startedAt !== null;

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setTick((t) => t + 1), 100);
    return () => clearInterval(id);
  }, [running]);

  // Empêche l'écran de s'éteindre pendant une planche de 7 minutes.
  const holdScreen = async () => {
    try {
      wakeLock.current = await navigator.wakeLock?.request("screen");
    } catch {}
  };
  const releaseScreen = () => {
    wakeLock.current?.release?.().catch(() => {});
    wakeLock.current = null;
  };
  useEffect(() => releaseScreen, []);

  const ms = running ? elapsed + (Date.now() - startedAt) : elapsed;
  const totalSec = Math.floor(ms / 1000);
  const mmss = `${Math.floor(totalSec / 60)}:${String(totalSec % 60).padStart(2, "0")}`;
  const tenths = Math.floor((ms % 1000) / 100);

  const start = () => {
    setStartedAt(Date.now());
    holdScreen();
  };
  const stop = () => {
    const final = elapsed + (Date.now() - startedAt);
    setElapsed(final);
    setStartedAt(null);
    releaseScreen();
    const s = Math.floor(final / 1000);
    onTime(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`);
  };
  const reset = () => {
    setElapsed(0);
    setStartedAt(null);
    releaseScreen();
  };

  return (
    <div className="chrono" role="group" aria-label="Chronomètre">
      <div className="chrono-time" aria-live="off">
        {mmss}
        <small>.{tenths}</small>
      </div>
      <div className="chrono-actions">
        {running ? (
          <button type="button" className="chrono-stop" onClick={stop}>
            Arrêter
          </button>
        ) : (
          <button type="button" className="chrono-start" onClick={start}>
            {elapsed ? "Reprendre" : "Démarrer"}
          </button>
        )}
        {!running && elapsed > 0 && (
          <button type="button" className="chrono-reset" onClick={reset}>
            Remettre à zéro
          </button>
        )}
      </div>
      <p className="chrono-hint" role="status">
        {running
          ? "En cours… L’écran reste allumé."
          : elapsed
            ? `${mmss} reporté dans le champ « Temps ». Vérifie, puis Ajouter.`
            : "Démarre au moment où la personne commence."}
      </p>
    </div>
  );
}
