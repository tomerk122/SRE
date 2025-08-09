const { Kafka } = require('kafkajs');
const log4js = require('log4js');
require('dotenv').config();

// Configure log4js for structured logging
log4js.configure({
    appenders: {
        console: {
            type: 'console',
            layout: {
                type: 'pattern',
                pattern: '%d{ISO} [%p] %c - %m'
            }
        },
        file: {
            type: 'file',
            filename: 'consumer.log',
            layout: {
                type: 'pattern',
                pattern: '%d{ISO} [%p] %c - %m'
            }
        }
    },
    categories: {
        default: { appenders: ['console', 'file'], level: 'info' },
        database: { appenders: ['console', 'file'], level: 'info' },
        kafka: { appenders: ['console', 'file'], level: 'info' }
    }
});

const logger = log4js.getLogger('consumer');
const databaseLogger = log4js.getLogger('database');
const kafkaLogger = log4js.getLogger('kafka');

// Kafka configuration
const kafka = new Kafka({
    clientId: 'database-change-consumer',
    brokers: [process.env.KAFKA_BROKER || 'kafka:9092'],
    retry: {
        initialRetryTime: 1000,
        retries: 10
    }
});

const consumer = kafka.consumer({
    groupId: 'database-changes-group',
    sessionTimeout: 30000,
    heartbeatInterval: 3000
});

// Database change processor
class DatabaseChangeProcessor {
    constructor() {
        this.processedCount = 0;
        this.startTime = new Date();
    }

    async processChange(message) {
        try {
            const changeData = JSON.parse(message.value.toString());

            // Process and log the database change
            const processedChange = {
                timestamp: new Date().toISOString(),
                originalTimestamp: changeData.timestamp,
                operation: changeData.operation,
                table: changeData.table,
                data: changeData.data,
                userId: changeData.userId,
                processedBy: 'kafka-consumer',
                processingLatency: this.calculateLatency(changeData.timestamp)
            };

            // Log to console in structured format
            databaseLogger.info(JSON.stringify(processedChange));

            // Update processing statistics
            this.processedCount++;

            // Log processing statistics every 10 messages
            if (this.processedCount % 10 === 0) {
                const stats = {
                    timestamp: new Date().toISOString(),
                    totalProcessed: this.processedCount,
                    uptime: Math.round((new Date() - this.startTime) / 1000),
                    averageProcessingRate: Math.round(this.processedCount / ((new Date() - this.startTime) / 1000 / 60) * 100) / 100
                };

                logger.info(`Processing statistics: ${JSON.stringify(stats)}`);
            }

        } catch (error) {
            logger.error(`Error processing database change: ${error.message}`);
        }
    }

    calculateLatency(originalTimestamp) {
        const now = new Date();
        const original = new Date(originalTimestamp);
        return Math.max(0, now - original); // milliseconds
    }
}

// Main consumer function
async function runConsumer() {
    const processor = new DatabaseChangeProcessor();

    try {
        await consumer.connect();
        kafkaLogger.info('Consumer connected to Kafka');

        await consumer.subscribe({ topic: 'database-changes' });
        kafkaLogger.info('Subscribed to database-changes topic');

        await consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                const messageInfo = {
                    topic,
                    partition,
                    offset: message.offset,
                    timestamp: new Date().toISOString(),
                    key: message.key ? message.key.toString() : null
                };

                kafkaLogger.info(`Received message: ${JSON.stringify(messageInfo)}`);

                await processor.processChange(message);
            },
        });

        logger.info('Kafka consumer is running and waiting for messages...');

    } catch (error) {
        logger.error(`Consumer error: ${error.message}`);
        process.exit(1);
    }
}

// Health check endpoint (simple HTTP server)
const http = require('http');
const server = http.createServer((req, res) => {
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'OK',
            timestamp: new Date().toISOString(),
            service: 'kafka-consumer'
        }));
    } else {
        res.writeHead(404);
        res.end();
    }
});

server.listen(3003, () => {
    logger.info('Health check server running on port 3003');
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);

    try {
        await consumer.disconnect();
        server.close();
        logger.info('Consumer disconnected successfully');
        process.exit(0);
    } catch (error) {
        logger.error(`Error during shutdown: ${error.message}`);
        process.exit(1);
    }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error(`Uncaught Exception: ${error.message}`);
    process.exit(1);
});

// Start the consumer
runConsumer().catch(error => {
    logger.error(`Failed to start consumer: ${error.message}`);
    process.exit(1);
});
