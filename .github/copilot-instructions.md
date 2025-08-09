<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Copilot Instructions for Full-Stack Application

This is a full-stack application with the following architecture:
- **Backend**: Node.js with Express.js, JWT authentication, TiDB integration
- **Frontend**: React application with basic authentication UI
- **Database**: TiDB with Change Data Capture (CDC)
- **Message Queue**: Apache Kafka for real-time data processing
- **Logging**: log4js for structured JSON logging
- **Containerization**: Docker and Docker Compose

## Key Components:
1. User authentication with JWT tokens
2. Database change monitoring with TiDB CDC
3. Kafka consumer for real-time data processing
4. Structured logging for user activities and database changes
5. Docker containerization for all services

## Technologies:
- Node.js, Express.js, React
- TiDB, Apache Kafka
- Docker, Docker Compose
- log4js for logging
