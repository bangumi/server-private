# GraphQL server

[![deployed version](https://img.shields.io/badge/dynamic/json?label=deployed&query=info.version&url=https%3A%2F%2Fnext.bgm.tv%2Fp1%2Fopenapi.json)](https://next.bgm.tv/p1/)
![Codecov](https://img.shields.io/codecov/c/github/bangumi/GraphQL)

fastify + TypeORM + mercurius + nexus

## GraphQL

<https://api.bgm.tv/v0/altair/>

[schema](./lib/graphql/schema.gen.graphql)

## REST API

<https://next.bgm.tv/p1/>

## 开发

复制 `.env.example` 到 `.env`，并且根据自己的开发环境设置相关的环境变量。

```shell
yarn start
```

在文件修改后会自动重启。

## 测试

jest 对于 esm 的支持不好，所以使用 vitest 作为测试框架。

运行测试需要 mysql。
