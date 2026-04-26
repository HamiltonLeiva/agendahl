import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import dayjs, { Dayjs } from "dayjs";
import "dayjs/locale/es";
import { useAuth } from "./hooks/useAuth";
import { useUsers } from "./hooks/useUsers";
import { useTasks } from "./hooks/useTasks";
import { useTaskAlerts } from "./hooks/useTaskAlerts";
import { TaskDraft, TaskFilters, TaskItem } from "./types/models";
import type { CalendarView } from "./components/CalendarGrid";

const CalendarGrid = lazy(() =>
  import("./components/CalendarGrid").then((module) => ({ default: module.CalendarGrid })),
);
const DayTimeline = lazy(() =>
  import("./components/DayTimeline").then((module) => ({ default: module.DayTimeline })),
);
const ReportsPanel = lazy(() =>
  import("./components/ReportsPanel").then((module) => ({ default: module.ReportsPanel })),
);
const TaskForm = lazy(() =>
  import("./components/TaskForm").then((module) => ({ default: module.TaskForm })),
);

dayjs.locale("es");

const MINI_WEEK_LABELS = ["L", "M", "X", "J", "V", "S", "D"];
const ALERT_PREFS_KEY = "agenda-alert-preferences";
const TRASH_RETENTION_DAYS = 30;
const MONTH_OPTIONS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function getMondayBasedWeekdayIndex(day: Dayjs) {
  return (day.day() + 6) % 7;
}

function buildMiniCalendarDays(cursorDate: Dayjs) {
  const monthStart = cursorDate.startOf("month");
  const daysInMonth = monthStart.daysInMonth();
  return Array.from({ length: daysInMonth }, (_, index) => monthStart.add(index, "day"));
}

function moveCursor(current: Dayjs, view: CalendarView, direction: -1 | 1) {
  if (view === "day") return current.add(direction, "day");
  if (view === "month") return current.add(direction, "month");
  if (view === "week") return current.add(direction, "week");
  return current.add(direction * 2, "week");
}

function getRangeLabel(view: CalendarView, cursorDate: Dayjs) {
  if (view === "day") return cursorDate.format("dddd, DD [de] MMMM [de] YYYY");
  if (view === "month") return cursorDate.format("MMMM [de] YYYY");

  const start = cursorDate.startOf("week");
  const end = start.add(view === "week" ? 6 : 13, "day");
  return `${start.format("DD MMM")} - ${end.format("DD MMM YYYY")}`;
}

interface AlertPreferences {
  defaultReminderMinutes: number;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  notificationsEnabled: boolean;
}

function loadAlertPreferences(): AlertPreferences {
  const fallback: AlertPreferences = {
    defaultReminderMinutes: 5,
    soundEnabled: true,
    vibrationEnabled: true,
    notificationsEnabled: true,
  };

  const saved = localStorage.getItem(ALERT_PREFS_KEY);
  if (!saved) return fallback;

  try {
    const parsed = JSON.parse(saved) as Partial<AlertPreferences>;

    return {
      defaultReminderMinutes: Number(parsed.defaultReminderMinutes ?? fallback.defaultReminderMinutes),
      soundEnabled: Boolean(parsed.soundEnabled ?? fallback.soundEnabled),
      vibrationEnabled: Boolean(parsed.vibrationEnabled ?? fallback.vibrationEnabled),
      notificationsEnabled: Boolean(parsed.notificationsEnabled ?? fallback.notificationsEnabled),
    };
  } catch {
    return fallback;
  }
}

function escapeExcelHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function App() {
  const { user, isLoading: authLoading, login, logout } = useAuth();
  const { users, error: usersError } = useUsers(user?.uid ?? null);
  const {
    tasks,
    isLoading: tasksLoading,
    error: tasksError,
    createTask,
    updateTask,
    toggleTask,
    removeTask,
    restoreTask,
    purgeTask,
  } = useTasks(user?.uid ?? null);

  const [activeTab, setActiveTab] = useState<"agenda" | "reportes">("agenda");
  const [calendarView, setCalendarView] = useState<CalendarView>("month");
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const [cursorDate, setCursorDate] = useState(dayjs());
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | undefined>(undefined);
  const [alertPreferences, setAlertPreferences] = useState<AlertPreferences>(() => loadAlertPreferences());
  const [showTrash, setShowTrash] = useState(false);
  const autoPurgingTrashRef = useRef(false);
  const [filters, setFilters] = useState<TaskFilters>({
    query: "",
    status: "all",
    assigneeId: "all",
  });

  useEffect(() => {
    localStorage.setItem(ALERT_PREFS_KEY, JSON.stringify(alertPreferences));
  }, [alertPreferences]);

  const usersById = useMemo(
    () => new Map(users.map((person) => [person.id, person])),
    [users],
  );

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (task.deletedAt) return false;
      const byStatus = filters.status === "all" ? true : task.status === filters.status;
      const byAssignee =
        filters.assigneeId === "all" ? true : task.assigneeIds.includes(filters.assigneeId);
      const byQuery =
        !filters.query ||
        `${task.title} ${task.description}`.toLowerCase().includes(filters.query.toLowerCase());

      return byStatus && byAssignee && byQuery;
    });
  }, [filters, tasks]);

  const miniDays = useMemo(() => buildMiniCalendarDays(cursorDate), [cursorDate]);
  const miniLeadingBlanks = useMemo(
    () => getMondayBasedWeekdayIndex(cursorDate.startOf("month")),
    [cursorDate],
  );
  const miniTrailingBlanks = useMemo(() => {
    const usedCells = miniLeadingBlanks + miniDays.length;
    return (7 - (usedCells % 7)) % 7;
  }, [miniLeadingBlanks, miniDays.length]);

  const yearOptions = useMemo(() => {
    const year = cursorDate.year();
    return Array.from({ length: 9 }, (_, index) => year - 4 + index);
  }, [cursorDate]);

  const taskCountByDate = useMemo(() => {
    return filteredTasks.reduce<Record<string, number>>((acc, task) => {
      const key = dayjs(task.startAt).format("YYYY-MM-DD");
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
  }, [filteredTasks]);

  const activeTasks = useMemo(() => tasks.filter((task) => !task.deletedAt), [tasks]);
  const trashedTasks = useMemo(
    () => tasks.filter((task) => Boolean(task.deletedAt)).sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0)),
    [tasks],
  );

  const rangeLabel = useMemo(() => getRangeLabel(calendarView, cursorDate), [calendarView, cursorDate]);
  const viewTransitionKey = `${calendarView}-${cursorDate.format("YYYY-MM-DD")}-${density}`;
  const monthlyTasksForExport = useMemo(() => {
    return activeTasks
      .filter((task) => dayjs(task.startAt).isSame(cursorDate, "month"))
      .slice()
      .sort((left, right) => dayjs(left.startAt).valueOf() - dayjs(right.startAt).valueOf());
  }, [activeTasks, cursorDate]);

  const { alertMessages, pendingAlerts, dismissAlert, requestPermission } = useTaskAlerts(activeTasks, {
    soundEnabled: alertPreferences.soundEnabled,
    vibrationEnabled: alertPreferences.vibrationEnabled,
    notificationsEnabled: alertPreferences.notificationsEnabled,
  });

  const handleTaskSave = async (draft: TaskDraft) => {
    if (!user) return;

    if (selectedTask) {
      await updateTask(selectedTask.id, draft);
    } else {
      await createTask(draft, user.uid);
    }

    setIsFormOpen(false);
    setSelectedTask(undefined);
  };

  const handleTrashRestore = async (task: TaskItem) => {
    await restoreTask(task.id);
    setShowTrash(true);
  };

  const handleTrashPurge = async (task: TaskItem) => {
    await purgeTask(task.id);
  };

  const handleMonthlyExcelExport = () => {
    if (!monthlyTasksForExport.length) {
      window.alert("No hay actividades en el mes seleccionado para exportar.");
      return;
    }

    const monthStart = cursorDate.startOf("month");
    const daysInMonth = monthStart.daysInMonth();
    const leadingBlankDays = getMondayBasedWeekdayIndex(monthStart);
    const totalCells = leadingBlankDays + daysInMonth;
    const trailingBlankDays = (7 - (totalCells % 7)) % 7;

    const calendarDays = [
      ...Array.from({ length: leadingBlankDays }, () => null),
      ...Array.from({ length: daysInMonth }, (_, index) => monthStart.add(index, "day")),
      ...Array.from({ length: trailingBlankDays }, () => null),
    ];

    const tasksByDate = monthlyTasksForExport.reduce<Record<string, TaskItem[]>>((acc, task) => {
      const key = dayjs(task.startAt).format("YYYY-MM-DD");
      acc[key] = acc[key] ?? [];
      acc[key].push(task);
      return acc;
    }, {});

    Object.values(tasksByDate).forEach((dayTasks) => {
      dayTasks.sort((left, right) => dayjs(left.startAt).valueOf() - dayjs(right.startAt).valueOf());
    });

    const weekRowsHtml = [] as string[];
    for (let index = 0; index < calendarDays.length; index += 7) {
      const weekDays = calendarDays.slice(index, index + 7);

      const dateRow = weekDays
        .map((date) => {
          if (!date) return '<td class="date-cell muted"></td>';
          return `<td class="date-cell">${date.format("DD")}</td>`;
        })
        .join("");

      const tasksRow = weekDays
        .map((date) => {
          if (!date) return '<td class="tasks-cell muted"></td>';

          const key = date.format("YYYY-MM-DD");
          const dayTasks = tasksByDate[key] ?? [];

          if (!dayTasks.length) {
            return '<td class="tasks-cell"></td>';
          }

          const taskHtml = dayTasks
            .map((task) => {
              const start = dayjs(task.startAt).format("HH:mm");
              const status = task.status === "completed" ? "[OK]" : "[PEND]";
              return `<div class="task-line">${escapeExcelHtml(`${start} ${status} ${task.title}`)}</div>`;
            })
            .join("");

          return `<td class="tasks-cell">${taskHtml}</td>`;
        })
        .join("");

      weekRowsHtml.push(`<tr>${dateRow}</tr><tr>${tasksRow}</tr>`);
    }

    const planningHtml = `
      <table class="planner-table">
        <tr>
          <th>LUNES</th>
          <th>MARTES</th>
          <th>MIERCOLES</th>
          <th>JUEVES</th>
          <th>VIERNES</th>
          <th>SABADO</th>
          <th>DOMINGO</th>
        </tr>
        ${weekRowsHtml.join("")}
      </table>
    `;

    const summary = {
      mes: cursorDate.format("MMMM YYYY"),
      total: monthlyTasksForExport.length,
      pendientes: monthlyTasksForExport.filter((task) => task.status === "pending").length,
      completadas: monthlyTasksForExport.filter((task) => task.status === "completed").length,
      generado: dayjs().format("DD/MM/YYYY HH:mm"),
    };

    const htmlDocument = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="UTF-8" />
          <style>
            body { font-family: Calibri, Arial, sans-serif; }
            h2, h3 { margin: 4px 0; text-align: center; }
            .month-title { text-transform: uppercase; text-align: center; margin: 6px 0 10px; }
            .meta { margin: 0 0 12px; text-align: center; font-size: 12px; }
            table { border-collapse: collapse; width: 100%; table-layout: fixed; }
            .planner-table th,
            .planner-table td { border: 1px solid #111; }
            .planner-table th {
              font-size: 11px;
              font-weight: 700;
              padding: 4px;
              text-align: center;
              background: #f2f2f2;
            }
            .date-cell {
              height: 18px;
              font-size: 11px;
              font-weight: 700;
              text-align: left;
              vertical-align: middle;
              padding: 1px 4px;
            }
            .tasks-cell {
              height: 82px;
              vertical-align: top;
              padding: 4px;
              font-size: 10px;
              line-height: 1.25;
            }
            .task-line {
              margin-bottom: 3px;
              white-space: normal;
              word-break: break-word;
            }
            .muted { background: #fafafa; }
          </style>
        </head>
        <body>
          <h2>VIDRIERIA SALEM</h2>
          <h3>PLANIFICACION MENSUAL</h3>
          <div class="month-title">MES: ${escapeExcelHtml(cursorDate.format("MMMM YYYY"))}</div>
          <p class="meta">Total: ${summary.total} | Pendientes: ${summary.pendientes} | Completadas: ${summary.completadas} | Generado: ${escapeExcelHtml(summary.generado)}</p>
          ${planningHtml}
        </body>
      </html>
    `;

    const filename = `planificacion-${cursorDate.format("YYYY-MM")}.xls`;
    const fileBlob = new Blob([`\uFEFF${htmlDocument}`], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const fileUrl = URL.createObjectURL(fileBlob);
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(fileUrl);
  };

  useEffect(() => {
    if (autoPurgingTrashRef.current) return;
    if (!trashedTasks.length) return;

    const now = Date.now();
    const maxAgeMs = TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const expiredTaskIds = trashedTasks
      .filter((task) => task.deletedAt && now - task.deletedAt >= maxAgeMs)
      .map((task) => task.id);

    if (!expiredTaskIds.length) return;

    autoPurgingTrashRef.current = true;

    Promise.all(expiredTaskIds.map((taskId) => purgeTask(taskId)))
      .catch(() => {
        // Ignore transient cleanup failures and retry on next state update.
      })
      .finally(() => {
        autoPurgingTrashRef.current = false;
      });
  }, [purgeTask, trashedTasks]);

  const moveTaskToDate = async (taskId: string, targetDate: Dayjs) => {
    const task = tasks.find((entry) => entry.id === taskId);
    if (!task) return;

    const currentStart = dayjs(task.startAt);
    const currentEnd = dayjs(task.endAt);
    const durationMinutes = Math.max(currentEnd.diff(currentStart, "minute"), 15);

    const nextStart = targetDate
      .hour(currentStart.hour())
      .minute(currentStart.minute())
      .second(0);
    const nextEnd = nextStart.add(durationMinutes, "minute");

    await updateTask(task.id, {
      title: task.title,
      description: task.description,
      startAt: nextStart.toISOString(),
      endAt: nextEnd.toISOString(),
      reminderMinutes: task.reminderMinutes,
      assigneeIds: task.assigneeIds,
    });

    setSelectedDate(nextStart);
    setCursorDate(nextStart);
  };

  const moveTaskToSlot = async (taskId: string, targetDateTime: Dayjs) => {
    const task = tasks.find((entry) => entry.id === taskId);
    if (!task) return;

    const currentStart = dayjs(task.startAt);
    const currentEnd = dayjs(task.endAt);
    const durationMinutes = Math.max(currentEnd.diff(currentStart, "minute"), 15);

    const nextStart = targetDateTime.second(0);
    const nextEnd = nextStart.add(durationMinutes, "minute");

    await updateTask(task.id, {
      title: task.title,
      description: task.description,
      startAt: nextStart.toISOString(),
      endAt: nextEnd.toISOString(),
      reminderMinutes: task.reminderMinutes,
      assigneeIds: task.assigneeIds,
    });

    setSelectedDate(nextStart);
    setCursorDate(nextStart);
  };

  if (authLoading) {
    return <main className="app-shell loading">Cargando agenda colaborativa...</main>;
  }

  const loadingCard = <section className="card">Cargando vista...</section>;

  if (!user) {
    return (
      <main className="app-shell auth-screen">
        <section className="card hero">
          <h1>Vidrería Salem</h1>
          <p>
            Planificación de actividades.
          </p>
          <button className="btn" onClick={() => login()}>
            Ingresar con Google
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar card">
        <div>
          <h1>Vidriería Salem</h1>
          <h2>Planificación de actividades</h2>
          <p>
            {navigator.onLine ? "Conectado" : "Sin conexion"} · {users.length} usuarios activos
          </p>
        </div>

        <div className="topbar-actions">
          <button className="btn ghost" onClick={() => requestPermission()}>
            Activar alertas ({pendingAlerts})
          </button>
          <button
            className="btn"
            onClick={() => {
              setSelectedTask(undefined);
              setIsFormOpen(true);
            }}
          >
            Nueva tarea
          </button>
          <button className="btn ghost" onClick={() => logout()}>
            Salir
          </button>
        </div>
      </header>

      {(usersError || tasksError) && (
        <section className="card" role="alert">
          <strong>Problema de configuracion en Firebase</strong>
          <p>{tasksError ?? usersError}</p>
          <p>
            Solucion: verifica reglas de Firestore, que Google Auth este activo y que la sesion
            este iniciada correctamente.
          </p>
        </section>
      )}

      {!!alertMessages.length && (
        <section className="alerts-wrap">
          {alertMessages.map((alert) => (
            <article key={alert.id} className="card alert-item">
              <div>
                <strong>Recordatorio</strong>
                <p>
                  {alert.title} inicia a las {alert.startsAt}
                </p>
                <small>
                  {alert.reminderMinutes === 0
                    ? "Aviso al iniciar"
                    : `Aviso ${alert.reminderMinutes} min antes`}
                </small>
              </div>
              <button className="btn tiny ghost" onClick={() => dismissAlert(alert.id)}>
                Cerrar
              </button>
            </article>
          ))}
        </section>
      )}

      <section className="card controls">
        <div className="tabs" aria-label="Navegacion de secciones">
          <button
            className={`tab ${activeTab === "agenda" ? "active" : ""}`}
            onClick={() => setActiveTab("agenda")}
          >
            Agenda
          </button>
          <button
            className={`tab ${activeTab === "reportes" ? "active" : ""}`}
            onClick={() => setActiveTab("reportes")}
          >
            Reportes
          </button>
        </div>

        {activeTab === "agenda" && (
          <div className="calendar-toolbar">
            <div className="toolbar-group">
              <button
                className="btn ghost tiny"
                onClick={() => {
                  const now = dayjs();
                  setCursorDate(now);
                  setSelectedDate(now);
                }}
              >
                Hoy
              </button>
              <button
                className="btn ghost tiny"
                onClick={() => {
                  const next = moveCursor(cursorDate, calendarView, -1);
                  setCursorDate(next);
                  setSelectedDate(next);
                }}
              >
                Anterior
              </button>
              <button
                className="btn ghost tiny"
                onClick={() => {
                  const next = moveCursor(cursorDate, calendarView, 1);
                  setCursorDate(next);
                  setSelectedDate(next);
                }}
              >
                Siguiente
              </button>
              <p className="range-label">{rangeLabel}</p>
            </div>

            <div className="toolbar-group">
              <button
                className={`tab ${calendarView === "day" ? "active" : ""}`}
                onClick={() => setCalendarView("day")}
              >
                Diaria
              </button>
              <button
                className={`tab ${calendarView === "month" ? "active" : ""}`}
                onClick={() => setCalendarView("month")}
              >
                Mensual
              </button>
              <button
                className={`tab ${calendarView === "week" ? "active" : ""}`}
                onClick={() => setCalendarView("week")}
              >
                Semanal
              </button>
              <button
                className={`tab ${calendarView === "biweek" ? "active" : ""}`}
                onClick={() => setCalendarView("biweek")}
              >
                Quincenal
              </button>
            </div>

            <div className="month-picker">
              <label className="picker-field">
                <span>Mes</span>
                <select
                  aria-label="Seleccionar mes"
                  value={cursorDate.month()}
                  onChange={(event) => {
                    const next = cursorDate.month(Number(event.target.value));
                    setCursorDate(next);
                    setSelectedDate(next);
                  }}
                >
                  {MONTH_OPTIONS.map((monthLabel, index) => (
                    <option key={monthLabel} value={index}>
                      {monthLabel}
                    </option>
                  ))}
                </select>
              </label>

              <label className="picker-field">
                <span>Año</span>
                <select
                  aria-label="Seleccionar anio"
                  value={cursorDate.year()}
                  onChange={(event) => {
                    const next = cursorDate.year(Number(event.target.value));
                    setCursorDate(next);
                    setSelectedDate(next);
                  }}
                >
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>

              <button
                className="btn ghost tiny"
                onClick={() =>
                  setDensity((current) =>
                    current === "comfortable" ? "compact" : "comfortable",
                  )
                }
              >
                {density === "comfortable" ? "Vista compacta" : "Vista amplia"}
              </button>

              <button className="btn ghost tiny" onClick={handleMonthlyExcelExport}>
                Exportar Excel mensual
              </button>
            </div>
          </div>
        )}

        {activeTab === "agenda" && (
          <section className="quick-settings">
            <div>
              <h3>Configuración rápida de alertas</h3>
              <p>Deja listas tus preferencias para nuevas tareas y recordatorios automáticos.</p>
            </div>

            <div className="settings-grid">
              <label>
                Recordatorio por defecto
                <select
                  value={alertPreferences.defaultReminderMinutes}
                  onChange={(event) =>
                    setAlertPreferences((current) => ({
                      ...current,
                      defaultReminderMinutes: Number(event.target.value),
                    }))
                  }
                >
                  <option value={0}>Al iniciar</option>
                  <option value={1}>1 minuto antes</option>
                  <option value={5}>5 minutos antes</option>
                  <option value={10}>10 minutos antes</option>
                  <option value={15}>15 minutos antes</option>
                  <option value={30}>30 minutos antes</option>
                  <option value={60}>1 hora antes</option>
                  <option value={120}>2 horas antes</option>
                </select>
              </label>

              <label className="check-item toggle-item">
                <input
                  type="checkbox"
                  checked={alertPreferences.soundEnabled}
                  onChange={(event) =>
                    setAlertPreferences((current) => ({
                      ...current,
                      soundEnabled: event.target.checked,
                    }))
                  }
                />
                <span>Sonido en recordatorios</span>
              </label>

              <label className="check-item toggle-item">
                <input
                  type="checkbox"
                  checked={alertPreferences.vibrationEnabled}
                  onChange={(event) =>
                    setAlertPreferences((current) => ({
                      ...current,
                      vibrationEnabled: event.target.checked,
                    }))
                  }
                />
                <span>Vibración compatible</span>
              </label>

              <label className="check-item toggle-item">
                <input
                  type="checkbox"
                  checked={alertPreferences.notificationsEnabled}
                  onChange={(event) =>
                    setAlertPreferences((current) => ({
                      ...current,
                      notificationsEnabled: event.target.checked,
                    }))
                  }
                />
                <span>Notificaciones del navegador</span>
              </label>
            </div>
          </section>
        )}

        {activeTab === "agenda" && (
          <div className="filters-row">
            <input
              placeholder="Buscar tareas..."
              value={filters.query}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  query: event.target.value,
                }))
              }
            />
            <select
              aria-label="Filtrar por estado"
              value={filters.status}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  status: event.target.value as TaskFilters["status"],
                }))
              }
            >
              <option value="all">Todos</option>
              <option value="pending">Pendientes</option>
              <option value="completed">Completadas</option>
            </select>
            <select
              aria-label="Filtrar por responsable"
              value={filters.assigneeId}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  assigneeId: event.target.value,
                }))
              }
            >
              <option value="all">Cualquier responsable</option>
              {users.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.displayName}
                </option>
              ))}
            </select>
          </div>
        )}

        {activeTab === "agenda" && (
          <div className="toolbar-footer">
            <button className="btn ghost tiny" onClick={() => setShowTrash((current) => !current)}>
              {showTrash ? `Ocultar papelera (${trashedTasks.length})` : `Ver papelera (${trashedTasks.length})`}
            </button>
          </div>
        )}
      </section>

      {activeTab === "agenda" && showTrash && (
        <section className="card trash-panel">
          <header className="trash-panel-header">
            <div>
              <h3>Papelera</h3>
              <p>
                Tareas eliminadas que puedes restaurar o borrar definitivamente.
                Se eliminan automáticamente después de {TRASH_RETENTION_DAYS} días.
              </p>
            </div>
            <span>{trashedTasks.length} tareas</span>
          </header>

          {!trashedTasks.length ? (
            <p className="day-focus-empty">No hay tareas en la papelera.</p>
          ) : (
            <div className="trash-list">
              {trashedTasks.map((task) => (
                <article key={task.id} className="task-item is-trashed">
                  <div>
                    <p className="task-title">{task.title}</p>
                    <p className="task-time">
                      {dayjs(task.startAt).format("DD MMM HH:mm")} - {dayjs(task.endAt).format("HH:mm")}
                    </p>
                    <p className="task-desc">{task.description || "Sin descripcion"}</p>
                    <p className="task-assignees">
                      Eliminada el {dayjs(task.deletedAt ?? Date.now()).format("DD MMM YYYY, HH:mm")}
                    </p>
                  </div>

                  <div className="task-actions">
                    <button className="btn tiny" onClick={() => handleTrashRestore(task)}>
                      Restaurar
                    </button>
                    <button className="btn tiny danger" onClick={() => handleTrashPurge(task)}>
                      Borrar definitivamente
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === "agenda" ? (
        <section className="calendar-layout">
          <aside className="card mini-calendar-panel">
            <header>
              <h3>{cursorDate.format("MMMM YYYY")}</h3>
              <p>{filteredTasks.length} tareas en filtros activos</p>
            </header>

            <div className="mini-weekdays">
              {MINI_WEEK_LABELS.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>

            <div className="mini-days">
              {Array.from({ length: miniLeadingBlanks }, (_, index) => (
                <span key={`mini-blank-${index}`} className="mini-day-placeholder" aria-hidden="true" />
              ))}

              {miniDays.map((day) => {
                const key = day.format("YYYY-MM-DD");
                const count = taskCountByDate[key] ?? 0;
                const isSelected = day.isSame(selectedDate, "day");
                const isToday = day.isSame(dayjs(), "day");

                return (
                  <button
                    key={key}
                    className={`mini-day ${isSelected ? "is-selected" : ""} ${isToday ? "is-today" : ""}`}
                    onClick={() => {
                      setSelectedDate(day);
                      setCursorDate(day);
                    }}
                  >
                    <span>{day.format("D")}</span>
                    {count > 0 && <small>{count}</small>}
                  </button>
                );
              })}

              {Array.from({ length: miniTrailingBlanks }, (_, index) => (
                <span
                  key={`mini-trailing-blank-${index}`}
                  className="mini-day-placeholder"
                  aria-hidden="true"
                />
              ))}
            </div>
          </aside>

          <div key={viewTransitionKey} className={`calendar-main-panel ${density}`}>
            <Suspense fallback={loadingCard}>
              {tasksLoading ? (
                <section className="card">Cargando tareas...</section>
              ) : calendarView === "day" ? (
                <DayTimeline
                  selectedDate={selectedDate}
                  tasks={filteredTasks}
                  usersById={usersById}
                  density={density}
                  onEdit={(task) => {
                    setSelectedTask(task);
                    setIsFormOpen(true);
                  }}
                  onToggle={toggleTask}
                  onDelete={(taskId) => removeTask(taskId, user.uid)}
                  onMoveToSlot={moveTaskToSlot}
                />
              ) : (
                <CalendarGrid
                  view={calendarView}
                  cursorDate={cursorDate}
                  selectedDate={selectedDate}
                  tasks={filteredTasks}
                  usersById={usersById}
                  density={density}
                  onSelectDate={setSelectedDate}
                  onEdit={(task) => {
                    setSelectedTask(task);
                    setIsFormOpen(true);
                  }}
                  onToggle={toggleTask}
                  onDelete={(taskId) => removeTask(taskId, user.uid)}
                  onMoveTask={moveTaskToDate}
                />
              )}
            </Suspense>
          </div>
        </section>
      ) : (
        <Suspense fallback={loadingCard}>
          <ReportsPanel tasks={activeTasks} users={users} />
        </Suspense>
      )}

      {isFormOpen && (
        <Suspense fallback={null}>
          <TaskForm
            users={users}
            task={selectedTask}
            defaultReminderMinutes={alertPreferences.defaultReminderMinutes}
            onCancel={() => {
              setSelectedTask(undefined);
              setIsFormOpen(false);
            }}
            onSubmitTask={handleTaskSave}
          />
        </Suspense>
      )}
    </main>
  );
}

export default App;
