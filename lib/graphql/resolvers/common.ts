import { objectType } from 'nexus';

export const InfoboxValuesItem = objectType({
  name: 'InfoboxValue',
  definition(t) {
    t.nullable.string('k');
    t.nullable.string('v');
  },
});

export const InfoboxItem = objectType({
  name: 'Infobox',
  definition(t) {
    t.nonNull.string('key');
    t.list.nonNull.field('values', { type: InfoboxValuesItem });
  },
});

export const Images = objectType({
  name: 'Images',
  definition(t) {
    t.nonNull.string('large');
    t.nonNull.string('medium');
    t.nonNull.string('small');
    t.nonNull.string('grid');
  },
});
