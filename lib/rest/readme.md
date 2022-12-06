`rest/index.ts` 会加载 `rest/api/` 文件夹下的所有 `.ts` 文件

每个 API 文件都应该使用命名导出 `setup` 函数进行初始化 `export function setup(server: App): void`

没有对应导出的文件会被忽略。

`*.test.ts` 文件也会被忽略，不会被加载

可以查看 (api/me.ts)[api/me.ts] 作为例子。
