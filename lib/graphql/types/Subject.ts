import { nonNull, objectType, extendType, idArg } from "nexus";

import type { Context } from "../context";

export const Subject = objectType({
  name: "Subject",
  definition(t) {
    t.id("id");
    t.string("name");
    t.string("name_cn");
  },
});

// get Unique Link
export const SubjectByIDQuery = extendType({
  type: "Query",
  definition(t) {
    t.field("subject", {
      type: Subject,
      args: { id: nonNull(idArg()) },
      async resolve(_parent, args, ctx: Context) {
        const id = parseInt(args.id);
        if (isNaN(id)) {
          throw new Error("not valid id");
        }

        const subject = await ctx.prisma.chii_subjects.findUnique({
          where: {
            subject_id: id,
          },
        });

        if (!subject) {
          return null;
        }

        return {
          id: subject.subject_id.toString(),
          name: subject.subject_name,
          name_cn: subject.subject_name_cn,
        };
      },
    });
  },
});
