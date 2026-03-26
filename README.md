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
npm start
```

默认监听：

```bash
http://0.0.0.0:9090
```

如果希望后台运行、支持重启并追踪日志，使用：

```bash
npm run service:start
```

启动后访问：

```bash
http://<你的服务器公网 IP 或域名>:9090
```

首次启动后会自动创建本地 SQLite 数据库文件：

```bash
data/app.db
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

- `npm run service:start`：后台启动服务，默认监听 `0.0.0.0:9090`，启动成功后立即进入日志追踪
- `npm run service:stop`：停止后台服务
- `npm run service:restart`：重启后台服务；重启完成后同样会进入日志追踪
- `npm run service:status`：查看服务是否运行
- `npm run service:logs`：实时追踪最近日志，等价于 `tail -n 100 -f logs/server.log`

可选环境变量：

- `HOST`：默认 `0.0.0.0`
- `PORT`：默认 `9090`

例如：

```bash
HOST=0.0.0.0 PORT=9090 npm run service:start
```

推荐使用流程：

```bash
nvm use
npm install
npm run service:start
```

如果你修改了 [server.js](/Users/chenhao/workspace/astudio/server.js)，可以用下面的命令重启服务：

```bash
npm run service:restart
```

运行时文件：

- 日志：`logs/server.log`
- 进程 PID：`run/server.pid`

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
