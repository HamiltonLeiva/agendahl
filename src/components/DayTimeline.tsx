import { DragEvent, useMemo } from "react";
import dayjs, { Dayjs } from "dayjs";
import { AppUser, TaskItem } from "../types/models";

interface DayTimelineProps {
  selectedDate: Dayjs;
  tasks: TaskItem[];
  usersById: Map<string, AppUser>;
  density: "comfortable" | "compact";
  onEdit: (task: TaskItem) => void;
  onToggle: (task: TaskItem) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
  onMoveToSlot: (taskId: string, targetDateTime: Dayjs) => Promise<void>;
}

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

export function DayTimeline({
  selectedDate,
  tasks,
  usersById,
  density,
  onEdit,
  onToggle,
  onDelete,
  onMoveToSlot,
}: DayTimelineProps) {
  const dayTasks = useMemo(() => {
    return tasks
      .filter((task) => dayjs(task.startAt).isSame(selectedDate, "day"))
      .slice()
      .sort((a, b) => dayjs(a.startAt).valueOf() - dayjs(b.startAt).valueOf());
  }, [selectedDate, tasks]);

  const tasksByHour = useMemo(() => {
    return dayTasks.reduce<Record<number, TaskItem[]>>((acc, task) => {
      const hour = dayjs(task.startAt).hour();
      acc[hour] = acc[hour] ?? [];
      acc[hour].push(task);
      return acc;
    }, {});
  }, [dayTasks]);

  const handleDropToHour = async (event: DragEvent<HTMLElement>, hour: number) => {
    event.preventDefault();
    const taskId = event.dataTransfer.getData("text/task-id");
    if (!taskId) return;

    const sourceTask = tasks.find((task) => task.id === taskId);
    const minute = sourceTask ? dayjs(sourceTask.startAt).minute() : 0;

    await onMoveToSlot(taskId, selectedDate.hour(hour).minute(minute).second(0));
  };

  const now = dayjs();

  return (
    <section className={`card day-timeline ${density}`}>
      <header>
        <h3>{selectedDate.format("dddd, DD [de] MMMM [de] YYYY")}</h3>
        <span>{dayTasks.length} tareas</span>
      </header>

      <div className="timeline-grid">
        {HOURS.map((hour) => (
          <section
            key={hour}
            className={`timeline-slot ${
              now.isSame(selectedDate, "day") && now.hour() === hour ? "is-now" : ""
            }`}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => handleDropToHour(event, hour)}
          >
            <div className="timeline-hour">{String(hour).padStart(2, "0")}:00</div>

            <div className="timeline-cards">
              {(tasksByHour[hour] ?? []).map((task) => {
                const isCompleted = task.status === "completed";

                return (
                  <article
                    key={task.id}
                    className={`task-item timeline-task ${isCompleted ? "is-completed" : ""}`}
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
          </section>
        ))}
      </div>
    </section>
  );
}
