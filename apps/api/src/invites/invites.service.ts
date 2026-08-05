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

export async function getInvitesForUser(
  inviterId: string,
  opts: { cursor?: string; limit: number } = { limit: 10 }
) {
  const invites = await prisma.invite.findMany({
    where: { inviterId },
    orderBy: { createdAt: "desc" },
    take: opts.limit,
    ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
  });
  const nextCursor = invites.length === opts.limit ? invites[invites.length - 1].id : undefined;
  return { invites, nextCursor };
}

/** Owner-scoped delete so users can weed out stale invites. */
export async function deleteInvite(id: string, inviterId: string): Promise<boolean> {
  const result = await prisma.invite.deleteMany({ where: { id, inviterId } });
  return result.count > 0;
}
