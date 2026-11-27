import { setTimeout as sleep } from 'node:timers/promises';

import { KafkaJS, RdKafka } from '@confluentinc/kafka-javascript';

import config, { production, stage } from '@app/lib/config.ts';
import { logger } from '@app/lib/logger';

class Producer {
  private producer: KafkaJS.Producer | null = null;

  async initialize() {
    if (this.producer) {
      return;
    }

    const { Kafka, logLevel } = KafkaJS;

    if (!config.kafkaBrokers) {
      throw new Error('KAFKA_BROKERS is not set');
    }

    const kafka = new Kafka({
      log_level: logLevel.WARN,
    });

    const producer = kafka.producer({
      'bootstrap.servers': config.kafkaBrokers,
    });
    await producer.connect();
    this.producer = producer;
  }

  async send(topic: string, key: string, value: string) {
    if (!this.producer) {
      throw new Error('Producer not initialized');
    }
    await this.producer.send({
      topic,
      messages: [{ key, value }],
    });
  }
}

class MockProducer {
  initialize(): Promise<void> {
    return Promise.resolve();
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  send(topic: string, key: string, value: string): Promise<void> {
    return Promise.resolve();
  }
}

export const producer = production || stage ? new Producer() : new MockProducer();

interface LibrdKafkaLogEvent {
  severity: number;
  fac: string;
  message: string;
  name?: string;
}

type KafkaJsMessage = KafkaJS.EachMessagePayload['message'];

/** 官方 KafkaJS 兼容层 eachMessage 入参的子集，只保留我们用到的字段。 按这个类型写的 handler 可以直接用作官方 consumer.run 的 eachMessage。 */
export interface EachMessagePayload {
  topic: KafkaJS.EachMessagePayload['topic'];
  partition: KafkaJS.EachMessagePayload['partition'];
  message: Pick<KafkaJsMessage, 'key' | 'value' | 'offset'>;
}

export type EachMessageHandler = (payload: EachMessagePayload) => Promise<void>;

/**
 * 与官方 KafkaJS Consumer 相同的调用方式：connect → subscribe → run。 底层是原生
 * RdKafka.KafkaConsumer，绕开兼容层那套会丢唤醒信号的消费循环。
 */
export interface Consumer {
  connect(): Promise<void>;
  subscribe(subscription: { topics: string[] }): Promise<void>;
  run(config: { eachMessage: EachMessageHandler }): Promise<void>;
  disconnect(): Promise<void>;
}

/** 每批处理的数量，取小一点让 poll 更频繁，避免处理慢时超过 max.poll.interval.ms 被踢出消费组 */
const POLL_SIZE = 10;

/** 单条消息处理超过这个时间就视为卡死，退出进程交给外部重启；取值要大于粉丝数上千的用户扇出的正常耗时 */
const MESSAGE_TIMEOUT_MS = 5 * 60_000;

const HEARTBEAT_INTERVAL_MS = 5 * 60_000;

/** Consume() 的错误会一直重复，同一条错误最多每分钟打一次 */
const POLL_ERROR_LOG_INTERVAL_MS = 60_000;

class MessageTimeoutError extends Error {}

class NativeConsumer implements Consumer {
  private client: RdKafka.KafkaConsumer | null = null;
  private topics: string[] = [];
  private missingTopics: string[] = [];

  async connect(): Promise<void> {
    if (!config.kafkaBrokers) {
      throw new Error('KAFKA_BROKERS is not set');
    }

    const client = new RdKafka.KafkaConsumer({
      'bootstrap.servers': config.kafkaBrokers,
      'group.id': config.kafkaJsMqGroupId,
      'enable.auto.commit': true,
      // 处理完成后再 offsetsStore()，避免提交还没处理的消息
      'enable.auto.offset.store': false,
    });

    // 原生 API 默认丢弃 librdkafka 的日志事件，转给 pino 才能看到断连、出组这类问题
    client.on('event.log', (event: LibrdKafkaLogEvent) => {
      const context = { fac: event.fac, name: event.name };
      if (event.severity <= 3) {
        logger.error(context, event.message);
      } else if (event.severity === 4) {
        logger.warn(context, event.message);
      } else {
        logger.debug(context, event.message);
      }
    });

    await new Promise<void>((resolve, reject) => {
      client.connect(undefined, (error) => {
        if (error) {
          reject(new Error(`failed to connect to kafka: ${error.message}`, { cause: error }));
        } else {
          resolve();
        }
      });
    });

    this.client = client;
  }

  async subscribe({ topics }: { topics: string[] }): Promise<void> {
    const client = this.getClient();
    this.topics = topics;
    this.missingTopics = await syncSubscription(client, topics);
  }

  async run({ eachMessage }: { eachMessage: EachMessageHandler }): Promise<void> {
    const client = this.getClient();

    let processed = 0;
    let lastHeartbeatAt = Date.now();
    let pollFailures = 0;
    let pollErrorLoggedAt = 0;

    for (;;) {
      let messages: RdKafka.Message[];
      try {
        messages = await poll(client);
      } catch (error) {
        pollFailures += 1;
        const now = Date.now();
        if (now - pollErrorLoggedAt >= POLL_ERROR_LOG_INTERVAL_MS) {
          logger.error(error, `failed to poll messages (${pollFailures} failures in a row)`);
          pollErrorLoggedAt = now;
        }
        await sleep(Math.min(pollFailures * 1000, 10_000));
        continue;
      }
      pollFailures = 0;

      for (const message of messages) {
        try {
          await withTimeout(eachMessage(toPayload(message)), MESSAGE_TIMEOUT_MS);
        } catch (error) {
          if (error instanceof MessageTimeoutError) {
            // offset 还没有 store，退出后重启会重新消费这条消息
            logger.error(error, `message processing timed out: ${describe(message)}`);
            throw error;
          }
          logger.error(error, `error processing message: ${describe(message)}`);
        }

        client.offsetsStore([
          { topic: message.topic, partition: message.partition, offset: message.offset + 1 },
        ]);
        processed += 1;
      }

      const now = Date.now();
      if (now - lastHeartbeatAt < HEARTBEAT_INTERVAL_MS) {
        continue;
      }

      logger.info(
        `mq heartbeat: processed ${processed} messages in the last ${Math.round((now - lastHeartbeatAt) / 1000)}s`,
      );
      processed = 0;
      lastHeartbeatAt = now;

      // 之前不存在的 topic 可能已经被创建出来了
      if (this.missingTopics.length > 0) {
        this.missingTopics = await syncSubscription(client, this.topics);
      }
    }
  }

  async disconnect(): Promise<void> {
    const client = this.client;
    if (!client) {
      return;
    }
    this.client = null;

    await new Promise<void>((resolve) => {
      client.disconnect(() => {
        resolve();
      });
    });
  }

  private getClient(): RdKafka.KafkaConsumer {
    if (!this.client) {
      throw new Error('consumer is not connected');
    }
    return this.client;
  }
}

export function newConsumer(): Consumer {
  return new NativeConsumer();
}

function describe(message: RdKafka.Message): string {
  return `${message.topic} ${message.partition} ${message.offset}`;
}

function toPayload(message: RdKafka.Message): EachMessagePayload {
  return {
    topic: message.topic,
    partition: message.partition,
    message: {
      key: message.key ? Buffer.from(message.key) : null,
      value: message.value,
      offset: String(message.offset),
    },
  };
}

function poll(client: RdKafka.KafkaConsumer): Promise<RdKafka.Message[]> {
  return new Promise((resolve, reject) => {
    client.consume(POLL_SIZE, (error, messages) => {
      if (error) {
        reject(new Error(`kafka consume failed: ${error.message}`, { cause: error }));
      } else {
        resolve(messages);
      }
    });
  });
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new MessageTimeoutError(`processing took longer than ${ms}ms`));
    }, ms);
  });

  return Promise.race([promise, timeout]).finally(() => {
    clearTimeout(timer);
  });
}

function fetchMetadata(consumer: RdKafka.KafkaConsumer): Promise<RdKafka.Metadata> {
  return new Promise((resolve, reject) => {
    // 不加 allTopics 只会返回这个 client 已经知道的 topic
    consumer.getMetadata({ allTopics: true }, (error, data) => {
      if (error) {
        reject(new Error(`failed to fetch kafka metadata: ${error.message}`, { cause: error }));
      } else {
        resolve(data);
      }
    });
  });
}

/**
 * 只订阅 broker 上存在的 topic。订阅了不存在的 topic 时 consume() 会一直整批返回 ERR_UNKNOWN_TOPIC_OR_PART，把其它 topic
 * 的消费一起饿死；topic 之后被创建出来时， 下一次调用会把它订阅上。返回当前还不存在的 topic。
 */
async function syncSubscription(
  consumer: RdKafka.KafkaConsumer,
  topics: string[],
): Promise<string[]> {
  let known: Set<string>;
  try {
    const metadata = await fetchMetadata(consumer);
    known = new Set(metadata.topics.map((topic) => topic.name));
  } catch (error) {
    logger.warn(error, 'failed to fetch kafka metadata');
    if (consumer.subscription().length === 0) {
      consumer.subscribe(topics);
    }
    return [];
  }

  const available = topics.filter((topic) => known.has(topic));
  const missing = topics.filter((topic) => !known.has(topic));
  // 一个都不存在时仍然全量订阅，等 topic 被创建出来
  const target = available.length > 0 ? available : topics;

  const current = consumer.subscription();
  if (target.length === current.length && target.every((topic) => current.includes(topic))) {
    return missing;
  }

  consumer.subscribe(target);

  if (missing.length === 0) {
    logger.info(`subscribed to ${target.length} kafka topics`);
  } else if (available.length === 0) {
    logger.error(`none of the kafka topics exist on broker yet: ${missing.join(', ')}`);
  } else {
    logger.warn(`kafka topics not found on broker, skipped: ${missing.join(', ')}`);
  }

  return missing;
}
