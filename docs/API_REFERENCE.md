# 📚 API Reference

## Core Services

### NetworkService

Internet connectivity detection and network performance monitoring.

#### Methods

##### `checkConnectivity(): Promise<ConnectivityResult>`
Checks internet connectivity using multiple test endpoints.

**Returns:**
```typescript
interface ConnectivityResult {
  isOnline: boolean;
  latency?: number;
  error?: string;
  testedAt: string;
}
```

**Example:**
```typescript
const result = await networkService.checkConnectivity();
if (result.isOnline) {
  console.log(`Connected with ${result.latency}ms latency`);
} else {
  console.log(`Offline: ${result.error}`);
}
```

##### `checkDomainConnectivity(domain: string): Promise<ConnectivityResult>`
Tests connectivity to a specific domain.

**Parameters:**
- `domain: string` - Domain to test (e.g., "google.com")

**Example:**
```typescript
const result = await networkService.checkDomainConnectivity('google.com');
```

##### `getNetworkStatus(): Promise<NetworkStatus>`
Gets comprehensive network status including multiple endpoints.

**Returns:**
```typescript
interface NetworkStatus {
  general: ConnectivityResult;
  google: ConnectivityResult;
  cloudflare: ConnectivityResult;
}
```

---

### DatabaseService

SQLite database management for download records and metadata.

#### Methods

##### `initialize(): Promise<void>`
Initializes database connection and creates tables.

**Example:**
```typescript
await databaseService.initialize();
```

##### `getAllDownloads(): Promise<DownloadRecord[]>`
Retrieves all download records ordered by download date.

**Returns:**
```typescript
interface DownloadRecord {
  id: string;
  version: string;
  artifact: string;
  expectedChecksum: string;
  actualChecksum: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  downloadedAt: string;
  status: 'verified' | 'checksum_mismatch' | 'failed';
  description: string;
}
```

##### `getLatestDownload(): Promise<DownloadRecord | null>`
Gets the most recent download record.

##### `getDownloadsByVersion(version: string): Promise<DownloadRecord[]>`
Retrieves all downloads for a specific version.

##### `addDownload(download: DownloadRecord): Promise<void>`
Adds a new download record to the database.

**Example:**
```typescript
const download: DownloadRecord = {
  id: 'uuid-123',
  version: '1.0.0',
  artifact: 'https://example.com/file.pdf',
  expectedChecksum: 'abc123',
  actualChecksum: 'abc123',
  filePath: './downloads/file.pdf',
  fileName: 'file.pdf',
  fileSize: 1024000,
  downloadedAt: new Date().toISOString(),
  status: 'verified',
  description: 'Software update'
};

await databaseService.addDownload(download);
```

##### `getMetadata(): Promise<DatabaseMetadata>`
Gets database metadata including totals and current version.

**Returns:**
```typescript
interface DatabaseMetadata {
  created: string;
  lastUpdated: string;
  totalDownloads: number;
  currentVersion: string | null;
}
```

##### `updateCurrentVersion(version: string): Promise<void>`
Updates the current version in metadata.

##### `cleanAllDownloads(): Promise<void>`
Removes all download records and resets metadata.

---

### ProcessRecoveryService

Process state management and crash recovery.

#### Methods

##### `saveProcessState(state: ProcessState): Promise<void>`
Saves process state to disk for recovery.

**Parameters:**
```typescript
interface ProcessState {
  id: string;
  status: 'running' | 'crashed' | 'recovering' | 'completed' | 'failed';
  startTime: string;
  lastUpdate: string;
  currentStep: string;
  progress: number;
  error?: string;
  retryCount: number;
  maxRetries: number;
}
```

##### `loadProcessState(): Promise<ProcessState | null>`
Loads saved process state from disk.

##### `attemptRecovery(): Promise<RecoveryResult>`
Attempts to recover from a crashed process.

**Returns:**
```typescript
interface RecoveryResult {
  success: boolean;
  state: ProcessState;
  recoveryTime: number;
  dataRestored: boolean;
  error?: string;
}
```

##### `createProcessState(processId: string, currentStep: string): ProcessState`
Creates a new process state object.

##### `updateProcessState(state: ProcessState, step: string, progress: number): Promise<void>`
Updates process state with new step and progress.

##### `markProcessCompleted(state: ProcessState): Promise<void>`
Marks process as completed and cleans up state.

##### `markProcessFailed(state: ProcessState, error: string): Promise<void>`
Marks process as failed with error message.

##### `clearProcessState(): Promise<void>`
Removes process state file after completion.

---

### CrashSimulationService

Simulates various crash scenarios for testing.

#### Methods

##### `simulateRandomCrash(): Promise<CrashResult>`
Simulates a random crash scenario based on probability.

**Returns:**
```typescript
interface CrashResult {
  scenario: string;
  crashed: boolean;
  error?: string;
  recoveryTime?: number;
  dataLost?: boolean;
}
```

##### `simulateCrash(scenarioName: string): Promise<CrashResult>`
Simulates a specific crash scenario.

**Available Scenarios:**
- `memory_exhaustion` - Memory allocation crash
- `network_timeout` - Network timeout crash
- `file_system_error` - File system error crash
- `process_signal` - Process signal crash
- `infinite_loop` - Timeout crash

**Example:**
```typescript
const result = await crashService.simulateCrash('memory_exhaustion');
if (result.crashed) {
  console.log(`Crashed: ${result.error}`);
  console.log(`Recovery time: ${result.recoveryTime}ms`);
}
```

##### `getAvailableScenarios(): CrashScenario[]`
Gets list of available crash scenarios.

**Returns:**
```typescript
interface CrashScenario {
  name: string;
  description: string;
  type: 'memory' | 'network' | 'file' | 'process' | 'timeout';
  severity: 'low' | 'medium' | 'high' | 'critical';
  probability: number;
}
```

---

## CLI Commands

### Download Operations

#### `npm run download`
Downloads artifact with full connectivity check.

**Features:**
- Internet connectivity verification
- Version check to prevent duplicates
- Download with progress tracking
- Checksum verification
- Database record creation

#### `npm run download:clean`
Cleans database and downloads folder.

**Actions:**
- Removes all download files
- Clears database records
- Resets metadata
- Maintains directory structure

#### `npm run download:debug`
Downloads with detailed debug logging.

**Additional Output:**
- Network connectivity details
- Database operation logs
- File system operations
- Recovery process details

---

### Network Management

#### `npm run network:check`
Comprehensive network status check.

**Tests:**
- General internet connectivity
- Google services reachability
- Cloudflare services reachability
- Latency measurement
- Status assessment

**Output:**
```
🟢 Device Status: FULLY ONLINE
✅ All network services are reachable
✅ Ready for software updates
```

#### `npm run test:offline`
Tests offline behavior and error handling.

**Simulates:**
- No internet connection
- Network timeouts
- DNS resolution failures
- Connection errors

---

### Database Management

#### `npm run db:view`
Displays all database records in formatted view.

**Shows:**
- Download metadata
- Individual download records
- Version statistics
- Status summaries

#### `npm run db:query "SQL_QUERY"`
Executes custom SQL queries on the database.

**Examples:**
```bash
# View all downloads
npm run db:query "SELECT * FROM downloads"

# Download statistics
npm run db:query "SELECT version, COUNT(*) as downloads FROM downloads GROUP BY version"

# Status analysis
npm run db:query "SELECT status, COUNT(*) as count FROM downloads GROUP BY status"
```

---

### Crash Testing

#### `npm run crash:simulate <scenario>`
Simulates specific crash scenarios.

**Scenarios:**
- `memory_exhaustion` - Memory allocation crash
- `network_timeout` - Network timeout crash
- `file_system_error` - File system error crash
- `process_signal` - Process signal crash
- `infinite_loop` - Timeout crash
- `random` - Random scenario selection

#### `npm run crash:test`
Comprehensive crash testing suite.

**Tests:**
- All crash scenarios
- Recovery mechanisms
- State persistence
- Error handling
- Performance metrics

#### `npm run recovery:test`
Tests process recovery mechanisms.

**Validates:**
- State creation and saving
- State loading and restoration
- Database recovery
- Network recovery
- File system recovery
- Retry logic

---

## Configuration

### Environment Variables

#### `DEBUG`
Enables detailed debug logging.

```bash
export DEBUG=true
npm run download
```

#### `DATABASE_FILE`
Specifies SQLite database file location.

```bash
export DATABASE_FILE=./custom-db.sqlite
npm run download
```

#### `MANIFEST_FILE`
Specifies manifest file location.

```bash
export MANIFEST_FILE=./custom-manifest.json
npm run download
```

#### `DOWNLOAD_DIR`
Specifies downloads directory.

```bash
export DOWNLOAD_DIR=./custom-downloads
npm run download
```

---

### Manifest Configuration

#### Structure
```json
{
  "version": "1.0.0",
  "artifact": "https://example.com/update.pdf",
  "checksum": "sha256:abc123...",
  "description": "Software update",
  "lastUpdated": "2024-01-15T10:30:00.000Z",
  "size": 1024000,
  "format": "pdf"
}
```

#### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | string | ✅ | Version identifier |
| `artifact` | string | ✅ | Download URL |
| `checksum` | string | ✅ | SHA256 checksum |
| `description` | string | ❌ | Human-readable description |
| `lastUpdated` | string | ❌ | Last update timestamp |
| `size` | number | ❌ | File size in bytes |
| `format` | string | ❌ | File format/extension |

---

## Error Handling

### Common Errors

#### Network Errors
```
❌ No internet connection available
🔌 IoT Device Status: OFFLINE
📡 Network Error: Unable to reach any test servers
```

**Solutions:**
- Check network cable/WiFi connection
- Verify router/internet gateway
- Check firewall settings
- Verify DNS configuration

#### Database Errors
```
❌ Database connection failed
```

**Solutions:**
- Check file permissions
- Verify disk space
- Test SQLite installation
- Review database file integrity

#### Download Errors
```
❌ Download failed: Network timeout
```

**Solutions:**
- Check internet connection
- Verify artifact URL
- Test with different endpoints
- Review firewall settings

#### Process Errors
```
💥 Process crashed: Out of memory
```

**Solutions:**
- System will auto-recover
- Check system resources
- Review error logs
- Monitor memory usage

---

## Performance Metrics

### Benchmarks

| Metric | Target | Excellent | Good | Poor |
|--------|--------|-----------|------|------|
| Network Latency | < 500ms | < 200ms | < 500ms | > 1000ms |
| Recovery Time | < 500ms | < 200ms | < 500ms | > 1000ms |
| Memory Usage | < 100MB | < 50MB | < 100MB | > 200MB |
| Database Size | < 10MB | < 5MB | < 10MB | > 50MB |
| Download Speed | > 1MB/s | > 5MB/s | > 1MB/s | < 100KB/s |

### Monitoring

#### Health Checks
```bash
# System health
npm run network:check
npm run db:view
npm run recovery:test
```

#### Performance Monitoring
- Network latency tracking
- Memory usage monitoring
- Database size tracking
- Recovery success rates
- Error rate analysis

---

## Integration Examples

### Programmatic Usage

#### Basic Download
```typescript
import { SimpleDownloaderService } from './src/modules/downloader/services/simple-downloader.service';

const downloader = new SimpleDownloaderService();
const result = await downloader.downloadFromManifest();

if (result.success) {
  console.log('Download completed successfully');
} else {
  console.log('Download failed:', result.errors);
}
```

#### Network Check
```typescript
import { NetworkService } from './src/core/network/network.service';

const networkService = new NetworkService();
const status = await networkService.getNetworkStatus();

console.log('Network status:', status.general.isOnline ? 'ONLINE' : 'OFFLINE');
```

#### Database Operations
```typescript
import { DatabaseService } from './src/core/database/database.service';

const dbService = new DatabaseService();
await dbService.initialize();

const downloads = await dbService.getAllDownloads();
console.log(`Total downloads: ${downloads.length}`);
```

---

## Troubleshooting

### Debug Mode
```bash
DEBUG=true npm run download
DEBUG=true npm run crash:test
DEBUG=true npm run recovery:test
```

### Log Analysis
- Check console output for error messages
- Review database state with `npm run db:view`
- Test network with `npm run network:check`
- Validate recovery with `npm run recovery:test`

### Common Issues

1. **Network Connectivity**
   - Verify internet connection
   - Check firewall settings
   - Test with different endpoints

2. **Database Issues**
   - Check file permissions
   - Verify disk space
   - Test database integrity

3. **Process Crashes**
   - Monitor system resources
   - Review error logs
   - Test recovery mechanisms

4. **Download Failures**
   - Verify artifact URL
   - Check network connectivity
   - Review error messages

---

**📚 Complete API Reference - Ready for Development!**
