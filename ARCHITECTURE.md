# 🏗️ EdgeSDM Architecture Documentation

## Overview

EdgeSDM (Edge Software Deployment Manager) is a comprehensive IoT device software update system built with NestJS. It provides robust download management, network resilience, crash recovery, and comprehensive testing capabilities.

## 🎯 Application Purpose

This application is designed for **IoT devices** that need to:
- Download software updates from remote servers
- Handle network connectivity issues gracefully
- Recover from crashes and failures automatically
- Maintain data integrity with checksum verification
- Provide comprehensive testing and monitoring capabilities

## 🏛️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        EdgeSDM Application                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │   Shared    │  │    Core     │  │   Modules   │  │   CLI   │ │
│  │   Module    │  │   Modules   │  │             │  │         │ │
│  │             │  │             │  │             │  │         │ │
│  │ • Constants │  │ • Database  │  │ • Downloader│  │ • CLI   │ │
│  │ • Enums     │  │ • Network   │  │             │  │ • Help  │ │
│  │ • Interfaces│  │ • Crash     │  │             │  │         │ │
│  │ • Services  │  │ • Recovery  │  │             │  │         │ │
│  │ • Utils     │  │ • Config    │  │             │  │         │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## 📁 Directory Structure

```
src/
├── shared/                    # Shared utilities and services
│   ├── constants/            # Application constants
│   │   └── app.constants.ts  # All app-wide constants
│   ├── enums/                # Type-safe enums
│   │   └── app.enums.ts      # All application enums
│   ├── interfaces/           # TypeScript interfaces
│   │   └── app.interfaces.ts # All application interfaces
│   ├── services/             # Shared services
│   │   ├── logger.service.ts # Enhanced logging service
│   │   └── error-handler.service.ts # Centralized error handling
│   ├── utils/                # Utility functions
│   │   └── format.utils.ts   # Formatting utilities
│   ├── types/                # Type definitions
│   │   └── cli.types.ts      # CLI-specific types
│   ├── shared.module.ts      # Global shared module
│   └── index.ts              # Centralized exports
├── core/                     # Core application modules
│   ├── application/          # Main application logic
│   │   ├── application.service.ts
│   │   └── application.module.ts
│   ├── config/               # Configuration management
│   │   └── app.config.ts
│   ├── database/             # Database operations
│   │   ├── database.service.ts
│   │   └── database.module.ts
│   ├── network/              # Network connectivity
│   │   ├── network.service.ts
│   │   └── network.module.ts
│   ├── crash/                # Crash simulation
│   │   ├── crash.service.ts
│   │   └── crash.module.ts
│   └── recovery/             # Process recovery
│       ├── recovery.service.ts
│       └── recovery.module.ts
├── modules/                  # Feature modules
│   └── downloader/           # Download functionality
│       ├── services/
│       │   └── simple-downloader.service.ts
│       ├── interfaces/
│       │   └── manifest.interface.ts
│       └── downloader.module.ts
├── cli/                      # Command line interface
│   ├── simple-downloader.ts
│   ├── cli.service.ts
│   └── downloader-cli.service.ts
├── scripts/                  # Utility scripts
│   ├── db-query.ts
│   ├── migrate-to-sqlite.ts
│   └── view-database.ts
├── app.module.ts             # Root module
└── main.ts                   # Application entry point
```

## 🔧 Core Components

### 1. **Shared Module** (`src/shared/`)
- **Purpose**: Provides common utilities, services, and types across the application
- **Key Features**:
  - Centralized constants and configuration
  - Type-safe enums and interfaces
  - Enhanced logging with structured output
  - Centralized error handling
  - Utility functions

### 2. **Database Module** (`src/core/database/`)
- **Purpose**: Manages SQLite database operations
- **Key Features**:
  - ACID transactions
  - Download record storage
  - Metadata tracking
  - Version management
  - Data integrity validation

### 3. **Network Module** (`src/core/network/`)
- **Purpose**: Handles network connectivity testing and monitoring
- **Key Features**:
  - Internet connectivity detection
  - Latency measurement
  - Multiple endpoint testing
  - Offline scenario handling
  - Network performance monitoring

### 4. **Crash Module** (`src/core/crash/`)
- **Purpose**: Simulates various crash scenarios for testing
- **Key Features**:
  - Memory exhaustion simulation
  - Network timeout simulation
  - File system error simulation
  - Process signal simulation
  - Infinite loop simulation

### 5. **Recovery Module** (`src/core/recovery/`)
- **Purpose**: Manages process recovery and state persistence
- **Key Features**:
  - State persistence to disk
  - Automatic crash recovery
  - Retry mechanisms with exponential backoff
  - Process state restoration
  - Recovery testing

### 6. **Downloader Module** (`src/modules/downloader/`)
- **Purpose**: Handles software download operations
- **Key Features**:
  - Manifest-based downloads
  - Checksum verification (SHA256)
  - Version checking
  - Google Docs URL support
  - Progress tracking
  - Automatic cleanup

## 🔄 Data Flow

### Normal Download Flow
```
1. Application Start
   ↓
2. Configuration Validation
   ↓
3. Network Connectivity Check
   ↓
4. Database Initialization
   ↓
5. Manifest Loading
   ↓
6. Version Check
   ↓
7. Download Execution
   ↓
8. Checksum Verification
   ↓
9. Database Update
   ↓
10. Cleanup
```

### Crash Recovery Flow
```
1. Crash Detection
   ↓
2. State Persistence
   ↓
3. Process Termination
   ↓
4. Application Restart
   ↓
5. State Recovery
   ↓
6. Operation Retry
   ↓
7. Success/Failure Handling
```

## 🛡️ Error Handling Strategy

### 1. **Centralized Error Handling**
- All errors are processed through `ErrorHandlerService`
- Consistent error response format
- Context-aware error logging
- Development vs production error details

### 2. **Error Categories**
- **Validation Errors**: Input validation failures
- **Database Errors**: SQLite operation failures
- **Network Errors**: Connectivity and timeout issues
- **Recovery Errors**: State recovery failures
- **Custom Errors**: Application-specific errors

### 3. **Recovery Mechanisms**
- Automatic retry with exponential backoff
- State persistence for crash recovery
- Graceful degradation for network issues
- Comprehensive logging for debugging

## 📊 Logging Strategy

### 1. **Structured Logging**
- Consistent log format with timestamps
- Context-aware logging with service names
- Performance metrics logging
- Lifecycle event tracking

### 2. **Log Levels**
- **ERROR**: Critical failures requiring attention
- **WARN**: Warning conditions that don't stop execution
- **INFO**: General information about application flow
- **DEBUG**: Detailed information for debugging (only in debug mode)
- **VERBOSE**: Very detailed information (only in debug mode)

### 3. **Specialized Logging**
- **Network Events**: Connectivity tests, latency measurements
- **Database Operations**: CRUD operations, transaction logs
- **Recovery Events**: Crash detection, state recovery
- **Performance Metrics**: Operation durations, resource usage

## 🔧 Configuration Management

### 1. **Environment Variables**
```bash
NODE_ENV=development|production|test
PORT=3000
LOG_LEVEL=error|warn|info|debug|verbose
DEBUG=true|false
DATABASE_FILE=./database.sqlite
DOWNLOAD_DIR=./downloads
MANIFEST_FILE=./manifest.json
MANIFEST_URL=https://example.com/manifest.json
MAX_CONCURRENT_DOWNLOADS=3
```

### 2. **Configuration Validation**
- Runtime validation of all configuration values
- Type checking and range validation
- Environment-specific defaults
- Error reporting for invalid configurations

## 🧪 Testing Strategy

### 1. **Crash Testing**
- Memory exhaustion simulation
- Network timeout simulation
- File system error simulation
- Process signal simulation
- Infinite loop simulation

### 2. **Recovery Testing**
- State persistence validation
- Crash recovery verification
- Retry mechanism testing
- Database recovery testing

### 3. **Network Testing**
- Connectivity detection testing
- Latency measurement testing
- Offline scenario testing
- Multiple endpoint testing

## 🚀 Performance Considerations

### 1. **Database Optimization**
- SQLite with proper indexing
- Connection pooling
- Transaction batching
- Query optimization

### 2. **Network Optimization**
- Connection reuse
- Timeout management
- Retry logic with backoff
- Concurrent download limits

### 3. **Memory Management**
- Proper resource cleanup
- Memory leak prevention
- Garbage collection optimization
- Resource monitoring

## 🔒 Security Considerations

### 1. **Data Integrity**
- SHA256 checksum verification
- File size validation
- Download progress tracking
- Database transaction safety

### 2. **Error Information**
- No sensitive data in error messages
- Development vs production error details
- Secure logging practices
- Input validation and sanitization

## 📈 Monitoring and Observability

### 1. **Health Checks**
- Network connectivity status
- Database health
- Application state
- Recovery status

### 2. **Metrics**
- Download success rates
- Network latency
- Recovery times
- Error rates

### 3. **Logging**
- Structured logs for analysis
- Performance metrics
- Error tracking
- Audit trails

## 🔄 Deployment Considerations

### 1. **Production Deployment**
- Environment variable configuration
- Log level optimization
- Error handling in production mode
- Resource monitoring

### 2. **Development Setup**
- Debug mode enablement
- Detailed error logging
- Development-specific configurations
- Testing utilities

## 🎯 Best Practices Implemented

### 1. **Code Organization**
- Clear separation of concerns
- Modular architecture
- Consistent naming conventions
- Type safety throughout

### 2. **Error Handling**
- Centralized error management
- Graceful failure handling
- Comprehensive logging
- Recovery mechanisms

### 3. **Testing**
- Comprehensive test coverage
- Crash simulation
- Recovery testing
- Network testing

### 4. **Documentation**
- Comprehensive code documentation
- Architecture documentation
- API documentation
- Usage examples

This architecture provides a robust, scalable, and maintainable foundation for IoT device software deployment management with comprehensive error handling, recovery mechanisms, and testing capabilities.
