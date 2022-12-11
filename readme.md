# GraphQL server

[![deployed version](https://img.shields.io/badge/dynamic/json?label=deployed&query=info.version&url=https%3A%2F%2Fnext.bgm.tv%2Fp1%2Fopenapi.json)](https://next.bgm.tv/p1/)
![Codecov](https://img.shields.io/codecov/c/github/bangumi/GraphQL)

fastify + prisma + mercurius + nexus

## GraphQL

<https://api.bgm.tv/v0/altair/>

[schema](./lib/graphql/schema.gen.graphql)

## REST API

<https://next.bgm.tv/p1/>

## 测试

jest 对于 esm 的支持不好，所以使用 vitest 作为测试框架。

运行测试需要 mysql。

没有针对 vitest 的 HMR 功能进行兼容，所以不要使用 vitest 的 `watch` 模式或者 `ui` 功能。
