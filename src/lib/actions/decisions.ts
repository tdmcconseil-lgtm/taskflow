"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, getMembership } from "@/lib/auth/dal";
import { rootTaskId } from "@/lib/actions/documents";

export type DecisionFormState = { error?: string } | undefined;

async function loadTask(userId: string, taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, workspaceId: true },
  });
  if (!task) return null;
  if (!(await getMembership(userId, task.workspaceId))) return null;
  return task;
}

// Fait atterrir le prochain affichage de la fiche de tâche sur l'onglet Décisions.
async function focusDecisionsTab() {
  try {
    (await cookies()).set("tf_tab", "decisions", {
      path: "/",
      maxAge: 31536000,
      sameSite: "lax",
    });
  } catch {
    // Cookie indisponible : simple perte de la préférence, sans incidence.
  }
}

// Ajoute une décision à une tâche. Le document associé est facultatif ; s'il est
// fourni, il doit appartenir au même projet que la tâche (document du projet ou
// document lié à la tâche).
export async function createDecision(
  _prev: DecisionFormState,
  formData: FormData,
): Promise<DecisionFormState> {
  const user = await requireUser();
  const taskId = String(formData.get("taskId") ?? "");
  const task = await loadTask(user.id, taskId);
  if (!task) return { error: "Tâche introuvable ou accès refusé." };

  const content = String(formData.get("content") ?? "").trim();
  if (!content) return { error: "La décision ne peut pas être vide." };

  const isProjectDecision = formData.get("isProjectDecision") === "on";
  const rawDocId = String(formData.get("documentId") ?? "").trim();

  let documentId: string | null = null;
  if (rawDocId) {
    const projectTaskId = await rootTaskId(task.id);
    const doc = await prisma.document.findUnique({
      where: { id: rawDocId },
      select: { id: true, projectTaskId: true },
    });
    if (!doc || doc.projectTaskId !== projectTaskId) {
      return { error: "Document introuvable dans ce projet." };
    }
    documentId = doc.id;
  }

  await prisma.decision.create({
    data: {
      content,
      isProjectDecision,
      taskId: task.id,
      createdById: user.id,
      documentId,
    },
  });

  await focusDecisionsTab();
  revalidatePath(`/app/tasks/${task.id}`);
  if (isProjectDecision) {
    revalidatePath(`/app/tasks/${await rootTaskId(task.id)}`);
  }
  redirect(`/app/tasks/${task.id}`);
}

// Marque / démarque une décision comme « décision projet ».
export async function setDecisionProject(formData: FormData): Promise<void> {
  const user = await requireUser();
  const decisionId = String(formData.get("decisionId") ?? "");
  const value = formData.get("value") === "1";

  const decision = await prisma.decision.findUnique({
    where: { id: decisionId },
    select: { id: true, task: { select: { id: true, workspaceId: true } } },
  });
  if (!decision) return;
  if (!(await getMembership(user.id, decision.task.workspaceId))) return;

  await prisma.decision.update({
    where: { id: decision.id },
    data: { isProjectDecision: value },
  });

  revalidatePath(`/app/tasks/${decision.task.id}`);
  revalidatePath(`/app/tasks/${await rootTaskId(decision.task.id)}`);
}

// Supprime définitivement une décision.
export async function deleteDecision(formData: FormData): Promise<void> {
  const user = await requireUser();
  const decisionId = String(formData.get("decisionId") ?? "");

  const decision = await prisma.decision.findUnique({
    where: { id: decisionId },
    select: { id: true, task: { select: { id: true, workspaceId: true } } },
  });
  if (!decision) return;
  if (!(await getMembership(user.id, decision.task.workspaceId))) return;

  await prisma.decision.delete({ where: { id: decision.id } });

  revalidatePath(`/app/tasks/${decision.task.id}`);
  revalidatePath(`/app/tasks/${await rootTaskId(decision.task.id)}`);
}
