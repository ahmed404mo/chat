import { prisma } from "@/lib/prisma";

const DEFAULT_GROUP_TITLE = "عام";

export async function ensureUserInDefaultGroup(userId: string): Promise<void> {
  let defaultGroup = await prisma.conversation.findFirst({
    where: { title: DEFAULT_GROUP_TITLE, isGroup: true },
  });

  if (!defaultGroup) {
    defaultGroup = await prisma.conversation.create({
      data: { title: DEFAULT_GROUP_TITLE, isGroup: true },
    });
  }

  const existing = await prisma.conversationParticipant.findFirst({
    where: { conversationId: defaultGroup.id, userId },
  });

  if (!existing) {
    await prisma.conversationParticipant.create({
      data: { conversationId: defaultGroup.id, userId },
    });
  }
}
