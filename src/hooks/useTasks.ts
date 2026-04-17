import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  FirestoreError,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { TaskDraft, TaskItem } from "../types/models";

export function useTasks(userId: string | null) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setTasks([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const tasksQuery = query(collection(db, "tasks"), orderBy("startAt", "asc"));

    const unsubscribe = onSnapshot(
      tasksQuery,
      (snapshot) => {
        const mapped = snapshot.docs.map((entry) => {
          const data = entry.data();

          return {
            id: entry.id,
            title: String(data.title ?? "Sin titulo"),
            description: String(data.description ?? ""),
            startAt: String(data.startAt),
            endAt: String(data.endAt),
            status: data.status === "completed" ? "completed" : "pending",
            assigneeIds: Array.isArray(data.assigneeIds)
              ? data.assigneeIds.map((id) => String(id))
              : [],
            createdBy: String(data.createdBy ?? "unknown"),
            createdAt: Number(data.createdAt ?? Date.now()),
            updatedAt: Number(data.updatedAt ?? Date.now()),
            completedAt: data.completedAt ? Number(data.completedAt) : undefined,
          } as TaskItem;
        });

        setTasks(mapped);
        setError(null);
        setIsLoading(false);
      },
      (firebaseError: FirestoreError) => {
        const message =
          firebaseError.code === "not-found"
            ? "No existe Firestore (default) en este proyecto. Crea la base en Firebase o define VITE_FIREBASE_DATABASE_ID en .env."
            : firebaseError.code === "permission-denied"
              ? "Firestore respondio 'permission-denied'. Revisa las reglas de seguridad en Firebase."
              : "No se pudo conectar con Firestore. Verifica la configuracion del proyecto y del archivo .env.";

        setError(message);
        setIsLoading(false);
      },
    );

    return () => unsubscribe();
  }, [userId]);

  async function createTask(draft: TaskDraft, createdBy: string) {
    const now = Date.now();

    await addDoc(collection(db, "tasks"), {
      ...draft,
      status: "pending",
      createdBy,
      createdAt: now,
      updatedAt: now,
    });
  }

  async function updateTask(taskId: string, draft: TaskDraft) {
    await updateDoc(doc(db, "tasks", taskId), {
      ...draft,
      updatedAt: Date.now(),
    });
  }

  async function toggleTask(task: TaskItem) {
    const isNowCompleted = task.status !== "completed";

    await updateDoc(doc(db, "tasks", task.id), {
      status: isNowCompleted ? "completed" : "pending",
      completedAt: isNowCompleted ? Date.now() : null,
      updatedAt: Date.now(),
    });
  }

  async function removeTask(taskId: string) {
    await deleteDoc(doc(db, "tasks", taskId));
  }

  return {
    tasks,
    isLoading,
    error,
    createTask,
    updateTask,
    toggleTask,
    removeTask,
  };
}
