# 👥 Team Guide

## For Development Teams

This guide helps development teams understand, maintain, and extend the IoT Downloader System.

## 🎯 System Overview

### What It Does
- **Downloads software updates** for IoT devices
- **Handles network failures** gracefully with clear error messages
- **Recovers from crashes** automatically using state persistence
- **Prevents duplicate downloads** with version checking
- **Manages download history** in SQLite database

### Why It's Important
- **IoT devices** need reliable software updates
- **Network issues** are common in IoT environments
- **Process crashes** can occur due to resource constraints
- **Data integrity** is critical for device functionality

---

## 🏗️ Architecture Understanding

### Core Components

#### 1. **NetworkService** (`src/core/network/`)
**Purpose**: Internet connectivity detection and monitoring
**Key Features**:
- Tests multiple endpoints (Google, Cloudflare, HTTPBin)
- Measures network latency
- Provides offline detection
- Handles network timeouts

**Team Usage**:
```typescript
// Check if device is online
const connectivity = await networkService.checkConnectivity();
if (!connectivity.isOnline) {
  // Handle offline scenario
}
```

#### 2. **DatabaseService** (`src/core/database/`)
**Purpose**: SQLite database management for download records
**Key Features**:
- ACID transactions for data integrity
- Download history tracking
- Metadata management
- Automatic table creation

**Team Usage**:
```typescript
// Save download record
await databaseService.addDownload(downloadRecord);

// Get all downloads
const downloads = await databaseService.getAllDownloads();
```

#### 3. **ProcessRecoveryService** (`src/core/recovery/`)
**Purpose**: Process state management and crash recovery
**Key Features**:
- State persistence to disk
- Automatic recovery after crashes
- Retry logic with exponential backoff
- State cleanup after completion

**Team Usage**:
```typescript
// Save process state
await recoveryService.saveProcessState(processState);

// Attempt recovery
const result = await recoveryService.attemptRecovery();
```

#### 4. **CrashSimulationService** (`src/core/crash/`)
**Purpose**: Testing crash scenarios and recovery mechanisms
**Key Features**:
- Memory exhaustion simulation
- Network timeout simulation
- File system error simulation
- Process signal simulation

**Team Usage**:
```typescript
// Simulate crash for testing
const result = await crashService.simulateCrash('memory_exhaustion');
```

---

## 🛠️ Development Workflow

### Getting Started

#### 1. **Setup Development Environment**
```bash
# Clone repository
git clone <repository-url>
cd nest-downloader

# Install dependencies
npm install

# Run migration
npm run migrate:sqlite

# Test system
npm run network:check
```

#### 2. **Development Commands**
```bash
# Start development server
npm run start:dev

# Run tests
npm run crash:test
npm run recovery:test

# Debug mode
DEBUG=true npm run download
```

#### 3. **Code Structure**
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

---

## 🔧 Common Development Tasks

### Adding New Features

#### 1. **Create New Service**
```typescript
// src/core/new-feature/new-feature.service.ts
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class NewFeatureService {
  private readonly logger = new Logger(NewFeatureService.name);

  async doSomething(): Promise<void> {
    this.logger.log('Doing something...');
    // Implementation
  }
}
```

#### 2. **Create Module**
```typescript
// src/core/new-feature/new-feature.module.ts
import { Module } from '@nestjs/common';
import { NewFeatureService } from './new-feature.service';

@Module({
  providers: [NewFeatureService],
  exports: [NewFeatureService],
})
export class NewFeatureModule {}
```

#### 3. **Update App Module**
```typescript
// src/app.module.ts
import { NewFeatureModule } from './core/new-feature/new-feature.module';

@Module({
  imports: [
    // ... existing imports
    NewFeatureModule,
  ],
})
export class AppModule {}
```

#### 4. **Add CLI Command**
```json
// package.json
{
  "scripts": {
    "new-feature": "ts-node src/scripts/new-feature.ts"
  }
}
```

### Modifying Existing Features

#### 1. **Update Download Logic**
```typescript
// src/modules/downloader/services/simple-downloader.service.ts
async downloadFromManifest(): Promise<DownloadResult> {
  // Add new logic here
  // Follow existing patterns
}
```

#### 2. **Add New Crash Scenario**
```typescript
// src/core/crash/crash-simulation.service.ts
private async simulateNewCrash(scenario: CrashScenario): Promise<CrashResult> {
  // Add new crash simulation
}
```

#### 3. **Extend Database Schema**
```typescript
// src/core/database/database.service.ts
private async createTables(): Promise<void> {
  // Add new table creation
  await run(`
    CREATE TABLE IF NOT EXISTS new_table (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL
    )
  `);
}
```

---

## 🧪 Testing Guidelines

### Testing Strategy

#### 1. **Unit Tests**
- Test individual service methods
- Mock external dependencies
- Verify error handling
- Test edge cases

#### 2. **Integration Tests**
- Test service interactions
- Verify database operations
- Test network scenarios
- Validate recovery mechanisms

#### 3. **End-to-End Tests**
- Test complete workflows
- Verify user scenarios
- Test error recovery
- Validate performance

### Running Tests

#### **Network Tests**
```bash
# Test connectivity
npm run network:check

# Test offline scenarios
npm run test:offline
```

#### **Crash Tests**
```bash
# Test specific scenarios
npm run crash:simulate memory_exhaustion

# Full crash testing
npm run crash:test
```

#### **Recovery Tests**
```bash
# Test recovery mechanisms
npm run recovery:test
```

#### **Database Tests**
```bash
# Test database operations
npm run db:view
npm run db:query "SELECT * FROM downloads"
```

---

## 🐛 Debugging Guide

### Common Issues

#### 1. **Network Issues**
```bash
# Check connectivity
npm run network:check

# Debug network
DEBUG=true npm run network:check
```

**Symptoms**:
- "No internet connection available"
- "Network timeout"
- "Connection refused"

**Solutions**:
- Check internet connection
- Verify firewall settings
- Test with different endpoints
- Review network configuration

#### 2. **Database Issues**
```bash
# Check database
npm run db:view

# Test database operations
npm run db:query "SELECT * FROM downloads"
```

**Symptoms**:
- "Database connection failed"
- "SQLite error"
- "Permission denied"

**Solutions**:
- Check file permissions
- Verify disk space
- Test database integrity
- Review SQLite installation

#### 3. **Process Issues**
```bash
# Check process status
systemctl status downloader

# View logs
journalctl -u downloader -f
```

**Symptoms**:
- "Process crashed"
- "Out of memory"
- "Process timeout"

**Solutions**:
- Check system resources
- Review error logs
- Test recovery mechanisms
- Monitor memory usage

### Debug Tools

#### **Debug Mode**
```bash
# Enable detailed logging
DEBUG=true npm run download
DEBUG=true npm run crash:test
DEBUG=true npm run recovery:test
```

#### **Log Analysis**
```bash
# View service logs
journalctl -u downloader -f

# View application logs
tail -f /opt/downloader/logs/app.log
```

#### **Performance Monitoring**
```bash
# Monitor system resources
top -p $(pgrep -f downloader)
free -h
df -h

# Monitor network
ping -c 3 google.com
curl -I https://www.google.com
```

---

## 📊 Performance Optimization

### System Optimization

#### **Memory Management**
```typescript
// Set Node.js memory limits
export NODE_OPTIONS="--max-old-space-size=512"

// Monitor memory usage
const used = process.memoryUsage();
console.log('Memory usage:', used);
```

#### **Database Optimization**
```typescript
// Optimize SQLite settings
const db = new sqlite3.Database('./database.sqlite', {
  cache_size: 10000,
  journal_mode: 'WAL'
});
```

#### **Network Optimization**
```typescript
// Set appropriate timeouts
const timeout = 10000; // 10 seconds
const retries = 3;
```

### Performance Monitoring

#### **Key Metrics**
- **Memory Usage**: < 100MB (normal), > 200MB (high)
- **CPU Usage**: < 50% (normal), > 80% (high)
- **Network Latency**: < 500ms (good), > 1000ms (poor)
- **Recovery Time**: < 500ms (fast), > 1000ms (slow)

#### **Monitoring Tools**
```bash
# System monitoring
htop
iotop
nethogs

# Application monitoring
npm run network:check
npm run db:view
npm run recovery:test
```

---

## 🔄 Maintenance Tasks

### Daily Tasks

#### **Health Checks**
```bash
# Check service status
systemctl status downloader

# Test network connectivity
npm run network:check

# Verify database
npm run db:view
```

#### **Log Review**
```bash
# Check for errors
journalctl -u downloader --since "1 hour ago" | grep ERROR

# Check performance
journalctl -u downloader --since "1 hour ago" | grep "slow"
```

### Weekly Tasks

#### **System Maintenance**
```bash
# Update system packages
sudo apt update && sudo apt upgrade

# Clean old logs
sudo journalctl --vacuum-time=7d

# Check disk space
df -h
```

#### **Application Maintenance**
```bash
# Test recovery mechanisms
npm run recovery:test

# Check database integrity
npm run db:query "PRAGMA integrity_check"

# Clean old downloads
npm run download:clean
```

### Monthly Tasks

#### **Full System Check**
```bash
# Run comprehensive tests
npm run crash:test
npm run recovery:test
npm run network:check

# Review performance metrics
# Analyze error rates
# Update documentation
```

---

## 📚 Learning Resources

### Documentation
- **README.md**: Quick start and overview
- **API_REFERENCE.md**: Complete API documentation
- **TESTING_GUIDE.md**: Testing strategies and procedures
- **DEPLOYMENT_GUIDE.md**: Production deployment guide

### Code Examples
- **Service Patterns**: Follow existing service patterns
- **Error Handling**: Use try-catch blocks and proper logging
- **Testing**: Write tests for new features
- **Documentation**: Update docs when adding features

### Best Practices
- **Code Style**: Follow existing code patterns
- **Error Handling**: Provide clear error messages
- **Logging**: Use appropriate log levels
- **Testing**: Test all new features
- **Documentation**: Keep docs up to date

---

## 🤝 Team Collaboration

### Code Review Process
1. **Create Feature Branch**: `git checkout -b feature/new-feature`
2. **Implement Changes**: Follow coding standards
3. **Write Tests**: Add tests for new functionality
4. **Update Documentation**: Update relevant docs
5. **Create Pull Request**: Include description and tests
6. **Code Review**: Team reviews and approves
7. **Merge**: Merge to main branch

### Communication
- **Daily Standups**: Discuss progress and blockers
- **Code Reviews**: Provide constructive feedback
- **Documentation**: Keep team informed of changes
- **Testing**: Share test results and issues

### Knowledge Sharing
- **Documentation**: Keep docs current and comprehensive
- **Code Comments**: Explain complex logic
- **Examples**: Provide usage examples
- **Training**: Share knowledge with team members

---

## 🚀 Future Enhancements

### Planned Features
- **REST API**: HTTP endpoints for remote management
- **Web Dashboard**: Web-based monitoring interface
- **Alerting**: Email/SMS notifications for failures
- **Metrics**: Prometheus/Grafana integration
- **Clustering**: Multi-node deployment support

### Contribution Guidelines
- **Feature Requests**: Create GitHub issues
- **Bug Reports**: Include reproduction steps
- **Code Contributions**: Follow contribution guidelines
- **Documentation**: Help improve docs

---

## 🆘 Getting Help

### Internal Resources
- **Team Chat**: Ask questions in team channels
- **Code Reviews**: Get feedback from peers
- **Documentation**: Check existing docs first
- **Examples**: Look at existing code patterns

### External Resources
- **Node.js Docs**: https://nodejs.org/docs/
- **NestJS Docs**: https://docs.nestjs.com/
- **SQLite Docs**: https://www.sqlite.org/docs.html
- **GitHub Issues**: Report bugs and request features

### Escalation Process
1. **Check Documentation**: Review relevant docs
2. **Ask Team**: Post in team chat
3. **Create Issue**: If it's a bug or feature request
4. **Escalate**: If urgent, contact team lead

---

**👥 Team Ready - Collaborate and Build Together!**
