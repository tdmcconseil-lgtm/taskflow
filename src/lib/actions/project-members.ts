"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/dal";
import { getRootProject, canManageProject } from "@/lib/access";
import { ensureFollow } from "@/lib/follow";

// Charge le projet racine d'une tâche et vérifie que l'utilisateur peut le gérer
// (OWNER de l'espace, ou administrateur du projet). Renvoie null sinon.
async function loadManageableProject(userId: string, taskId: string) {
  const root = await getRootProject(taskId);
  if (!root) return null;
  if (!(await canManageProject(userId, root))) return null;
  return root;
}

function adminCount(taskId: string): Promise<number> {
  return prisma.projectAccess.count({ where: { taskId, role: "ADMIN" } });
}

// Ajoute des membres de l'espace au projet (rôle « membre »), et les fait suivre.
export async function addProjectMembers(formData: FormData): Promise<void> {
  const user = await requireUser();
  const taskId = String(formData.get("taskId") ?? "");
  const project = await loadManageableProject(user.id, taskId);
  if (!project) return;

  const ids = formData.getAll("members").map((v) => String(v)).filter(Boolean);
  if (ids.length > 0) {
    const valid = await prisma.membership.findMany({
      where: { workspaceId: project.workspaceId, deactivatedAt: null, userId: { in: ids } },
      select: { userId: true },
    });
    for (const m of valid) {
      await prisma.projectAccess.upsert({
        where: { taskId_userId: { taskId: project.id, userId: m.userId } },
        update: {},
        create: { taskId: project.id, userId: m.userId, role: "MEMBER" },
      });
      await ensureFollow(m.userId, project.id);
    }
  }
  revalidatePath(`/app/tasks/${project.id}/members`);
  revalidatePath(`/app/tasks/${project.id}`);
  redirect(`/app/tasks/${project.id}/members`);
}

// Change le rôle d'un membre du projet (ADMIN / MEMBER). Garde-fous : un admin
// ne peut pas se rétrograder lui-même, et on ne rétrograde pas le dernier admin.
export async function setProjectMemberRole(formData: FormData): Promise<void> {
  const user = await requireUser();
  const taskId = String(formData.get("taskId") ?? "");
  const targetId = String(formData.get("userId") ?? "");
  const role = formData.get("role") === "ADMIN" ? "ADMIN" : "MEMBER";
  const project = await loadManageableProject(user.id, taskId);
  if (!project) return;

  const target = await prisma.projectAccess.findUnique({
    where: { taskId_userId: { taskId: project.id, userId: targetId } },
    select: { role: true },
  });
  if (!target) return;

  if (role === "MEMBER") {
    if (targetId === user.id) return; // on ne retire pas ses propres droits
    if (target.role === "ADMIN" && (await adminCount(project.id)) <= 1) return; // dernier admin
  }

  await prisma.projectAccess.update({
    where: { taskId_userId: { taskId: project.id, userId: targetId } },
    data: { role },
  });
  revalidatePath(`/app/tasks/${project.id}/members`);
  revalidatePath(`/app/tasks/${project.id}`);
}

// Retire un membre du projet. Garde-fous : on ne se retire pas soi-même ici, et
// on ne retire pas le dernier administrateur.
export async function removeProjectMember(formData: FormData): Promise<void> {
  const user = await requireUser();
  const taskId = String(formData.get("taskId") ?? "");
  const targetId = String(formData.get("userId") ?? "");
  const project = await loadManageableProject(user.id, taskId);
  if (!project) return;
  if (targetId === user.id) return;

  const target = await prisma.projectAccess.findUnique({
    where: { taskId_userId: { taskId: project.id, userId: targetId } },
    select: { role: true },
  });
  if (!target) return;
  if (target.role === "ADMIN" && (await adminCount(project.id)) <= 1) return; // dernier admin

  await prisma.projectAccess.delete({
    where: { taskId_userId: { taskId: project.id, userId: targetId } },
  });
  revalidatePath(`/app/tasks/${project.id}/members`);
  revalidatePath(`/app/tasks/${project.id}`);
}

// Ouvre / ferme le projet à tout l'espace (visibility WORKSPACE / RESTRICTED).
export async function setProjectVisibility(formData: FormData): Promise<void> {
  const user = await requireUser();
  const taskId = String(formData.get("taskId") ?? "");
  const open = formData.get("open") === "1";
  const project = await loadManageableProject(user.id, taskId);
  if (!project) return;

  await prisma.task.update({
    where: { id: project.id },
    data: { visibility: open ? "WORKSPACE" : "RESTRICTED" },
  });
  revalidatePath(`/app/tasks/${project.id}/members`);
  revalidatePath(`/app/tasks/${project.id}`);
}

// Secours OWNER : un OWNER de l'espace s'ajoute (ou se promeut) administrateur du
// projet, pour qu'un projet ne devienne jamais ingérable.
export async function joinProjectAsAdmin(formData: FormData): Promise<void> {
  const user = await requireUser();
  const taskId = String(formData.get("taskId") ?? "");
  const root = await getRootProject(taskId);
  if (!root) return;

  const membership = await prisma.membership.findFirst({
    where: { userId: user.id, workspaceId: root.workspaceId, deactivatedAt: null },
    select: { role: true },
  });
  if (membership?.role !== "OWNER") return;

  await prisma.projectAccess.upsert({
    where: { taskId_userId: { taskId: root.id, userId: user.id } },
    update: { role: "ADMIN" },
    create: { taskId: root.id, userId: user.id, role: "ADMIN" },
  });
  await ensureFollow(user.id, root.id);
  revalidatePath(`/app/tasks/${root.id}/members`);
}
