## 🏗️ Architecture Overview

This application implements a modern microservices architecture with the following components:

### **Frontend**
- **Technology**: React 18 with functional components and hooks
- **Authentication**: JWT-based authentication with protected routes
- **UI**: Basic responsive design with login, registration, and dashboard
- **Port**: 3000

### **Backend API**
- **Technology**: Node.js with Express.js framework
- **Database**: TiDB integration with connection pooling
- **Authentication**: JWT token management with database storage
- **Logging**: Structured JSON logging using log4js
- **Message Queue**: Apache Kafka producer for database changes
- **Port**: 3001

### **Database**
- **Technology**: TiDB (MySQL-compatible distributed database)
- **Features**: ACID compliance, horizontal scalability
- **Schema**: Users, user activity, and audit logging tables
- **Port**: 4000

### **Message Queue**
- **Technology**: Apache Kafka with Zookeeper
- **Topics**: `database-changes` for CDC events
- **Port**: 9092

### **Consumer Service**
- **Technology**: Node.js Kafka consumer
- **Purpose**: Real-time processing of database changes
- **Logging**: Structured JSON logging with processing statistics
- **Port**: 3003 (health checks)

## 🚀 Quick Start

### Prerequisites

- Docker (version 20.0 or higher)
- Docker Compose (version 2.0 or higher)
- At least 4GB of available RAM
- Ports 3000, 3001, 4000, 9092, and 10080 available

### One-Command Setup

Run the application with a single command:

```bash
./setup.sh
```

Or using Docker Compose directly:

```bash
docker-compose up --build
```

### Alternative Setup Methods

#### Method 1: Using the setup script (Recommended)
```bash
chmod +x setup.sh
./setup.sh
```

#### Method 2: Manual Docker Compose
```bash
# Build and start all services
docker-compose up --build -d

# View logs
docker-compose logs -f

# Check service health
curl http://localhost:3001/api/health
```

#### Method 3: Development Mode
```bash
# Start infrastructure services only
docker-compose up -d tidb kafka zookeeper

# Run backend locally
cd backend && npm install && npm run dev

# Run frontend locally (in another terminal)
cd frontend && npm install && npm start

# Run consumer locally (in another terminal)
cd consumer && npm install && npm start
```

## 🔐 Authentication & Usage

### Default Credentials
- **Username**: `admin`
- **Password**: `admin123`

### Additional Test User
- **Username**: `testuser`
- **Password**: `test123`

### Application URLs
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **TiDB Status**: http://localhost:10080/status

### API Endpoints

#### Authentication
```bash
# Register new user
POST /api/register
{
  "username": "newuser",
  "email": "user@example.com",
  "password": "password123"
}

# Login
POST /api/login
{
  "username": "admin",
  "password": "admin123"
}

# Get user profile (requires auth)
GET /api/profile
Authorization: Bearer <jwt-token>

# Logout
POST /api/logout
Authorization: Bearer <jwt-token>

# Health check
GET /api/health
```

## 📊 Features Implementation

### ✅ Part 1: Simple Development
- [x] Node.js backend with Express.js
- [x] React frontend with authentication UI
- [x] RESTful API implementation
- [x] TiDB database integration
- [x] JWT token management stored in database
- [x] HTTP header-based authentication
- [x] Form validation and error handling

### ✅ Part 2: DevOps Implementation
- [x] Docker containers for all services
- [x] Dockerfile for each service (backend, frontend, consumer)
- [x] TiDB configured in Docker environment
- [x] Apache Kafka with Zookeeper in Docker
- [x] Database initialization with default users
- [x] Automated table structure creation
- [x] Service orchestration with docker-compose

### ✅ Part 3: Monitoring & Logging (SRE Implementation)
- [x] User activity logging with log4js in JSON format
- [x] Login/logout events logged with timestamp, user ID, action, IP
- [x] Database change monitoring (CDC simulation)
- [x] All CRUD operations logged to Kafka
- [x] Kafka consumer processing database changes
- [x] Structured logging format across all services
- [x] Real-time data processing and console output

## 🔍 Monitoring & Logging

### User Activity Logging
Every user action is logged in structured JSON format:
```json
{
  "timestamp": "2025-01-09T12:00:00.000Z",
  "userId": 1,
  "action": "LOGIN",
  "ipAddress": "172.20.0.1"
}
```

### Database Change Capture
All database changes are captured and sent to Kafka:
```json
{
  "timestamp": "2025-01-09T12:00:00.000Z",
  "operation": "INSERT",
  "table": "users",
  "data": { "id": 1, "username": "admin", "email": "admin@example.com" },
  "userId": 1
}
```

### Consumer Processing
The Kafka consumer processes changes with additional metadata:
```json
{
  "timestamp": "2025-01-09T12:00:01.000Z",
  "originalTimestamp": "2025-01-09T12:00:00.000Z",
  "operation": "INSERT",
  "table": "users",
  "data": { "id": 1, "username": "admin" },
  "userId": 1,
  "processedBy": "kafka-consumer",
  "processingLatency": 1000
}
```

## 🗃️ Database Schema

### Users Table
```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    token TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### User Activity Table
```sql
CREATE TABLE user_activity (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Audit Log Table
```sql
CREATE TABLE audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    table_name VARCHAR(255) NOT NULL,
    operation VARCHAR(50) NOT NULL,
    old_values JSON,
    new_values JSON,
    user_id INT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🛠️ Development

### Project Structure
```
helfy-assign/
├── backend/                 # Node.js API service
│   ├── server.js           # Main server file
│   ├── package.json        # Dependencies
│   ├── Dockerfile          # Container configuration
│   └── .env                # Environment variables
├── frontend/               # React application
│   ├── src/                # React source code
│   ├── public/             # Static assets
│   ├── package.json        # Dependencies
│   └── Dockerfile          # Container configuration
├── consumer/               # Kafka consumer service
│   ├── consumer.js         # Main consumer file
│   ├── package.json        # Dependencies
│   └── Dockerfile          # Container configuration
├── database/               # Database initialization
│   └── init.sql            # Database schema and seed data
├── docker-compose.yml      # Service orchestration
├── setup.sh               # One-command setup script
└── README.md              # This file
```

### Environment Variables

#### Backend (.env)
```bash
NODE_ENV=development
PORT=3001
DB_HOST=tidb
DB_PORT=4000
DB_USER=root
DB_PASSWORD=
DB_NAME=helfy_db
JWT_SECRET=your-super-secure-jwt-secret-key
KAFKA_BROKER=kafka:9092
```

#### Consumer (.env)
```bash
NODE_ENV=development
KAFKA_BROKER=kafka:9092
```

## 🔧 Management Commands

### Service Management
```bash
# View all service logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f consumer
docker-compose logs -f kafka
docker-compose logs -f tidb

# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart backend

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down --volumes

# Rebuild and restart
docker-compose up --build
```

### Database Management
```bash
# Connect to TiDB
docker-compose exec tidb mysql -h 127.0.0.1 -P 4000 -u root

# View database status
curl http://localhost:10080/status

# Execute SQL file
docker-compose exec tidb mysql -h 127.0.0.1 -P 4000 -u root < database/init.sql
```

### Kafka Management
```bash
# List topics
docker-compose exec kafka kafka-topics --list --bootstrap-server localhost:29092

# View topic details
docker-compose exec kafka kafka-topics --describe --topic database-changes --bootstrap-server localhost:29092

# Consume messages
docker-compose exec kafka kafka-console-consumer --topic database-changes --bootstrap-server localhost:29092 --from-beginning
```

## 🏥 Health Checks

All services implement health checks:

### Backend API
```bash
curl http://localhost:3001/api/health
```

### TiDB Database
```bash
curl http://localhost:10080/status
```

### Consumer Service
```bash
curl http://localhost:3003/health
```

### Frontend
```bash
curl http://localhost:3000
```

## 📈 Performance & Scalability

### Current Configuration
- **TiDB**: Single node setup (can be scaled to cluster)
- **Kafka**: Single broker with 3 partitions for database-changes topic
- **Backend**: Single instance with connection pooling
- **Frontend**: Production build served with serve

### Scaling Options
- **Horizontal**: Add more backend instances behind a load balancer
- **Database**: TiDB supports horizontal scaling across multiple nodes
- **Kafka**: Add more brokers and increase partition count
- **Consumer**: Scale consumer groups for parallel processing

## 🔐 Security Features

### Authentication
- JWT-based authentication with configurable expiration
- Secure password hashing using bcrypt (10 rounds)
- Token validation on every protected request
- Automatic token cleanup on logout

### Database Security
- Parameterized queries to prevent SQL injection
- Connection pooling with secure configurations
- Input validation on all endpoints
- Error handling without information disclosure

### Container Security
- Non-root user execution in containers
- Health checks for service monitoring
- Resource limits and restart policies
- Secure environment variable handling

## 🐛 Troubleshooting

### Common Issues

#### Services not starting
```bash
# Check if ports are available
netstat -tulpn | grep -E ":(3000|3001|4000|9092|10080)"

# Check Docker resources
docker system df
docker system prune -f
```

#### Database connection issues
```bash
# Check TiDB health
curl http://localhost:10080/status

# Check TiDB logs
docker-compose logs tidb

# Test database connection
docker-compose exec tidb mysql -h 127.0.0.1 -P 4000 -u root -e "SELECT 1"
```

#### Kafka connectivity issues
```bash
# Check Kafka health
docker-compose logs kafka

# Verify topics exist
docker-compose exec kafka kafka-topics --list --bootstrap-server localhost:29092

# Test consumer connection
docker-compose exec kafka kafka-console-consumer --topic database-changes --bootstrap-server localhost:29092
```

#### Frontend/Backend communication
```bash
# Check CORS configuration
curl -H "Origin: http://localhost:3000" http://localhost:3001/api/health

# Verify proxy configuration
grep -r "proxy" frontend/package.json
```

### Log Locations
- **Backend logs**: `backend/app.log` and console
- **Consumer logs**: `consumer/consumer.log` and console
- **Docker logs**: `docker-compose logs <service-name>`

## 🧪 Testing

### Manual Testing Workflow

1. **Authentication Flow**
   ```bash
   # Register new user
   curl -X POST http://localhost:3001/api/register \
     -H "Content-Type: application/json" \
     -d '{"username":"testuser2","email":"test2@example.com","password":"password123"}'

   # Login
   curl -X POST http://localhost:3001/api/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"admin123"}'

   # Access protected resource
   curl -H "Authorization: Bearer <jwt-token>" http://localhost:3001/api/profile
   ```

2. **Database Changes**
   - Register new users and watch consumer logs
   - Login/logout and verify activity logging
   - Check Kafka messages for database changes

3. **Service Health**
   - Verify all health endpoints respond correctly
   - Test service restart recovery
   - Monitor log outputs for errors

## 📝 Implementation Notes

### Architecture Decisions

1. **TiDB over MySQL**: Chosen for horizontal scalability and cloud-native design
2. **Kafka over RabbitMQ**: Better for high-throughput message processing
3. **JWT over Sessions**: Stateless authentication suitable for microservices
4. **log4js over Winston**: Better structured JSON logging support
5. **React over Vue**: More extensive ecosystem and community support

### Change Data Capture (CDC) Implementation

Since TiDB doesn't support traditional database triggers in all configurations, CDC is implemented at the application level:

1. **Application-Level CDC**: Database changes are captured in the API layer
2. **Kafka Integration**: Changes are immediately sent to Kafka topics
3. **Consumer Processing**: Dedicated service processes changes asynchronously
4. **Structured Logging**: All changes logged in consistent JSON format

### Production Considerations

For production deployment, consider:

1. **Security**
   - Use strong JWT secrets
   - Implement rate limiting
   - Add request validation middleware
   - Use HTTPS/TLS encryption

2. **Performance**
   - Implement caching (Redis)
   - Add database read replicas
   - Use CDN for frontend assets
   - Optimize Docker images

3. **Monitoring**
   - Add APM tools (New Relic, DataDog)
   - Implement metrics collection
   - Set up alerting systems
   - Add distributed tracing

4. **High Availability**
   - Multi-node TiDB cluster
   - Kafka cluster setup
   - Load balancer for backend services
   - Auto-scaling policies

## 📞 Support

For questions or issues with this implementation:

1. Check the troubleshooting section above
2. Review service logs for error details
3. Ensure all prerequisites are met
4. Verify network connectivity between services

## 🏆 Assignment Completion Status

### ✅ All Requirements Met

- **Part 1: Simple Development** - ✅ Complete
  - Node.js backend with Express.js
  - React frontend with authentication
  - TiDB database integration
  - JWT token management
  - User authentication interface

- **Part 2: DevOps Implementation** - ✅ Complete
  - Docker containers for all services
  - TiDB in Docker environment
  - Apache Kafka integration
  - Database initialization with default user
  - One-command deployment

- **Part 3: Monitoring & Logging** - ✅ Complete
  - log4js structured JSON logging
  - User activity logging with required fields
  - Database change monitoring (CDC)
  - Kafka consumer for real-time processing
  - All database operations logged


