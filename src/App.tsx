import { Suspense, lazy, useMemo, useState } from "react";
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

function buildMiniCalendarDays(cursorDate: Dayjs) {
  const first = cursorDate.startOf("month").startOf("week").add(1, "day");
  return Array.from({ length: 42 }, (_, index) => first.add(index, "day"));
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

  const start = cursorDate.startOf("week").add(1, "day");
  const end = start.add(view === "week" ? 6 : 13, "day");
  return `${start.format("DD MMM")} - ${end.format("DD MMM YYYY")}`;
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
  } = useTasks(user?.uid ?? null);

  const [activeTab, setActiveTab] = useState<"agenda" | "reportes">("agenda");
  const [calendarView, setCalendarView] = useState<CalendarView>("month");
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const [cursorDate, setCursorDate] = useState(dayjs());
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | undefined>(undefined);
  const [filters, setFilters] = useState<TaskFilters>({
    query: "",
    status: "all",
    assigneeId: "all",
  });

  const usersById = useMemo(
    () => new Map(users.map((person) => [person.id, person])),
    [users],
  );

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
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

  const rangeLabel = useMemo(() => getRangeLabel(calendarView, cursorDate), [calendarView, cursorDate]);
  const viewTransitionKey = `${calendarView}-${cursorDate.format("YYYY-MM-DD")}-${density}`;

  const { alertMessages, pendingAlerts, dismissAlert, requestPermission } = useTaskAlerts(tasks);

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
          <h1>Agenda Multiusuario Inteligente</h1>
          <p>
            Gestiona tareas compartidas, responsables, alertas y reportes en tiempo real.
            Funciona online y offline desde movil, tablet, laptop o smart TV.
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
          <h1>Agenda Compartida</h1>
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
            </div>
          </div>
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
      </section>

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
              {miniDays.map((day) => {
                const key = day.format("YYYY-MM-DD");
                const count = taskCountByDate[key] ?? 0;
                const isSelected = day.isSame(selectedDate, "day");
                const isToday = day.isSame(dayjs(), "day");
                const isOutsideMonth = !day.isSame(cursorDate, "month");

                return (
                  <button
                    key={key}
                    className={`mini-day ${isSelected ? "is-selected" : ""} ${isToday ? "is-today" : ""} ${isOutsideMonth ? "is-outside" : ""}`}
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
                  onDelete={removeTask}
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
                  onDelete={removeTask}
                  onMoveTask={moveTaskToDate}
                />
              )}
            </Suspense>
          </div>
        </section>
      ) : (
        <Suspense fallback={loadingCard}>
          <ReportsPanel tasks={tasks} users={users} />
        </Suspense>
      )}

      {isFormOpen && (
        <Suspense fallback={null}>
          <TaskForm
            users={users}
            task={selectedTask}
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
