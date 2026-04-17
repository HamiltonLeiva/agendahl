import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { TaskItem } from "../types/models";

const ALERT_MEMORY_KEY = "agenda-alerted-tasks";

interface AlertMessage {
  id: string;
  title: string;
  startsAt: string;
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

export function useTaskAlerts(tasks: TaskItem[]) {
  const [alertMessages, setAlertMessages] = useState<AlertMessage[]>([]);

  useEffect(() => {
    const alerted = loadAlerted();

    const checkTasks = () => {
      const now = dayjs();
      let changed = false;

      tasks.forEach((task) => {
        if (task.status === "completed") return;

        const startsAt = dayjs(task.startAt);
        const minutesLeft = startsAt.diff(now, "minute", true);
        const shouldAlert = minutesLeft > 0 && minutesLeft <= 5;
        const alertId = `${task.id}-${startsAt.valueOf()}`;

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
            },
            ...current,
          ];
        });

        if (Notification.permission === "granted") {
          new Notification("Recordatorio de tarea", {
            body: `${task.title} inicia a las ${startsAt.format("HH:mm")}`,
            tag: alertId,
          });
        }
      });

      if (changed) {
        saveAlerted(alerted);
      }
    };

    checkTasks();
    const timer = window.setInterval(checkTasks, 30_000);

    return () => window.clearInterval(timer);
  }, [tasks]);

  const pendingAlerts = useMemo(() => alertMessages.length, [alertMessages.length]);

  return {
    alertMessages,
    pendingAlerts,
    dismissAlert: (id: string) =>
      setAlertMessages((current) => current.filter((entry) => entry.id !== id)),
    requestPermission: async () => {
      if (!("Notification" in window)) return;
      if (Notification.permission === "default") {
        await Notification.requestPermission();
      }
    },
  };
}
