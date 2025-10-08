# 📊 Visual Diagrams - Installer Application

This document contains all the visual diagrams from the LLD in a format that can be easily viewed in any Markdown viewer.

## 🏗️ Architecture Overview

```mermaid
graph TB
    subgraph "CDN Layer"
        MG[Manifest Gateway<br/>• Version Control<br/>• Checksum Verify<br/>• Metadata Mgmt]
        AG[Artifact Gateway<br/>• Package Storage<br/>• CDN Distribution<br/>• Rate Limiting]
        AUTH[Auth Gateway<br/>• JWT/OAuth<br/>• Token Mgmt<br/>• Expiry]
    end
    
    subgraph "Edge Layer (Port 3000)"
        subgraph "Core Components"
            CC[Control Center<br/>• Orchestration<br/>• State Mgmt<br/>• Event Handling]
            DE[Download Engine<br/>• Artifact Fetch<br/>• Checksum Verify<br/>• Retry Logic]
            IE[Installer Engine<br/>• Package Deploy<br/>• Service Mgmt<br/>• Health Check]
        end
        
        subgraph "Support Services"
            MON[Monitoring<br/>• Metrics Collect<br/>• Health Check<br/>• Alert System]
            LOG[Logger<br/>• Log Rotation<br/>• Cloud Sync<br/>• Compression]
            RETRY[Retry Manager<br/>• Backoff<br/>• Circuit Brk<br/>• Timeout]
            RB[Rollback Manager<br/>• Green Blue<br/>• Port Swapping<br/>• Health Check]
        end
        
        subgraph "Self Monitoring"
            METRICS[Metrics Collector<br/>• CPU Usage<br/>• Memory Usage<br/>• Network Stats]
            HEARTBEAT[Heartbeat Service<br/>• Health Pings<br/>• Status Updates<br/>• Connectivity]
            ERRORS[Error Tracker<br/>• Error Logging<br/>• Alert Generation<br/>• Recovery]
        end
    end
    
    MG --> CC
    AG --> DE
    AUTH --> MG
    CC --> DE
    CC --> IE
    CC --> MON
    CC --> LOG
    DE --> RETRY
    IE --> RB
    MON --> METRICS
    MON --> HEARTBEAT
    MON --> ERRORS
    
    classDef cdnClass fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef coreClass fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef supportClass fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    classDef monitorClass fill:#fff3e0,stroke:#e65100,stroke-width:2px
    
    class MG,AG,AUTH cdnClass
    class CC,DE,IE coreClass
    class MON,LOG,RETRY,RB supportClass
    class METRICS,HEARTBEAT,ERRORS monitorClass
```

## 🔄 Main Update Flow

```mermaid
sequenceDiagram
    participant User as User/System
    participant CC as Control Center
    participant MG as Manifest Gateway
    participant DE as Download Engine
    participant IE as Installer Engine
    participant SM as Service Manager
    participant HC as Health Checker
    participant MON as Monitoring
    
    User->>CC: Trigger Update Check
    CC->>MG: fetchLatestManifest()
    MG-->>CC: Manifest Data
    CC->>CC: checkForUpdate()
    
    alt Update Available
        CC->>DE: downloadArtifact(manifest)
        DE->>DE: Verify Checksum
        DE-->>CC: DownloadResult
        
        CC->>IE: installPackage(manifest, packagePath)
        IE->>SM: installService(serviceName, appPath)
        SM-->>IE: ServiceResult
        
        IE->>HC: performHealthCheck()
        HC-->>IE: HealthStatus
        
        alt Health Check Passed
            IE-->>CC: InstallResult (Success)
            CC->>MON: Update Metrics
        else Health Check Failed
            IE->>IE: Initiate Rollback
            IE-->>CC: InstallResult (Failed)
        end
        
        CC->>CC: updateState()
        CC-->>User: Update Complete
    else No Update Available
        CC-->>User: Already Up to Date
    end
```

## 🚨 Error Recovery Flow

```mermaid
sequenceDiagram
    participant CC as Control Center
    participant RM as Retry Manager
    participant RB as Rollback Manager
    participant AL as Alert Manager
    participant MON as Monitoring
    
    CC->>CC: detectError()
    CC->>RM: shouldRetry(error)
    
    alt Should Retry
        RM-->>CC: RetryConfig
        CC->>CC: retryOperation()
        
        alt Retry Success
            CC->>MON: Log Success
        else Retry Failed
            CC->>CC: detectError()
        end
    else Max Retries Reached
        CC->>RB: initiateRollback()
        RB->>RB: Stop Current Service
        RB->>RB: Restore Previous Version
        RB->>RB: Start Previous Service
        RB-->>CC: RollbackResult
        
        alt Rollback Success
            CC->>MON: Log Rollback Success
        else Rollback Failed
            CC->>AL: sendAlert(criticalError)
            AL->>AL: Send Notifications
            AL-->>CC: AlertSent
        end
    end
```

## 📊 Monitoring Flow

```mermaid
sequenceDiagram
    participant MC as Metrics Collector
    participant LM as Log Manager
    participant AM as Alert Manager
    participant CS as Cloud Sync
    participant DB as Database
    
    loop Every 30 seconds
        MC->>MC: collectSystemMetrics()
        MC->>MC: collectApplicationMetrics()
        MC->>MC: collectNetworkMetrics()
        
        MC->>LM: logMetrics(metrics)
        LM->>DB: storeMetrics(metrics)
        
        MC->>AM: evaluateRules(metrics)
        
        alt Alert Triggered
            AM->>AM: sendAlert(alert)
            AM->>DB: storeAlert(alert)
        end
        
        LM->>CS: syncToCloud()
        CS-->>LM: SyncResult
        
        alt Sync Success
            LM->>LM: markAsSynced()
        else Sync Failed
            LM->>LM: scheduleRetry()
        end
    end
```

## 🔐 Authentication Flow

```mermaid
sequenceDiagram
    participant App as Application
    participant AM as Auth Manager
    participant CDN as CDN Gateway
    participant JWT as JWT Validator
    
    App->>AM: authenticate(credentials)
    AM->>CDN: requestToken(credentials)
    CDN-->>AM: JWT Token
    
    AM->>JWT: validateToken(token)
    JWT-->>AM: ValidationResult
    
    alt Token Valid
        AM-->>App: AuthResult (Success)
        App->>App: storeToken(token)
    else Token Invalid
        AM->>AM: refreshToken()
        AM->>CDN: refreshTokenRequest()
        CDN-->>AM: New Token
        AM-->>App: AuthResult (Refreshed)
    end
    
    loop Every Request
        App->>AM: getAuthHeaders()
        AM-->>App: Headers with Token
    end
```

## 🏗️ Class Hierarchy

```mermaid
classDiagram
    class IService {
        <<interface>>
        +initialize() Promise~void~
        +shutdown() Promise~void~
        +getStatus() ServiceStatus
    }
    
    class BaseService {
        #logger: ILogger
        #status: ServiceStatus
        +initialize() Promise~void~
        +shutdown() Promise~void~
        #onInitialize() Promise~void~*
        #onShutdown() Promise~void~*
    }
    
    class IDownloader {
        <<interface>>
        +download(url, dest, options) Promise~DownloadResult~
        +verifyChecksum(file, checksum, algo) Promise~boolean~
        +calculateChecksum(file, algo) Promise~string~
    }
    
    class BaseDownloader {
        #retryHandler: IRetryHandler
        #eventPublisher: IEventPublisher
        #progressTracker: IProgressTracker
        +download(url, dest, options) Promise~DownloadResult~
        #performDownload() Promise~DownloadResult~*
    }
    
    class HttpDownloader {
        -httpClient: IHttpClient
        -rateLimiter: IRateLimiter
        +performDownload() Promise~DownloadResult~
        +calculateChecksum() Promise~string~
    }
    
    class IInstaller {
        <<interface>>
        +install(package, target, options) Promise~InstallResult~
        +uninstall(serviceName) Promise~UninstallResult~
        +rollback(version) Promise~RollbackResult~
    }
    
    class BaseInstaller {
        #serviceManager: IServiceManager
        #healthChecker: IHealthChecker
        #rollbackManager: IRollbackManager
        +install(package, target, options) Promise~InstallResult~
        #validatePackage() Promise~void~*
        #extractPackage() Promise~string~*
    }
    
    class WindowsServiceInstaller {
        -nssmService: INssmService
        -registryManager: IRegistryManager
        +validatePackage() Promise~void~
        +extractPackage() Promise~string~
    }
    
    IService <|-- BaseService
    BaseService <|-- BaseDownloader
    BaseService <|-- BaseInstaller
    IDownloader <|-- BaseDownloader
    BaseDownloader <|-- HttpDownloader
    IInstaller <|-- BaseInstaller
    BaseInstaller <|-- WindowsServiceInstaller
```

## 🔄 Event System Architecture

```mermaid
graph TB
    subgraph "Event Publishers"
        DE[Download Engine]
        IE[Installer Engine]
        MON[Monitoring]
        CC[Control Center]
    end
    
    subgraph "Event Bus"
        EB[Event Bus<br/>• Event Queue<br/>• Subscriber Mgmt<br/>• Event Routing]
    end
    
    subgraph "Event Subscribers"
        LH[Log Handler]
        MH[Metrics Handler]
        AH[Alert Handler]
        PH[Progress Handler]
    end
    
    subgraph "Event Types"
        E1[Download Events<br/>• Started<br/>• Completed<br/>• Failed]
        E2[Install Events<br/>• Started<br/>• Completed<br/>• Failed]
        E3[System Events<br/>• Health Changed<br/>• Alert Triggered]
        E4[Progress Events<br/>• Update<br/>• Complete]
    end
    
    DE --> EB
    IE --> EB
    MON --> EB
    CC --> EB
    
    EB --> LH
    EB --> MH
    EB --> AH
    EB --> PH
    
    EB --> E1
    EB --> E2
    EB --> E3
    EB --> E4
    
    classDef publisherClass fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef busClass fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef subscriberClass fill:#e8f5e8,stroke:#388e3c,stroke-width:2px
    classDef eventClass fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    
    class DE,IE,MON,CC publisherClass
    class EB busClass
    class LH,MH,AH,PH subscriberClass
    class E1,E2,E3,E4 eventClass
```

## 🗄️ Database Schema

```mermaid
erDiagram
    DOWNLOADS {
        string id PK
        string version
        string artifact
        string expected_checksum
        string actual_checksum
        string file_path
        string file_name
        int file_size
        datetime downloaded_at
        string status
        string description
        string type
        string platform
        datetime created_at
        datetime updated_at
    }
    
    SERVICES {
        string id PK
        string name UK
        string version
        string status
        string install_path
        string config_path
        datetime created_at
        datetime updated_at
    }
    
    EVENTS {
        string id PK
        string type
        string source
        string data
        datetime timestamp
    }
    
    METRICS {
        string id PK
        string type
        string name
        float value
        string unit
        string tags
        datetime timestamp
    }
    
    ALERTS {
        string id PK
        string rule_id
        string severity
        string message
        string status
        datetime created_at
        datetime resolved_at
    }
    
    METADATA {
        string key PK
        string value
        datetime created_at
        datetime updated_at
    }
    
    DOWNLOADS ||--o{ SERVICES : "creates"
    EVENTS ||--o{ METRICS : "generates"
    METRICS ||--o{ ALERTS : "triggers"
```

## 🚀 Deployment Architecture

```mermaid
graph TB
    subgraph "Load Balancer"
        LB[Nginx<br/>• SSL Termination<br/>• Load Balancing<br/>• Health Checks]
    end
    
    subgraph "Application Tier"
        APP1[Installer App 1<br/>Port 3001]
        APP2[Installer App 2<br/>Port 3002]
        APP3[Installer App 3<br/>Port 3003]
    end
    
    subgraph "Data Tier"
        DB[(SQLite Database<br/>• Downloads<br/>• Services<br/>• Metrics)]
        FS[File System<br/>• Artifacts<br/>• Logs<br/>• Configs]
    end
    
    subgraph "External Services"
        CDN[CDN Gateway<br/>• Manifests<br/>• Artifacts<br/>• Auth]
        CLOUD[Cloud Storage<br/>• Log Sync<br/>• Metrics<br/>• Backups]
        MONITOR[Monitoring<br/>• Prometheus<br/>• Grafana<br/>• Alerts]
    end
    
    LB --> APP1
    LB --> APP2
    LB --> APP3
    
    APP1 --> DB
    APP2 --> DB
    APP3 --> DB
    
    APP1 --> FS
    APP2 --> FS
    APP3 --> FS
    
    APP1 --> CDN
    APP2 --> CDN
    APP3 --> CDN
    
    APP1 --> CLOUD
    APP2 --> CLOUD
    APP3 --> CLOUD
    
    APP1 --> MONITOR
    APP2 --> MONITOR
    APP3 --> MONITOR
    
    classDef lbClass fill:#e1f5fe,stroke:#01579b,stroke-width:3px
    classDef appClass fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef dataClass fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    classDef externalClass fill:#fff3e0,stroke:#e65100,stroke-width:2px
    
    class LB lbClass
    class APP1,APP2,APP3 appClass
    class DB,FS dataClass
    class CDN,CLOUD,MONITOR externalClass
```

## 📱 Mobile/Web Dashboard View

```mermaid
graph TB
    subgraph "Frontend Dashboard"
        HEADER[Header<br/>• Logo<br/>• Navigation<br/>• User Menu]
        SIDEBAR[Sidebar<br/>• System Status<br/>• Quick Actions<br/>• Navigation]
        MAIN[Main Content]
    end
    
    subgraph "Dashboard Sections"
        OVERVIEW[Overview<br/>• System Health<br/>• Active Downloads<br/>• Recent Activity]
        DOWNLOADS[Downloads<br/>• Download History<br/>• Progress Tracking<br/>• Error Logs]
        INSTALLS[Installations<br/>• Service Status<br/>• Version History<br/>• Rollback Options]
        MONITORING[Monitoring<br/>• Real-time Metrics<br/>• Performance Charts<br/>• Alert History]
        SETTINGS[Settings<br/>• Configuration<br/>• User Management<br/>• System Preferences]
    end
    
    subgraph "Real-time Updates"
        WS[WebSocket<br/>• Live Updates<br/>• Progress Events<br/>• Status Changes]
        API[REST API<br/>• Data Fetching<br/>• CRUD Operations<br/>• Authentication]
    end
    
    HEADER --> MAIN
    SIDEBAR --> MAIN
    
    MAIN --> OVERVIEW
    MAIN --> DOWNLOADS
    MAIN --> INSTALLS
    MAIN --> MONITORING
    MAIN --> SETTINGS
    
    OVERVIEW --> WS
    DOWNLOADS --> WS
    INSTALLS --> WS
    MONITORING --> WS
    
    OVERVIEW --> API
    DOWNLOADS --> API
    INSTALLS --> API
    MONITORING --> API
    SETTINGS --> API
    
    classDef frontendClass fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef sectionClass fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef backendClass fill:#e8f5e8,stroke:#388e3c,stroke-width:2px
    
    class HEADER,SIDEBAR,MAIN frontendClass
    class OVERVIEW,DOWNLOADS,INSTALLS,MONITORING,SETTINGS sectionClass
    class WS,API backendClass
```

---

## 🎨 How to View These Diagrams

### 1. **GitHub/GitLab** (Recommended)
- Upload to a repository
- GitHub automatically renders Mermaid diagrams
- Best for professional presentation

### 2. **Online Mermaid Editors**
- **[Mermaid Live Editor](https://mermaid.live)** - Paste any diagram code
- **[Mermaid Chart](https://www.mermaidchart.com)** - Professional diagramming
- **[Draw.io](https://app.diagrams.net)** - Import Mermaid code

### 3. **VS Code Extensions**
- **Mermaid Preview** extension
- **Markdown Preview Enhanced** extension

### 4. **Browser Extensions**
- **Mermaid Preview** for Chrome/Firefox
- **Markdown Viewer** extensions

### 5. **Documentation Sites**
- **GitBook** - Supports Mermaid
- **Notion** - Supports Mermaid
- **Confluence** - With Mermaid plugin

---

**💡 Pro Tip**: Copy any diagram code and paste it into [Mermaid Live Editor](https://mermaid.live) for instant visualization!
