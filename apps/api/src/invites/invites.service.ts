import crypto from "crypto";
import { prisma } from "../prisma.js";

export async function createInvite(inviterId: string) {
  const code = crypto.randomBytes(6).toString("hex");
  return prisma.invite.create({
    data: { code, inviterId },
  });
}

export async function getInviteByCode(code: string) {
  return prisma.invite.findUnique({
    where: { code },
    include: { inviter: { select: { id: true, username: true, displayName: true } } },
  });
}

export async function trackInviteClick(code: string) {
  return prisma.invite.updateMany({
    where: { code },
    data: { clicks: { increment: 1 } },
  });
}

export async function acceptInvite(code: string, inviteeId: string) {
  const invite = await prisma.invite.findUnique({ where: { code } });
  if (!invite || invite.inviterId === inviteeId) {
    throw new Error("Invalid invite code");
  }
  return prisma.invite.update({
    where: { id: invite.id },
    data: { inviteeId, acceptedAt: new Date() },
  });
}

export async function getInvitesForUser(inviterId: string) {
  return prisma.invite.findMany({
    where: { inviterId },
    orderBy: { createdAt: "desc" },
  });
}
