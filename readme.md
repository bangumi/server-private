# GraphQL server

mercurius + nexus + prisma

<https://api.bgm.tv/v0/altair/>

[schema](./lib/graphql/schema.gen.graphql)

## 测试

jest 对于 esm 的支持不好，所以使用 vitest 作为测试框架。

需要 mysql 和 redis。

没有针对 vitest 的 HMR 功能进行兼容，所以不要使用 vitest 的 `watch` 模式或者 `ui` 功能。
