# ORM

使用外层的 `schema.ts` 作为数据结构定义，import 参考：

`new` 目录下的为直接 pull 生成的，未使用，新表结构可以从里面参考。

`index.ts` 为对外暴露的模块，使用时可以参考：

```typescript
import { db, op, type orm, schema } from '@app/drizzle';
```
