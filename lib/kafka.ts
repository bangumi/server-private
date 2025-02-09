import { KafkaJS } from '@confluentinc/kafka-javascript';

import config, { production, stage } from '@app/lib/config.ts';

class Producer {
  private producer: KafkaJS.Producer | null = null;

  async initialize() {
    if (this.producer) {
      return;
    }

    const { Kafka, logLevel } = KafkaJS;

    const kafka = new Kafka({
      log_level: logLevel.WARN,
    });

    if (!config.kafkaBrokers) {
      throw new Error('KAFKA_BROKERS is not set');
    }

    const producer = kafka.producer({
      'bootstrap.servers': config.kafkaBrokers,
    });
    await producer.connect();
    this.producer = producer;
  }

  async send(topic: string, key: string, value: string) {
    await this.initialize();
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  send(topic: string, key: string, value: string): Promise<void> {
    return Promise.resolve();
  }
}

export const producer = production || stage ? new Producer() : new MockProducer();

export async function newConsumer(topics: string[]) {
  const { Kafka, logLevel } = KafkaJS;

  const kafka = new Kafka({
    log_level: logLevel.WARN,
  });
  if (!config.kafkaBrokers) {
    throw new Error('KAFKA_BROKERS is not set');
  }
  const consumer = kafka.consumer({
    'bootstrap.servers': config.kafkaBrokers,
    'group.id': 'server-private',
  });
  await consumer.connect();
  await consumer.subscribe({ topics });
  return consumer;
}
