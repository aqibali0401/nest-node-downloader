# 🚀 IoT Downloader System

A robust, production-ready downloader system for IoT devices with crash recovery, offline handling, and SQLite database management.

## 📋 Table of Contents

- [Features](#-features)
- [Quick Start](#-quick-start)
- [Architecture](#-architecture)
- [Usage](#-usage)
- [Testing](#-testing)
- [Troubleshooting](#-troubleshooting)
- [API Reference](#-api-reference)
- [Contributing](#-contributing)

## ✨ Features

### 🔄 Smart Download Management
- **Version Check**: Prevents duplicate downloads
- **SQLite Database**: ACID transactions, data integrity
- **Checksum Verification**: SHA256 file integrity validation
- **Automatic Cleanup**: Keeps only latest version

### 🌐 Network Resilience
- **Internet Detection**: Pre-download connectivity checks
- **Offline Handling**: Clear error messages for operators
- **Multiple Test URLs**: Google, Cloudflare, HTTPBin
- **Latency Measurement**: Network performance monitoring

### 💥 Crash Recovery System
- **Process State Persistence**: Survives crashes
- **Automatic Recovery**: Restores from saved state
- **Retry Logic**: 3 attempts with exponential backoff
- **Database Recovery**: Reconnects to SQLite

### 🧪 Comprehensive Testing
- **Crash Simulation**: Memory, network, file system crashes
- **Recovery Testing**: State restoration validation
- **Network Testing**: Connectivity and performance tests
- **Integration Testing**: End-to-end workflow validation

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm 9+
- Internet connection (for initial setup)

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd nest-downloader

# Install dependencies
npm install

# Run migration (one-time setup)
npm run migrate:sqlite

# Test the system
npm run network:check
```

### Basic Usage
```bash
# Download with connectivity check
npm run download

# Check network status
npm run network:check

# View database
npm run db:view
```

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Network       │    │   Database       │    │   Recovery      │
│   Service       │    │   Service        │    │   Service       │
│                 │    │                  │    │                 │
│ • Connectivity  │    │ • SQLite         │    │ • State         │
│ • Latency       │    │ • Downloads      │    │ • Retry         │
│ • Timeout       │    │ • Metadata       │    │ • Crash         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Downloader    │
                    │   Service       │
                    │                 │
                    │ • Version Check │
                    │ • Download      │
                    │ • Verify        │
                    │ • Save          │
                    └─────────────────┘
```

### Core Components

#### 1. **NetworkService**
- Internet connectivity detection
- Latency measurement
- Multiple endpoint testing
- Timeout handling

#### 2. **DatabaseService**
- SQLite database management
- Download record storage
- Metadata tracking
- ACID transactions

#### 3. **ProcessRecoveryService**
- State persistence
- Crash recovery
- Retry mechanisms
- State cleanup

#### 4. **CrashSimulationService**
- Crash scenario simulation
- Memory exhaustion testing
- Network timeout simulation
- File system error testing

## 📖 Usage

### Download Operations

#### Basic Download
```bash
# Download with full connectivity check
npm run download
```

#### Debug Mode
```bash
# Download with detailed logging
npm run download:debug
```

#### Clean Database
```bash
# Clean all downloads and database
npm run download:clean
```

### Network Management

#### Check Connectivity
```bash
# Comprehensive network status
npm run network:check
```

#### Test Offline Behavior
```bash
# Simulate offline scenarios
npm run test:offline
```

### Database Management

#### View Data
```bash
# View all download records
npm run db:view
```

#### Custom Queries
```bash
# Run SQL queries
npm run db:query "SELECT * FROM downloads ORDER BY downloadedAt DESC"
npm run db:query "SELECT version, COUNT(*) as downloads FROM downloads GROUP BY version"
```

### Crash Testing

#### Simulate Crashes
```bash
# Test specific crash scenarios
npm run crash:simulate memory_exhaustion
npm run crash:simulate network_timeout
npm run crash:simulate file_system_error
npm run crash:simulate process_signal
npm run crash:simulate infinite_loop
npm run crash:simulate random
```

#### Test Recovery
```bash
# Test recovery mechanisms
npm run recovery:test
```

#### Full Crash Testing
```bash
# Comprehensive crash testing suite
npm run crash:test
```

## 🧪 Testing

### Test Categories

#### 1. **Network Tests**
- Connectivity detection
- Latency measurement
- Offline scenario handling
- Multiple endpoint testing

#### 2. **Database Tests**
- SQLite operations
- Data integrity
- Transaction safety
- State persistence

#### 3. **Crash Tests**
- Memory exhaustion
- Network timeouts
- File system errors
- Process signals
- Infinite loops

#### 4. **Recovery Tests**
- State restoration
- Database recovery
- Network recovery
- File system recovery
- Retry mechanisms

### Running Tests

```bash
# Run all tests
npm run crash:test
npm run recovery:test
npm run network:check

# Test specific scenarios
npm run crash:simulate <scenario>
npm run test:offline
```

## 🔧 Configuration

### Environment Variables
```bash
# Debug mode
DEBUG=true

# Database file
DATABASE_FILE=./database.sqlite

# Manifest file
MANIFEST_FILE=./manifest.json

# Downloads directory
DOWNLOAD_DIR=./downloads
```

### Manifest Structure
```json
{
  "version": "1.0.0",
  "artifact": "https://example.com/file.pdf",
  "checksum": "sha256:abc123...",
  "description": "Software update",
  "lastUpdated": "2024-01-15T10:30:00.000Z",
  "size": 1024000,
  "format": "pdf"
}
```

## 🚨 Troubleshooting

### Common Issues

#### 1. **No Internet Connection**
```
❌ No internet connection available
🔌 IoT Device Status: OFFLINE
📡 Network Error: Unable to reach any test servers
```
**Solution**: Check network cable/WiFi, verify router, check firewall

#### 2. **Database Errors**
```
❌ Database connection failed
```
**Solution**: Check file permissions, disk space, SQLite installation

#### 3. **Download Failures**
```
❌ Download failed: Network timeout
```
**Solution**: Check internet connection, retry with `npm run download`

#### 4. **Process Crashes**
```
💥 Process crashed: Out of memory
```
**Solution**: System will auto-recover, check logs for details

### Debug Mode
```bash
# Enable detailed logging
DEBUG=true npm run download
```

### Log Analysis
- Check console output for error messages
- Review database state with `npm run db:view`
- Test network with `npm run network:check`

## 📊 Monitoring

### Status Indicators

#### Network Status
- 🟢 **FULLY ONLINE**: All services reachable
- 🟡 **PARTIALLY ONLINE**: Some services unreachable
- 🔴 **OFFLINE**: No connectivity detected

#### Process Status
- 🟢 **RUNNING**: Normal operation
- 🟡 **RECOVERING**: Crash recovery in progress
- 🔴 **FAILED**: Process failed, needs attention

### Health Checks
```bash
# Check system health
npm run network:check
npm run db:view
npm run recovery:test
```

## 🔄 Workflow Examples

### 1. **Normal Download Flow**
```bash
# 1. Check network
npm run network:check

# 2. Download update
npm run download

# 3. Verify success
npm run db:view
```

### 2. **Offline Scenario**
```bash
# 1. Disconnect internet
# 2. Attempt download
npm run download
# Result: Clear offline message with troubleshooting steps

# 3. Reconnect internet
# 4. Retry download
npm run download
```

### 3. **Crash Recovery**
```bash
# 1. Simulate crash
npm run crash:simulate memory_exhaustion

# 2. System auto-recovers
# 3. Check recovery status
npm run recovery:test
```

## 📈 Performance

### Benchmarks
- **Download Speed**: ~1-5 MB/s (depends on network)
- **Recovery Time**: ~200-500ms
- **Memory Usage**: ~50-100MB (normal operation)
- **Database Size**: ~1-10MB (depends on downloads)

### Optimization Tips
- Use SSD storage for better database performance
- Ensure adequate RAM (512MB+ recommended)
- Monitor disk space for downloads
- Regular database cleanup with `npm run download:clean`

## 🤝 Contributing

### Development Setup
```bash
# Install dependencies
npm install

# Run in development mode
npm run start:dev

# Run tests
npm run crash:test
npm run recovery:test
```

### Code Structure
```
src/
├── core/                 # Core services
│   ├── database/        # Database management
│   ├── network/         # Network connectivity
│   ├── crash/          # Crash simulation
│   └── recovery/       # Process recovery
├── modules/            # Feature modules
│   └── downloader/     # Download functionality
├── scripts/            # Utility scripts
└── cli/               # Command line interface
```

### Adding New Features
1. Create service in appropriate `core/` directory
2. Add module exports
3. Update app.module.ts
4. Add CLI commands to package.json
5. Write tests
6. Update documentation

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

### Getting Help
1. Check this README
2. Run `npm run network:check` for network issues
3. Run `npm run db:view` for database issues
4. Check logs for error details
5. Contact development team

### Reporting Issues
- Include error messages
- Provide system information
- Attach relevant logs
- Describe reproduction steps

---

**🚀 Ready for Production Deployment!**