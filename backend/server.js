const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');
const log4js = require('log4js');
const { Kafka } = require('kafkajs');
require('dotenv').config();

// Configure log4js
log4js.configure({
    appenders: {
        console: { type: 'console' },
        file: { type: 'file', filename: 'app.log' }
    },
    categories: {
        default: { appenders: ['console', 'file'], level: 'info' }
    }
});

const logger = log4js.getLogger();
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'tidb',
    port: process.env.DB_PORT || 4000,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'helfy_db',
    ssl: false  // Disable SSL for local TiDB
};// Kafka configuration
const kafka = new Kafka({
    clientId: 'backend-api',
    brokers: [process.env.KAFKA_BROKER || 'kafka:9092']
});

const producer = kafka.producer();

// Database connection pool
let db;

async function initializeDatabase() {
    try {
        // First connect without specifying a database to create it
        const tempConfig = { ...dbConfig };
        delete tempConfig.database;
        const tempDb = await mysql.createConnection(tempConfig);

        // Create database if it doesn't exist
        await tempDb.execute('CREATE DATABASE IF NOT EXISTS helfy_db');
        await tempDb.end();

        // Now connect to the specific database
        db = await mysql.createPool(dbConfig);
        logger.info('Database connected successfully');

        // Create tables if they don't exist
        await createTables();
        await createDefaultUser();
    } catch (error) {
        logger.error('Database connection failed:', error);
        process.exit(1);
    }
} async function createTables() {
    const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      token VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `;

    const createUserActivityTable = `
    CREATE TABLE IF NOT EXISTS user_activity (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT,
      action VARCHAR(255) NOT NULL,
      ip_address VARCHAR(45),
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `;

    try {
        await db.execute(createUsersTable);
        await db.execute(createUserActivityTable);
        logger.info('Tables created successfully');
    } catch (error) {
        logger.error('Error creating tables:', error);
    }
}

async function createDefaultUser() {
    try {
        const [rows] = await db.execute('SELECT * FROM users WHERE username = ?', ['admin']);

        if (rows.length === 0) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await db.execute(
                'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
                ['admin', 'admin@example.com', hashedPassword]
            );
            logger.info('Default user created: admin / admin123');
        }
    } catch (error) {
        logger.error('Error creating default user:', error);
    }
}

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');

        // Verify token exists in database
        const [rows] = await db.execute('SELECT * FROM users WHERE id = ? AND token = ?', [decoded.userId, token]);

        if (rows.length === 0) {
            return res.status(403).json({ error: 'Invalid token' });
        }

        req.user = decoded;
        req.user.token = token;
        next();
    } catch (error) {
        logger.error('Token verification failed:', error);
        return res.status(403).json({ error: 'Invalid token' });
    }
};

// Log database changes to Kafka
async function logDatabaseChange(operation, table, data, userId = null) {
    const changeLog = {
        timestamp: new Date().toISOString(),
        operation,
        table,
        data,
        userId
    };

    try {
        await producer.send({
            topic: 'database-changes',
            messages: [{
                key: `${table}-${Date.now()}`,
                value: JSON.stringify(changeLog)
            }]
        });

        logger.info('Database change logged:', changeLog);
    } catch (error) {
        logger.error('Failed to log database change to Kafka:', error);
    }
}

// Routes
app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await db.execute(
            'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
            [username, email, hashedPassword]
        );

        await logDatabaseChange('INSERT', 'users', { id: result.insertId, username, email });

        res.status(201).json({
            message: 'User registered successfully',
            userId: result.insertId
        });
    } catch (error) {
        logger.error('Registration error:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Username or email already exists' });
        }

        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        const [rows] = await db.execute('SELECT * FROM users WHERE username = ? OR email = ?', [username, username]);

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = rows[0];
        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { userId: user.id, username: user.username },
            process.env.JWT_SECRET || 'fallback-secret-key',
            { expiresIn: '24h' }
        );

        // Store token in database
        await db.execute('UPDATE users SET token = ? WHERE id = ?', [token, user.id]);

        // Log user activity
        const activityLog = {
            timestamp: new Date().toISOString(),
            userId: user.id,
            action: 'LOGIN',
            ipAddress: clientIP
        };

        logger.info('User activity:', activityLog);

        // Store activity in database
        await db.execute(
            'INSERT INTO user_activity (user_id, action, ip_address) VALUES (?, ?, ?)',
            [user.id, 'LOGIN', clientIP]
        );

        await logDatabaseChange('INSERT', 'user_activity', activityLog, user.id);

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        logger.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/logout', authenticateToken, async (req, res) => {
    try {
        await db.execute('UPDATE users SET token = NULL WHERE id = ?', [req.user.userId]);

        const activityLog = {
            timestamp: new Date().toISOString(),
            userId: req.user.userId,
            action: 'LOGOUT',
            ipAddress: req.ip || req.connection.remoteAddress
        };

        logger.info('User activity:', activityLog);

        await db.execute(
            'INSERT INTO user_activity (user_id, action, ip_address) VALUES (?, ?, ?)',
            [req.user.userId, 'LOGOUT', req.ip || req.connection.remoteAddress]
        );

        await logDatabaseChange('UPDATE', 'users', { id: req.user.userId, token: null }, req.user.userId);

        res.json({ message: 'Logout successful' });
    } catch (error) {
        logger.error('Logout error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
        const [rows] = await db.execute(
            'SELECT id, username, email, created_at FROM users WHERE id = ?',
            [req.user.userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user: rows[0] });
    } catch (error) {
        logger.error('Profile fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'backend-api'
    });
});

// Initialize Kafka producer
async function initializeKafka() {
    try {
        await producer.connect();
        logger.info('Kafka producer connected successfully');
    } catch (error) {
        logger.error('Kafka connection failed:', error);
    }
}

// Start server
async function startServer() {
    await initializeDatabase();
    await initializeKafka();

    app.listen(PORT, () => {
        logger.info(`Backend server running on port ${PORT}`);
    });
}

// Graceful shutdown
process.on('SIGINT', async () => {
    logger.info('Shutting down gracefully...');
    try {
        await producer.disconnect();
        if (db) await db.end();
        process.exit(0);
    } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
    }
});

startServer().catch(error => {
    logger.error('Failed to start server:', error);
    process.exit(1);
});
