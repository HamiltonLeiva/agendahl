import { useMemo } from "react";
import dayjs from "dayjs";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { AppUser, TaskDraft, TaskItem } from "../types/models";

const schema = z.object({
  title: z.string().trim().min(3, "El titulo es obligatorio"),
  description: z.string().trim().max(500, "Maximo 500 caracteres"),
  date: z.string().min(1, "La fecha es obligatoria"),
  time: z.string().min(1, "La hora es obligatoria"),
  durationMinutes: z.coerce.number().min(5, "Minimo 5 minutos").max(480, "Maximo 8 horas"),
  reminderMinutes: z.array(z.coerce.number().min(0)).min(1, "Selecciona al menos una alerta").max(8, "Maximo 8 alertas"),
  assigneeIds: z.array(z.string()).min(1, "Selecciona al menos un responsable"),
});

type FormData = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

interface TaskFormProps {
  users: AppUser[];
  task?: TaskItem;
  defaultReminderMinutes: number;
  onCancel: () => void;
  onSubmitTask: (draft: TaskDraft) => Promise<void>;
}

export function TaskForm({
  users,
  task,
  defaultReminderMinutes,
  onCancel,
  onSubmitTask,
}: TaskFormProps) {
  const reminderOptions = [0, 1, 5, 10, 15, 30, 60, 120, 180];

  const defaultValues = useMemo<FormData>(() => {
    if (!task) {
      const rounded = dayjs().add(1, "hour").minute(0);

      return {
        title: "",
        description: "",
        date: rounded.format("YYYY-MM-DD"),
        time: rounded.format("HH:mm"),
        durationMinutes: 30,
        reminderMinutes: [defaultReminderMinutes],
        assigneeIds: [],
      };
    }

    const start = dayjs(task.startAt);
    const end = dayjs(task.endAt);

    return {
      title: task.title,
      description: task.description,
      date: start.format("YYYY-MM-DD"),
      time: start.format("HH:mm"),
      durationMinutes: Math.max(5, end.diff(start, "minute")),
      reminderMinutes: Array.isArray(task.reminderMinutes)
        ? task.reminderMinutes
        : [Math.max(0, task.reminderMinutes ?? 5)],
      assigneeIds: task.assigneeIds,
    };
  }, [defaultReminderMinutes, task]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<FormData, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const selectedAssignees = watch("assigneeIds") ?? [];

  const onSubmit = handleSubmit(async (values) => {
    const startAt = dayjs(`${values.date}T${values.time}`);
    const endAt = startAt.add(values.durationMinutes, "minute");

    await onSubmitTask({
      title: values.title,
      description: values.description,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      reminderMinutes: Array.from(new Set(values.reminderMinutes)).sort((left, right) => right - left),
      assigneeIds: values.assigneeIds,
    });
  });

  return (
    <div className="modal-overlay">
      <form className="card task-form" onSubmit={onSubmit}>
        <h2>{task ? "Editar tarea" : "Nueva tarea"}</h2>

        <label>
          Titulo
          <input placeholder="Ej: Revisar inventario" {...register("title")} />
          {errors.title && <span className="field-error">{errors.title.message}</span>}
        </label>

        <label>
          Descripcion
          <textarea rows={3} placeholder="Detalles de la tarea..." {...register("description")} />
          {errors.description && <span className="field-error">{errors.description.message}</span>}
        </label>

        <div className="grid-2">
          <label>
            Fecha
            <input type="date" {...register("date")} />
            {errors.date && <span className="field-error">{errors.date.message}</span>}
          </label>
          <label>
            Hora
            <input type="time" {...register("time")} />
            {errors.time && <span className="field-error">{errors.time.message}</span>}
          </label>
        </div>

        <label>
          Duracion (minutos)
          <input type="number" step={5} min={5} max={480} {...register("durationMinutes")} />
          {errors.durationMinutes && <span className="field-error">{errors.durationMinutes.message}</span>}
        </label>

        <label>
          Alertas antes de iniciar (puedes marcar varias)
          <div className="reminder-grid">
            {reminderOptions.map((minutes) => (
              <label key={minutes} className="check-item reminder-chip">
                <input type="checkbox" value={minutes} {...register("reminderMinutes")} />
                <span>
                  {minutes === 0
                    ? "Al iniciar"
                    : minutes === 60
                      ? "1 hora antes"
                      : minutes === 120
                        ? "2 horas antes"
                        : minutes === 180
                          ? "3 horas antes"
                          : `${minutes} minutos antes`}
                </span>
              </label>
            ))}
          </div>
          {errors.reminderMinutes && <span className="field-error">{errors.reminderMinutes.message}</span>}
        </label>

        <fieldset>
          <legend>Responsables</legend>
          <div className="assignees-grid">
            {users.map((user) => (
              <label key={user.id} className="check-item">
                <input type="checkbox" value={user.id} {...register("assigneeIds")} />
                <span>{user.displayName}</span>
              </label>
            ))}
          </div>
          {errors.assigneeIds && <span className="field-error">{errors.assigneeIds.message}</span>}
          <small>{selectedAssignees.length} responsable(s) seleccionado(s)</small>
        </fieldset>

        <div className="row-end">
          <button type="button" className="btn ghost" onClick={onCancel}>
            Cancelar
          </button>
          <button type="submit" className="btn" disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : "Guardar tarea"}
          </button>
        </div>
      </form>
    </div>
  );
}
