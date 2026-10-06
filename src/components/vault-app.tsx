import { useServerFn } from "@tanstack/react-start";
import { Download, Share2, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { EngineHandle } from "@/game/engine";
import { SIGNALS, signalName } from "@/game/layout";
import { pickQuestions, shuffle } from "@/game/questions";
import { scoreVibe } from "@/game/score";
import { VIBE_COPY, type AnswerRec, type Question, type VibeId } from "@/game/types";
import { claimReward } from "@/lib/reward.functions";

type Phase = "intro" | "opening" | "explore" | "reveal" | "forging" | "portrait" | "glitch" | "soldout";

const LETTERS = ["A", "B", "C", "D"] as const;

export function VaultApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<EngineHandle | null>(null);
  const roundRef = useRef<Map<string, Question>>(new Map());
  const answersRef = useRef<AnswerRec[]>([]);
  const answeredIds = useRef<Set<string>>(new Set());
  const seedRef = useRef(0);
  const lifeRef = useRef(0);
  const pendingEnter = useRef(false);
  const phaseRef = useRef<Phase>("intro");
  const readyRef = useRef(false);
  const mutedRef = useRef(false);
  const enterRef = useRef<() => void>(() => {});
  const claim = useServerFn(claimReward);

  const [run, setRun] = useState(0);
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState<Phase>("intro");
  const [focus, setFocus] = useState<string | null>(null);
  const [found, setFound] = useState(0);
  const [muted, setMuted] = useState(false);
  const [coarse, setCoarse] = useState(false);
  const [active, setActive] = useState<{ id: string; question: Question; openedAt: number } | null>(null);
  const [closing, setClosing] = useState(false);
  const [vibe, setVibe] = useState<VibeId | null>(null);
  const [portrait, setPortrait] = useState<string | null>(null);
  const [forgeError, setForgeError] = useState<string | null>(null);
  const [forging, setForging] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [nudge, setNudge] = useState(false);

  phaseRef.current = phase;
  readyRef.current = ready;
  mutedRef.current = muted;

  useEffect(() => {
    setCoarse(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let dead = false;
    let handle: EngineHandle | null = null;
    setBootError(null);
    dealRound();

    void import("@/game/engine")
      .then((mod) => {
        if (dead) return;
        try {
          handle = mod.mountEngine(canvas, {
            onReady: () => {
              if (!dead) setReady(true);
            },
            onFail: (message) => {
              if (!dead) setBootError(message);
            },
            onFocus: (id) => {
              if (!dead) setFocus(id);
            },
            onInteract: (id) => {
              if (answeredIds.current.has(id)) return;
              const question = roundRef.current.get(id);
              if (!question) return;
              handle?.setLocked(true);
              setActive({ id, question, openedAt: performance.now() });
            },
          });
          engineRef.current = handle;
        } catch (error) {
          if (dead) return;
          setBootError(error instanceof Error ? error.message : "The vault could not open.");
        }
      })
      .catch((error: unknown) => {
        if (dead) return;
        setBootError(error instanceof Error ? error.message : "The vault could not open.");
      });

    return () => {
      dead = true;
      handle?.dispose();
      engineRef.current = null;
      setReady(false);
    };
  }, [run]);

  useEffect(() => {
    if (!active) return;
    function onKey(event: KeyboardEvent) {
      const map: Record<string, number> = {
        Digit1: 0,
        Digit2: 1,
        Digit3: 2,
        Digit4: 3,
        KeyA: 0,
        KeyB: 1,
        KeyC: 2,
        KeyD: 3,
      };
      const index = map[event.code];
      if (index === undefined) {
        if (event.code === "Escape") dismiss();
        return;
      }
      event.preventDefault();
      commit(index);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // Answers are read from the active question at key time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => {
    if (ready && pendingEnter.current) enterRef.current();
  }, [ready]);

  useEffect(() => {
    if (focus) setNudge(false);
  }, [focus]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.repeat || phaseRef.current !== "intro") return;
      if (event.code !== "Enter" && event.code !== "NumpadEnter" && event.code !== "Space") return;
      event.preventDefault();
      enterRef.current();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function enter() {
    if (phaseRef.current !== "intro") return;
    if (bootError) return;
    if (!readyRef.current || !engineRef.current) {
      pendingEnter.current = true;
      setWaiting(true);
      return;
    }
    pendingEnter.current = false;
    setWaiting(false);
    const stamp = lifeRef.current;
    engineRef.current.startAudio();
    engineRef.current.setMuted(mutedRef.current);
    phaseRef.current = "opening";
    setPhase("opening");
    let settled = false;
    const finish = () => {
      if (settled || lifeRef.current !== stamp) return;
      settled = true;
      phaseRef.current = "explore";
      setPhase("explore");
    };
    engineRef.current.beginOpening(finish);
    window.setTimeout(() => {
      if (lifeRef.current !== stamp || settled) return;
      engineRef.current?.finishOpening();
    }, 2800);
  }
  enterRef.current = enter;

  function dismiss() {
    if (!active || closing) return;
    const stamp = lifeRef.current;
    setClosing(true);
    window.setTimeout(() => {
      if (lifeRef.current !== stamp) return;
      setActive(null);
      setClosing(false);
      engineRef.current?.setLocked(false);
    }, 160);
  }

  function commit(index: number) {
    if (!active || closing) return;
    const ms = Math.max(0, performance.now() - active.openedAt);
    answersRef.current.push({ correct: index === active.question.correct, ms });
    answeredIds.current.add(active.id);
    engineRef.current?.markAnswered(active.id);
    const count = answeredIds.current.size;
    setFound(count);
    const stamp = lifeRef.current;
    setClosing(true);
    window.setTimeout(() => {
      if (lifeRef.current !== stamp) return;
      setActive(null);
      setClosing(false);
      if (count >= 5) {
        const correct = answersRef.current.filter((answer) => answer.correct).length;
        engineRef.current?.enterFinale();
        if (correct < 3) {
          setVibe(null);
          setPortrait(null);
          setPhase("glitch");
          return;
        }
        const metrics = engineRef.current?.getMetrics();
        const next = scoreVibe(
          metrics ?? {
            moveDuty: 0,
            avgSpeed: 0,
            pathLength: 0,
            directness: 1,
            fullRooms: 0,
            zoneCoverage: 0,
            exploreSeconds: 0,
          },
          answersRef.current,
        );
        setVibe(next);
        setPhase("reveal");
      } else {
        engineRef.current?.setLocked(false);
      }
    }, 180);
  }

  async function claimNow() {
    if (!vibe || forging) return;
    if (answersRef.current.filter((answer) => answer.correct).length < 3) {
      setPhase("glitch");
      return;
    }
    const stamp = lifeRef.current;
    setForging(true);
    setForgeError(null);
    setPhase("forging");
    try {
      const result = await claim({ data: {} });
      if (lifeRef.current !== stamp) return;
      if (result.ok) {
        setPortrait(result.image);
        setForgeError(null);
        setPhase("portrait");
      } else if (result.soldOut) {
        setPortrait(null);
        setForgeError(null);
        setPhase("soldout");
      } else {
        setPortrait(null);
        setForgeError(result.error);
        setPhase("portrait");
      }
    } catch {
      if (lifeRef.current !== stamp) return;
      setPortrait(null);
      setForgeError("The drop could not be reached.");
      setPhase("portrait");
    } finally {
      if (lifeRef.current !== stamp) return;
      setForging(false);
    }
  }

  function download() {
    if (!portrait || !vibe) return;
    const link = document.createElement("a");
    link.href = portrait;
    const ext = portrait.startsWith("data:image/jpeg") || portrait.startsWith("data:image/jpg") ? "jpg" : "png";
    link.download = `optimum-vault-${vibe}.${ext}`;
    link.click();
  }

  async function share() {
    if (!vibe) return;
    const name = VIBE_COPY[vibe].name;
    const text = `I walked the Optimum Vault and came out a ${name}.\n\nOne of one.\n\n@get_optimum\nhttps://www.getoptimum.xyz/`;
    if (portrait && typeof navigator.share === "function") {
      try {
        const blob = await (await fetch(portrait)).blob();
        const file = new File([blob], `optimum-vault-${vibe}.png`, { type: blob.type || "image/png" });
        const payload: ShareData = { text, title: `Optimum Vault — ${name}`, files: [file] };
        if (!navigator.canShare || navigator.canShare(payload)) {
          await navigator.share(payload);
          return;
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  function dealRound() {
    const questions = pickQuestions();
    const ids = shuffle(SIGNALS.map((signal) => signal.id));
    roundRef.current = new Map(ids.map((id, index) => [id, questions[index]!]));
    answersRef.current = [];
    answeredIds.current = new Set();
  }

  function again() {
    lifeRef.current += 1;
    pendingEnter.current = false;
    setWaiting(false);
    setBootError(null);
    setNudge(false);
    setPhase("intro");
    setVibe(null);
    setPortrait(null);
    setForgeError(null);
    setFound(0);
    setFocus(null);
    setActive(null);
    setClosing(false);
    seedRef.current = 0;
    dealRound();
    if (engineRef.current) {
      engineRef.current.reset();
      setReady(true);
      return;
    }
    setRun((value) => value + 1);
  }

  function pressEnter() {
    const opened = engineRef.current?.tryInteract() ?? false;
    setNudge(!opened);
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    engineRef.current?.setMuted(next);
  }

  const vibeCopy = vibe ? VIBE_COPY[vibe] : null;
  const showHud = phase === "explore" && !active;

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#070708] text-ink">
      <canvas
        ref={canvasRef}
        className={
          "absolute inset-0 z-0 h-full w-full touch-none " +
          (phase === "explore" && !active ? "" : "pointer-events-none") +
          (phase === "glitch" ? " glitch-canvas" : "")
        }
      />
      <div className="vignette pointer-events-none absolute inset-0" />
      <div className={phase === "opening" ? "veil veil-in" : "veil"} />

      <div
        className={
          "absolute inset-0 z-30 flex flex-col items-center justify-center px-6 text-center transition-opacity duration-500 " +
          (phase === "intro" ? "opacity-100" : "pointer-events-none opacity-0")
        }
        onClick={enter}
        aria-hidden={phase !== "intro"}
        inert={phase !== "intro" ? true : undefined}
      >
        <p className="font-display text-xs font-semibold tracking-brand text-ash">OPTIMUM VAULT</p>
        <h1 className="mt-6 max-w-3xl font-display text-4xl font-semibold leading-tight text-ink sm:text-6xl">
          Are you ready for the adventure?
        </h1>
        {bootError ? (
          <>
            <p className="mt-6 max-w-md text-sm text-ash">{bootError}</p>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                again();
              }}
              className="vault-btn mt-8"
            >
              Try again
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                enter();
              }}
              className="vault-btn mt-10"
            >
              {waiting && !ready ? "Opening" : "Enter"}
            </button>
            <p className="mt-4 text-xs tracking-brand text-ash">
              {waiting && !ready ? "Preparing the vault" : "Click or press Enter"}
            </p>
          </>
        )}
      </div>

      {showHud ? (
        <>
          <div className="pointer-events-none absolute top-5 left-1/2 z-10 flex -translate-x-1/2 gap-2">
            {Array.from({ length: 5 }, (_, index) => (
              <span key={index} className={"h-px w-6 " + (index < found ? "bg-glow" : "bg-glow/25")} />
            ))}
          </div>
          <div className="pointer-events-none absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
            <span className="block h-3 w-3 border border-glow/70" />
          </div>
          <p className="pointer-events-none absolute bottom-24 left-1/2 z-10 w-11/12 max-w-xl -translate-x-1/2 text-center text-xs text-ash">
            {nudge && !focus
              ? "Get closer to a glowing signal, then press Enter."
              : coarse
                ? "Drag the left side to walk. Drag the right side to look."
                : "WASD or arrows to walk. Drag to look."}
          </p>
          <button
            type="button"
            onClick={pressEnter}
            className="vault-btn absolute bottom-8 left-1/2 z-20 max-w-[90vw] -translate-x-1/2"
          >
            {nudge && !focus ? "Get closer" : focus ? `Enter · ${signalName(focus)}` : "Enter"}
          </button>
          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? "Unmute" : "Mute"}
            className="vault-icon absolute bottom-5 left-5 z-20"
          >
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>
        </>
      ) : null}

      {active ? (
        <div
          className={
            "absolute inset-0 z-30 flex items-end justify-center bg-bg/55 p-4 sm:items-center " +
            (closing ? "opacity-0 transition-opacity duration-150" : "rise")
          }
          role="dialog"
          aria-modal="true"
          aria-labelledby="signal-question"
          onClick={dismiss}
        >
          <div
            className="w-full max-w-xl border border-glow/30 bg-char p-5 sm:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-xs tracking-brand text-ash">{signalName(active.id)}</p>
            <h2 id="signal-question" className="mt-3 font-display text-xl leading-snug text-ink sm:text-2xl">
              {active.question.prompt}
            </h2>
            <div className="mt-6 flex flex-col gap-2">
              {active.question.choices.map((choice, index) => (
                <button
                  key={choice}
                  type="button"
                  onClick={() => commit(index)}
                  className="vault-choice"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center border border-glow/30 font-display text-sm text-glow">
                    {LETTERS[index]}
                  </span>
                  <span className="text-sm leading-snug text-ink">{choice}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {phase === "glitch" ? (
        <section className="glitch-screen absolute inset-0 z-40 flex flex-col items-center justify-center px-6 text-center">
          <p className="text-xs tracking-brand text-glow">ACCESS DENIED</p>
          <h2 className="glitch-title mt-4 font-display text-4xl font-semibold text-ink sm:text-6xl">Signal rejected</h2>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-ash">
            Three correct answers are required. The vault will not cut a portrait from this pass.
          </p>
          <button type="button" onClick={again} className="vault-btn mt-10">
            Try again
          </button>
        </section>
      ) : null}

      {phase === "reveal" && vibeCopy ? (
        <section className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-bg/94 px-6 text-center">
          <p className="rise text-xs tracking-brand text-ash">YOU ARE</p>
          <h2 className="reveal-word mt-4 font-display text-5xl font-semibold tracking-brand text-ink sm:text-7xl">
            {vibeCopy.name}
          </h2>
          <p className="rise mt-6 max-w-md text-base text-ash" style={{ animationDelay: "180ms" }}>
            {vibeCopy.line}
          </p>
          <button
            type="button"
            onClick={() => void claimNow()}
            className="vault-btn rise mt-10"
            style={{ animationDelay: "320ms" }}
          >
            Claim your portrait
          </button>
        </section>
      ) : null}

      {phase === "forging" ? (
        <section className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-bg px-6 text-center">
          <p className="font-display text-2xl text-ink">Claiming your portrait</p>
          <div className="forge-line mt-8" />
          <p className="mt-6 max-w-sm text-sm text-ash">One of one. It will not be repeated.</p>
        </section>
      ) : null}

      {phase === "soldout" ? (
        <section className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-[#070708] px-6 text-center">
          <p className="text-xs tracking-brand text-glow">SUPPLY</p>
          <h2 className="mt-4 font-display text-4xl font-semibold tracking-brand text-ink sm:text-6xl">MINTED OUT</h2>
          <p className="mt-6 max-w-md text-base leading-relaxed text-ash">
            All 10 supply has been minted out. Stay tuned for more.
          </p>
          <button type="button" onClick={again} className="vault-btn mt-10">
            Walk the vault again
          </button>
        </section>
      ) : null}

      {phase === "portrait" && vibeCopy ? (
        <section className="absolute inset-0 z-40 flex flex-col items-center justify-center overflow-y-auto bg-[#070708] px-5 py-8 text-center">
          <p className="text-xs tracking-brand text-glow">{vibeCopy.name}</p>
          {portrait ? (
            <img
              src={portrait}
              alt={`${vibeCopy.name} portrait`}
              className="mt-5 w-[min(88vw,34rem)] border border-glow/40 object-cover"
            />
          ) : null}
          {portrait ? <p className="mt-4 text-xs tracking-brand text-ash">ONE OF ONE</p> : null}
          {forgeError && !portrait ? <p className="mt-6 max-w-sm text-sm text-ash">{forgeError}</p> : null}
          {portrait ? (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button type="button" onClick={download} className="vault-btn">
                <Download className="size-4" />
                Download
              </button>
              <button type="button" onClick={() => void share()} className="vault-btn">
                <Share2 className="size-4" />
                Share
              </button>
            </div>
          ) : null}
          {forgeError && !portrait ? (
            <button type="button" onClick={() => void claimNow()} className="vault-btn vault-btn-ghost mt-4">
              Try the claim again
            </button>
          ) : null}
          <button type="button" onClick={again} className="vault-btn vault-btn-ghost mt-6">
            Walk the vault again
          </button>
        </section>
      ) : null}
    </main>
  );
}
