# 🧪 Testing Guide

## Overview

This guide covers all testing scenarios for the IoT Downloader System, including crash simulation, recovery testing, and network validation.

## 🎯 Test Categories

### 1. **Network Testing**
Tests internet connectivity and network resilience.

### 2. **Crash Testing**
Simulates various failure scenarios and recovery.

### 3. **Database Testing**
Validates SQLite operations and data integrity.

### 4. **Recovery Testing**
Tests process recovery and state restoration.

---

## 🌐 Network Testing

### **Basic Connectivity Test**
```bash
# Check internet connection
npm run network:check
```

**Expected Output:**
```
🟢 Device Status: FULLY ONLINE
✅ All network services are reachable
✅ Ready for software updates
```

### **Offline Simulation**
```bash
# Test offline behavior
npm run test:offline
```

**Expected Output:**
```
🔴 Device Status: OFFLINE
❌ No internet connection available
💡 Check network connection and try again
```

### **Network Performance Test**
```bash
# Check latency and performance
npm run network:check
```

**Metrics to Monitor:**
- Latency: < 500ms (good), > 1000ms (poor)
- Success Rate: 100% (all endpoints reachable)
- Response Time: < 2s (acceptable)

---

## 💥 Crash Testing

### **Crash Scenarios**

#### 1. **Memory Exhaustion**
```bash
npm run crash:simulate memory_exhaustion
```
**What it does:** Allocates memory until heap limit reached
**Expected:** `FATAL ERROR: Reached heap limit`
**Recovery:** Process state saved, can be restored

#### 2. **Network Timeout**
```bash
npm run crash:simulate network_timeout
```
**What it does:** Simulates network connection timeout
**Expected:** `Network timeout - connection lost`
**Recovery:** Network connectivity can be restored

#### 3. **File System Error**
```bash
npm run crash:simulate file_system_error
```
**What it does:** Simulates disk space/permission errors
**Expected:** `ENOSPC: No space left on device`
**Recovery:** File system can be checked and repaired

#### 4. **Process Signal**
```bash
npm run crash:simulate process_signal
```
**What it does:** Simulates SIGTERM/SIGKILL signals
**Expected:** `process.exit(1)`
**Recovery:** Process can be restarted

#### 5. **Timeout Crash**
```bash
npm run crash:simulate infinite_loop
```
**What it does:** Simulates infinite loop timeout
**Expected:** `Operation timeout - process hung`
**Recovery:** Process can be killed and restarted

### **Random Crash Testing**
```bash
npm run crash:simulate random
```
**What it does:** Randomly selects crash scenario
**Use case:** Stress testing and edge case discovery

### **Comprehensive Crash Testing**
```bash
npm run crash:test
```
**What it does:** Runs all crash scenarios with recovery testing
**Expected:** Detailed test results with success rates

---

## 🔄 Recovery Testing

### **Basic Recovery Test**
```bash
npm run recovery:test
```

**Test Scenarios:**
1. **No existing state** - Should handle gracefully
2. **Create process state** - Should save successfully
3. **Update process state** - Should track progress
4. **Recovery with existing state** - Should restore properly
5. **Mark process completed** - Should clean up state
6. **Recovery after completion** - Should handle completed state
7. **Create failed state** - Should handle failures
8. **Recovery with failed state** - Should attempt recovery

**Expected Results:**
- ✅ All recovery tests completed
- ✅ Process state persistence working
- ✅ Recovery mechanisms functional
- ✅ State management robust

### **Recovery Metrics**
- **Recovery Time:** < 500ms (acceptable)
- **Success Rate:** > 95% (excellent)
- **Data Loss:** Minimal (state preserved)
- **Retry Logic:** 3 attempts with backoff

---

## 🗄️ Database Testing

### **View Database State**
```bash
npm run db:view
```

**Expected Output:**
```
📊 SQLite Database Viewer
📋 Database Metadata:
📅 Created: 2025-09-25T08:11:15.654Z
📅 Last Updated: 2025-09-25T08:11:15.654Z
📊 Total Downloads: 3
🏷️ Current Version: 1.2.3
```

### **Custom Database Queries**
```bash
# View all downloads
npm run db:query "SELECT * FROM downloads ORDER BY downloadedAt DESC"

# Download statistics
npm run db:query "SELECT version, COUNT(*) as downloads FROM downloads GROUP BY version"

# Status analysis
npm run db:query "SELECT status, COUNT(*) as count FROM downloads GROUP BY status"
```

### **Database Integrity Tests**
```bash
# Test database operations
npm run download          # Add new record
npm run db:view          # Verify record exists
npm run download:clean   # Clean database
npm run db:view          # Verify cleanup
```

---

## 📊 Test Results Analysis

### **Success Criteria**

#### Network Tests
- ✅ **Connectivity:** All endpoints reachable
- ✅ **Latency:** < 500ms average
- ✅ **Reliability:** 100% success rate
- ✅ **Offline Handling:** Clear error messages

#### Crash Tests
- ✅ **Crash Simulation:** Real crashes occur
- ✅ **Recovery Rate:** > 90% successful recovery
- ✅ **State Preservation:** Data not lost
- ✅ **Retry Logic:** Automatic retry works

#### Database Tests
- ✅ **ACID Properties:** Transactions safe
- ✅ **Data Integrity:** No corruption
- ✅ **Performance:** Fast queries
- ✅ **Cleanup:** Proper state management

### **Performance Benchmarks**

| Test Type | Target | Excellent | Good | Poor |
|-----------|--------|-----------|------|------|
| Network Latency | < 500ms | < 200ms | < 500ms | > 1000ms |
| Recovery Time | < 500ms | < 200ms | < 500ms | > 1000ms |
| Memory Usage | < 100MB | < 50MB | < 100MB | > 200MB |
| Database Size | < 10MB | < 5MB | < 10MB | > 50MB |

---

## 🚨 Troubleshooting Tests

### **Common Test Failures**

#### 1. **Network Test Failures**
```
❌ Network test failed: Connection timeout
```
**Solution:**
- Check internet connection
- Verify firewall settings
- Test with different endpoints

#### 2. **Crash Test Failures**
```
❌ Crash simulation failed: Process not crashed
```
**Solution:**
- Check system resources
- Verify crash scenarios
- Review error logs

#### 3. **Recovery Test Failures**
```
❌ Recovery failed: State not restored
```
**Solution:**
- Check file permissions
- Verify database connection
- Review state files

#### 4. **Database Test Failures**
```
❌ Database error: SQLite connection failed
```
**Solution:**
- Check disk space
- Verify file permissions
- Test database integrity

### **Debug Mode Testing**
```bash
# Enable detailed logging
DEBUG=true npm run crash:test
DEBUG=true npm run recovery:test
DEBUG=true npm run network:check
```

---

## 📈 Continuous Testing

### **Automated Testing Script**
```bash
#!/bin/bash
# daily-tests.sh

echo "🧪 Running Daily Tests..."

# Network tests
echo "🌐 Testing network connectivity..."
npm run network:check

# Database tests
echo "🗄️ Testing database operations..."
npm run db:view

# Recovery tests
echo "🔄 Testing recovery mechanisms..."
npm run recovery:test

# Crash tests (lightweight)
echo "💥 Testing crash scenarios..."
npm run crash:simulate network_timeout

echo "✅ Daily tests completed!"
```

### **Test Schedule**
- **Daily:** Network and database health checks
- **Weekly:** Full recovery testing
- **Monthly:** Comprehensive crash testing
- **Before Deployment:** Full test suite

---

## 🎯 Test Best Practices

### **Before Testing**
1. **Backup Data:** Save important state files
2. **Check Resources:** Ensure adequate disk space and memory
3. **Network Status:** Verify internet connectivity
4. **Clean Environment:** Start with clean database

### **During Testing**
1. **Monitor Logs:** Watch for error messages
2. **Check Resources:** Monitor CPU and memory usage
3. **Verify Results:** Confirm expected outcomes
4. **Document Issues:** Note any failures or anomalies

### **After Testing**
1. **Clean Up:** Remove test data and temporary files
2. **Review Results:** Analyze test outcomes
3. **Report Issues:** Document any problems found
4. **Update Documentation:** Keep guides current

---

## 🚀 Production Testing

### **Pre-Deployment Checklist**
- [ ] Network connectivity tests pass
- [ ] Database operations work correctly
- [ ] Recovery mechanisms function properly
- [ ] Crash scenarios handled gracefully
- [ ] Performance meets requirements
- [ ] Error messages are user-friendly
- [ ] Logging provides adequate debugging info

### **Post-Deployment Monitoring**
- [ ] Regular health checks
- [ ] Performance monitoring
- [ ] Error rate tracking
- [ ] Recovery success rates
- [ ] User feedback collection

**Ready for production! 🚀**
