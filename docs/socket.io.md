openapi 没法描述 socket.io 的 api，所以单独写一个文件

需要使用 `/p1/socket-io/` 作为链接的 path

```js
import { io } from 'https://cdn.jsdelivr.net/npm/socket.io-client@4.5.4/dist/socket.io.esm.min.js';

const socket = io(location.host, {
  path: '/p1/socket-io/',
  reconnection: true,
  reconnectionDelay: 5000,
  reconnectionDelayMax: 10000,
});

socket.on('notify', (ev) => {
  console.log(ev);
});
```

目前存在的事件：

## 获取通知

事件名：`notify`

响应：

```ts
interface NotifyEvent {
  count: number;
}
```

服务端**只有在用户的通知计数改变的时候**才会 emit 对应的事件，没有定时心跳。

在 https://next.bgm.tv/p1/demo 页面可以看到示例
