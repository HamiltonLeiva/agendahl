import { useMemo } from "react";
import dayjs from "dayjs";
import { AppUser, TaskItem } from "../types/models";

interface ReportsPanelProps {
  tasks: TaskItem[];
  users: AppUser[];
}

export function ReportsPanel({ tasks, users }: ReportsPanelProps) {
  const rows = useMemo(() => {
    return users.map((user) => {
      const assigned = tasks.filter((task) => task.assigneeIds.includes(user.id));
      const completed = assigned.filter((task) => task.status === "completed");
      const overdue = assigned.filter(
        (task) => task.status !== "completed" && dayjs(task.endAt).isBefore(dayjs()),
      );

      const successRate = assigned.length
        ? Math.round((completed.length / assigned.length) * 100)
        : 0;

      return {
        user,
        assigned: assigned.length,
        completed: completed.length,
        overdue: overdue.length,
        successRate,
      };
    });
  }, [tasks, users]);

  return (
    <section className="card reports">
      <h2>Reporte de cumplimiento</h2>
      <p>Monitorea si los responsables completaron sus tareas de forma exitosa.</p>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Responsable</th>
              <th>Asignadas</th>
              <th>Completadas</th>
              <th>Atrasadas</th>
              <th>Exito</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.user.id}>
                <td>{row.user.displayName}</td>
                <td>{row.assigned}</td>
                <td>{row.completed}</td>
                <td>{row.overdue}</td>
                <td>{row.successRate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
