import dayjs from "dayjs";
import { AppUser, TaskItem } from "../types/models";

interface TaskBoardProps {
  tasks: TaskItem[];
  usersById: Map<string, AppUser>;
  onEdit: (task: TaskItem) => void;
  onToggle: (task: TaskItem) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
}

export function TaskBoard({ tasks, usersById, onEdit, onToggle, onDelete }: TaskBoardProps) {
  const grouped = tasks.reduce<Record<string, TaskItem[]>>((acc, task) => {
    const key = dayjs(task.startAt).format("YYYY-MM-DD");
    acc[key] = acc[key] ?? [];
    acc[key].push(task);
    return acc;
  }, {});

  const dates = Object.keys(grouped).sort();

  if (!dates.length) {
    return (
      <section className="card empty-state">
        <h3>No hay tareas registradas</h3>
        <p>Crea la primera tarea para comenzar la agenda colaborativa.</p>
      </section>
    );
  }

  return (
    <section className="agenda-grid">
      {dates.map((dateKey) => (
        <article key={dateKey} className="card day-column">
          <header>
            <h3>{dayjs(dateKey).format("dddd, DD MMM")}</h3>
            <span>{grouped[dateKey].length} tareas</span>
          </header>

          <div className="task-stack">
            {grouped[dateKey].map((task) => {
              const isCompleted = task.status === "completed";
              return (
                <div key={task.id} className={`task-item ${isCompleted ? "is-completed" : ""}`}>
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
                </div>
              );
            })}
          </div>
        </article>
      ))}
    </section>
  );
}
