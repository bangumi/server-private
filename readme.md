# server

[![deployed version](https://img.shields.io/badge/dynamic/yaml?label=deployed&query=info.version&url=https%3A%2F%2Fnext.bgm.tv%2Fp1%2Fopenapi.yaml)](https://next.bgm.tv/p1/)
![Codecov](https://img.shields.io/codecov/c/github/bangumi/server-private)

fastify + TypeORM + mercurius + nexus

## GraphQL API

<https://api.bgm.tv/v0/altair/>

[schema](./lib/graphql/schema.gen.graphql)

## REST API

<https://next.bgm.tv/p1/>

## 开发

### 安装依赖

```shell
npm ci
```

### 启动

复制 `.env.example` 到 `.env`，`config.example.yaml` 到 `config.yaml`，根据自己的开发环境设置相关配置。 环境变量(及`.env`文件)会覆盖 `config.yaml` 中的设置。

如果你是在本机启动了 [dev-env](https://github.com/bangumi/dev-env) 中的 docker-compose，可以直接使用默认设置。

```shell
npm start
```

在文件修改后会自动重启。

## 测试

jest 对于 esm 的支持不好，所以使用 vitest 作为测试框架。

运行测试需要 mysql。

```shell
npm test
```
