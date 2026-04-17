import { useMemo } from "react";
import dayjs, { Dayjs } from "dayjs";
import { AppUser, TaskItem } from "../types/models";

export type CalendarView = "day" | "month" | "week" | "biweek";

interface CalendarGridProps {
  view: CalendarView;
  cursorDate: Dayjs;
  selectedDate: Dayjs;
  tasks: TaskItem[];
  usersById: Map<string, AppUser>;
  density: "comfortable" | "compact";
  onSelectDate: (date: Dayjs) => void;
  onEdit: (task: TaskItem) => void;
  onToggle: (task: TaskItem) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
  onMoveTask: (taskId: string, targetDate: Dayjs) => Promise<void>;
}

const WEEKDAY_LABELS = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];

function getStaggerClass(index: number) {
  return `stagger-${Math.min(index, 20)}`;
}

function buildVisibleDays(view: CalendarView, cursorDate: Dayjs) {
  if (view === "day") {
    return [cursorDate.startOf("day")];
  }

  if (view === "month") {
    const monthStart = cursorDate.startOf("month");
    const first = monthStart.startOf("week").add(1, "day");
    return Array.from({ length: 42 }, (_, index) => first.add(index, "day"));
  }

  const start = cursorDate.startOf("week").add(1, "day");
  const length = view === "week" ? 7 : 14;
  return Array.from({ length }, (_, index) => start.add(index, "day"));
}

export function CalendarGrid({
  view,
  cursorDate,
  selectedDate,
  tasks,
  usersById,
  density,
  onSelectDate,
  onEdit,
  onToggle,
  onDelete,
  onMoveTask,
}: CalendarGridProps) {
  const visibleDays = useMemo(() => buildVisibleDays(view, cursorDate), [cursorDate, view]);

  const tasksByDate = useMemo(() => {
    return tasks.reduce<Record<string, TaskItem[]>>((acc, task) => {
      const key = dayjs(task.startAt).format("YYYY-MM-DD");
      acc[key] = acc[key] ?? [];
      acc[key].push(task);
      return acc;
    }, {});
  }, [tasks]);

  const selectedKey = selectedDate.format("YYYY-MM-DD");
  const selectedDayTasks = useMemo(() => {
    return (tasksByDate[selectedKey] ?? []).slice().sort((a, b) => {
      return dayjs(a.startAt).valueOf() - dayjs(b.startAt).valueOf();
    });
  }, [selectedKey, tasksByDate]);

  return (
    <>
      <section className={`card calendar-surface ${density}`}>
        <div className={`calendar-cells ${view}`}>
          {view !== "biweek" &&
            WEEKDAY_LABELS.map((label) => (
              <p key={label} className="calendar-weekday">
                {label}
              </p>
            ))}

          {view === "biweek" &&
            ["Semana 1", "Semana 2"].map((label) => (
              <p key={label} className="calendar-week-label">
                {label}
              </p>
            ))}

          {visibleDays.map((day, index) => {
            const key = day.format("YYYY-MM-DD");
            const dayTasks = tasksByDate[key] ?? [];
            const pending = dayTasks.filter((task) => task.status === "pending").length;
            const completed = dayTasks.length - pending;
            const isToday = day.isSame(dayjs(), "day");
            const isSelected = day.isSame(selectedDate, "day");
            const isOutsideMonth = view === "month" && !day.isSame(cursorDate, "month");
            return (
              <button
                type="button"
                key={key}
                className={`calendar-cell ${getStaggerClass(index)} ${isToday ? "is-today" : ""} ${isSelected ? "is-selected" : ""} ${isOutsideMonth ? "is-outside" : ""}`}
                onClick={() => onSelectDate(day)}
              >
                <div className="calendar-cell-head">
                  <span>{day.format("DD")}</span>
                  {dayTasks.length > 0 && <small>{dayTasks.length}</small>}
                </div>

                <div className="calendar-cell-metrics">
                  {pending > 0 && <span className="pill pending">{pending} pendientes</span>}
                  {completed > 0 && <span className="pill completed">{completed} completas</span>}
                </div>

                {dayTasks.slice(0, 2).map((task) => (
                  <p
                    key={task.id}
                    className="calendar-task-preview"
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/task-id", task.id);
                      event.dataTransfer.effectAllowed = "move";
                    }}
                  >
                    {dayjs(task.startAt).format("HH:mm")} {task.title}
                  </p>
                ))}

                <div
                  className="calendar-dropzone"
                  onDragOver={(event) => {
                    event.preventDefault();
                  }}
                  onDrop={async (event) => {
                    event.preventDefault();
                    const taskId = event.dataTransfer.getData("text/task-id");
                    if (!taskId) return;
                    await onMoveTask(taskId, day);
                  }}
                />
              </button>
            );
          })}
        </div>
      </section>

      <section className="card day-focus">
        <header>
          <h3>{selectedDate.format("dddd, DD [de] MMMM")}</h3>
          <span>{selectedDayTasks.length} tareas</span>
        </header>

        {!selectedDayTasks.length ? (
          <p className="day-focus-empty">
            No hay tareas para este dia. Selecciona otra fecha o crea una nueva tarea.
          </p>
        ) : (
          <div className="day-focus-list">
            {selectedDayTasks.map((task) => {
              const isCompleted = task.status === "completed";

              return (
                <article
                  key={task.id}
                  className={`task-item ${isCompleted ? "is-completed" : ""}`}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData("text/task-id", task.id);
                    event.dataTransfer.effectAllowed = "move";
                  }}
                >
                  <div>
                    <p className="task-title">{task.title}</p>
                    <p className="task-time">
                      {dayjs(task.startAt).format("HH:mm")} - {dayjs(task.endAt).format("HH:mm")}
                    </p>
                    <p className="task-desc">{task.description || "Sin descripcion"}</p>
                    <p className="task-assignees">
                      {task.assigneeIds
                        .map((id) => usersById.get(id)?.displayName ?? "Sin responsable")
                        .join(", ")}
                    </p>
                  </div>

                  <div className="task-actions">
                    <button className="btn tiny" onClick={() => onToggle(task)}>
                      {isCompleted ? "Reabrir" : "Completar"}
                    </button>
                    <button className="btn tiny ghost" onClick={() => onEdit(task)}>
                      Editar
                    </button>
                    <button className="btn tiny danger" onClick={() => onDelete(task.id)}>
                      Eliminar
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
