import type { IAuth } from './auth';
import prisma from './prisma';

const _Notify = {
  async count(auth: IAuth): Promise<number> {
    const u = await prisma.members.findFirst({ where: { id: auth.userID } });

    if (u?.newpm) {
      return 0;
    }

    const r = await Promise.all([
      prisma.notify.count({ where: { uid: auth.userID, read: false } }),
      prisma.privateMessage.count({ where: { rid: auth.userID, folder: 'inbox' } }),
    ]);

    return r.reduce((a, b) => a + b, 0);
  },
};
