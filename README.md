# AStudio API Key Manager

一个最小可运行的全栈示例项目，包含：

- 注册入口
- 登录入口
- 登录后查看用户 API Key
- 新增 API Key
- 删除 API Key

## 技术栈

- 后端：Node.js + Express
- 数据库：SQLite
- 前端：HTML / CSS / Vanilla JavaScript

## Node 版本

- 建议使用 Node.js `22`
- 项目根目录已提供 [`.nvmrc`](/Users/chenhao/workspace/astudio/.nvmrc)

如果本机安装了 `nvm`，可以执行：

```bash
nvm use
```

## 启动方式

```bash
npm install
npm run dev
```

开发环境默认监听：

```bash
http://0.0.0.0:9091
```

生产环境启动：

```bash
npm start
```

生产环境默认监听：

```bash
http://0.0.0.0:9090
```

如果希望后台运行、支持重启并追踪日志，使用：

```bash
npm run service:start
```

如需启动开发环境后台服务：

```bash
bash scripts/service.sh start development
```

启动后访问：

```bash
http://<你的服务器公网 IP 或域名>:9090
```

首次启动后会自动创建本地 SQLite 数据库文件：

```bash
data/<env>/app.db
```

用户需要先注册，再使用邮箱和密码登录。用户数据会保存在 SQLite 中，服务重启后仍然保留。

## 服务脚本

项目提供了 [scripts/service.sh](/Users/chenhao/workspace/astudio/scripts/service.sh)：

```bash
npm run service:start
npm run service:stop
npm run service:restart
npm run service:status
npm run service:logs
```

各命令说明：

- `npm run service:start`：后台启动 `production` 环境，默认监听 `0.0.0.0:9090`，启动成功后立即进入日志追踪
- `npm run service:start:bg`：后台启动 `production` 环境，但不跟随日志
- `npm run service:stop`：停止 `production` 环境服务
- `npm run service:restart`：重启 `production` 环境服务；重启完成后同样会进入日志追踪
- `npm run service:status`：查看 `production` 环境服务状态
- `npm run service:logs`：实时追踪 `production` 环境日志，等价于 `tail -n 100 -f logs/server.production.log`

如果需要操作开发环境，可以显式传环境名：

```bash
bash scripts/service.sh start development
bash scripts/service.sh start-bg development
bash scripts/service.sh status development
bash scripts/service.sh logs development
bash scripts/service.sh stop development
```

可选环境变量：

- `APP_ENV`：支持 `development` / `production`
- `APP_HOST`：用于在 shell 中显式覆盖监听地址，默认 `0.0.0.0`
- `PORT`：`development` 默认 `9091`，`production` 默认 `9090`
- `DATA_DIR`：默认按环境隔离到 `data/development` 或 `data/production`

例如：

```bash
APP_ENV=development APP_HOST=0.0.0.0 PORT=19091 npm run service:start:bg
```

推荐使用流程：

```bash
nvm use
npm install
npm run dev
```

如果你修改了 [server.js](/Users/chenhao/workspace/astudio/server.js)，可以用下面的命令重启服务：

```bash
npm run service:restart
```

运行时文件：

- 环境配置：`.env.development`、`.env.production`
- 日志：`logs/server.<env>.log`
- 进程 PID：`run/server.<env>.pid`

## 环境配置

项目会按以下顺序加载环境变量：

1. 当前 shell 中已导出的环境变量
2. 项目根目录下的 `.env`
3. 对应环境文件 `.env.development` 或 `.env.production`

当前仓库已提供两套默认配置：

- `.env.development`：默认端口 `9091`
- `.env.production`：默认端口 `9090`

如果 shell 中显式传入 `APP_ENV`、`APP_HOST`、`PORT`、`DATA_DIR`，shell 变量优先。

## Issue 验证阶段

当 issue 处理完成后，可执行：

```bash
npm run issue:verify
```

该命令会：

- 自动以 `development` 环境在后台启动服务
- 输出当前访问地址与日志位置
- 在终端等待人工输入 `yes` 确认
- 只有确认后才继续后续流程

这对应 issue 中要求的“处理完成后进入验证阶段，并默认启动 DEV 后端”。

对外访问说明：

- 服务现在监听 `0.0.0.0`，可以接受来自外部网卡的连接
- 真正能否从外网访问，还取决于服务器防火墙、安全组、云厂商端口放行，以及公网 IP 或域名解析是否正确

## 接口

- `POST /api/register`：注册
- `POST /api/login`：登录
- `GET /api/me`：获取当前用户
- `POST /api/logout`：退出登录
- `GET /api/keys`：获取 API Key 列表
- `POST /api/keys`：新增 API Key
- `DELETE /api/keys/:id`：删除 API Key

## 说明

- 用户账户信息使用 SQLite 持久化存储，密码以哈希形式保存，不会明文写入数据库
- 当前示例仍使用内存保存登录会话和 API Key 列表，服务重启后登录态与 API Key 列表不会保留
- 这是一个最小示例，后续可以继续扩展更完整的鉴权和数据持久化方案
