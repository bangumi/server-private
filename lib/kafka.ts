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

export async function newConsumer(): Promise<RdKafka.KafkaConsumer> {
  if (!config.kafkaBrokers) {
    throw new Error('KAFKA_BROKERS is not set');
  }

  const consumer = new RdKafka.KafkaConsumer({
    'bootstrap.servers': config.kafkaBrokers,
    'group.id': config.kafkaJsMqGroupId,
    'enable.auto.commit': true,
    // 处理完成后再 offsetsStore()，避免提交还没处理的消息
    'enable.auto.offset.store': false,
  });

  // 原生 API 默认丢弃 librdkafka 的日志事件，转给 pino 才能看到断连、出组这类问题
  consumer.on('event.log', (event: LibrdKafkaLogEvent) => {
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
    consumer.connect(undefined, (error) => {
      if (error) {
        reject(new Error(`failed to connect to kafka: ${error.message}`, { cause: error }));
      } else {
        resolve();
      }
    });
  });

  return consumer;
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
export async function syncSubscription(
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
