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

export async function newConsumer(topics: string[]): Promise<RdKafka.KafkaConsumer> {
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

  consumer.subscribe(topics);

  return consumer;
}
