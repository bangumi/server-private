# ORM

使用外层的 `schema.ts` 作为数据结构定义，import 参考：

```typescript
import { db, op } from '@app/drizzle/db.ts';
import type * as orm from '@app/drizzle/orm.ts';
import * as schema from '@app/drizzle/schema';
```

`new` 目录下的为直接 pull 生成的，未使用，新表结构可以从里面参考。
