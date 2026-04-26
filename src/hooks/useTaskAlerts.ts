import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { TaskItem } from "../types/models";

const ALERT_MEMORY_KEY = "agenda-alerted-tasks";

interface AlertMessage {
  id: string;
  title: string;
  startsAt: string;
  reminderMinutes: number;
}

export interface TaskAlertOptions {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  notificationsEnabled: boolean;
}

let audioContextRef: AudioContext | null = null;

function playAlertTone() {
  if (typeof window === "undefined") return;

  const AudioContextClass = window.AudioContext || (window as typeof window & {
    webkitAudioContext?: typeof AudioContext;
  }).webkitAudioContext;
  if (!AudioContextClass) return;

  const context = audioContextRef ?? new AudioContextClass();
  audioContextRef = context;

  if (context.state === "suspended") {
    context.resume().catch(() => {
      // Ignored: some browsers require explicit user interaction.
    });
  }

  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(880, now);
  oscillator.frequency.exponentialRampToValueAtTime(520, now + 0.35);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.22, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);

  oscillator.connect(gain);
  gain.connect(context.destination);

  oscillator.start(now);
  oscillator.stop(now + 0.45);
}

function vibrateDevice() {
  if (typeof navigator === "undefined") return;
  if (!("vibrate" in navigator)) return;

  navigator.vibrate([180, 80, 180]);
}

function loadAlerted(): Set<string> {
  const saved = localStorage.getItem(ALERT_MEMORY_KEY);
  if (!saved) return new Set<string>();

  try {
    return new Set<string>(JSON.parse(saved));
  } catch {
    return new Set<string>();
  }
}

function saveAlerted(ids: Set<string>) {
  localStorage.setItem(ALERT_MEMORY_KEY, JSON.stringify(Array.from(ids)));
}

function normalizeReminderMinutes(value: number[] | number | undefined) {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(value.map((entry) => Math.max(0, Number(entry))).filter((entry) => Number.isFinite(entry))),
    ).sort((left, right) => right - left);
  }

  return [Math.max(0, Number(value ?? 5))];
}

export function useTaskAlerts(tasks: TaskItem[], options: TaskAlertOptions) {
  const [alertMessages, setAlertMessages] = useState<AlertMessage[]>([]);

  useEffect(() => {
    const unlockAudio = () => {
      playAlertTone();
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };

    window.addEventListener("pointerdown", unlockAudio, { once: true });
    window.addEventListener("keydown", unlockAudio, { once: true });

    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, []);

  useEffect(() => {
    const alerted = loadAlerted();

    const checkTasks = () => {
      const now = dayjs();
      let changed = false;

      tasks.forEach((task) => {
        if (task.status === "completed") return;

        const startsAt = dayjs(task.startAt);
        const reminderMinutesList = normalizeReminderMinutes(task.reminderMinutes);

        reminderMinutesList.forEach((reminderMinutes) => {
          const minutesLeft = startsAt.diff(now, "minute", true);
          const shouldAlert =
            reminderMinutes === 0
              ? minutesLeft <= 0.5 && minutesLeft > -0.5
              : minutesLeft > 0 && minutesLeft <= reminderMinutes;
          const alertId = `${task.id}-${startsAt.valueOf()}-${reminderMinutes}`;

          if (!shouldAlert || alerted.has(alertId)) return;

          changed = true;
          alerted.add(alertId);

          setAlertMessages((current) => {
            const alreadyExists = current.some((item) => item.id === alertId);
            if (alreadyExists) return current;

            return [
              {
                id: alertId,
                title: task.title,
                startsAt: startsAt.format("HH:mm"),
                reminderMinutes,
              },
              ...current,
            ];
          });

          if (options.soundEnabled) {
            playAlertTone();
          }

          if (options.vibrationEnabled) {
            vibrateDevice();
          }

          if (
            options.notificationsEnabled &&
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            new Notification("Recordatorio de tarea", {
              body:
                reminderMinutes === 0
                  ? `${task.title} inicia ahora (${startsAt.format("HH:mm")})`
                  : `${task.title} inicia en ${reminderMinutes} min (${startsAt.format("HH:mm")})`,
              tag: alertId,
            });
          }
        });
      });

      if (changed) {
        saveAlerted(alerted);
      }
    };

    checkTasks();
    const timer = window.setInterval(checkTasks, 30_000);

    return () => window.clearInterval(timer);
  }, [options.notificationsEnabled, options.soundEnabled, options.vibrationEnabled, tasks]);

  const pendingAlerts = useMemo(() => alertMessages.length, [alertMessages.length]);

  return {
    alertMessages,
    pendingAlerts,
    dismissAlert: (id: string) =>
      setAlertMessages((current) => current.filter((entry) => entry.id !== id)),
    requestPermission: async () => {
      if (!options.notificationsEnabled) return;
      if (!("Notification" in window)) return;
      if (Notification.permission === "default") {
        await Notification.requestPermission();
      }
    },
  };
}
