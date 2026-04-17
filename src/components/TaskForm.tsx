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
  assigneeIds: z.array(z.string()).min(1, "Selecciona al menos un responsable"),
});

type FormData = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

interface TaskFormProps {
  users: AppUser[];
  task?: TaskItem;
  onCancel: () => void;
  onSubmitTask: (draft: TaskDraft) => Promise<void>;
}

export function TaskForm({ users, task, onCancel, onSubmitTask }: TaskFormProps) {
  const defaultValues = useMemo<FormData>(() => {
    if (!task) {
      const rounded = dayjs().add(1, "hour").minute(0);

      return {
        title: "",
        description: "",
        date: rounded.format("YYYY-MM-DD"),
        time: rounded.format("HH:mm"),
        durationMinutes: 30,
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
      assigneeIds: task.assigneeIds,
    };
  }, [task]);

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
