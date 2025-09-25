# 🚀 Deployment Guide

## Production Deployment

This guide covers deploying the IoT Downloader System to production environments.

## 📋 Prerequisites

### System Requirements
- **OS**: Linux (Ubuntu 20.04+), Windows 10+, macOS 10.15+
- **Node.js**: 18.0+ (LTS recommended)
- **Memory**: 512MB+ RAM
- **Storage**: 1GB+ free space
- **Network**: Internet connectivity

### Dependencies
- SQLite3 (included with Node.js)
- Network access to download endpoints
- File system write permissions

---

## 🏗️ Installation

### 1. **System Setup**

#### Ubuntu/Debian
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

#### CentOS/RHEL
```bash
# Install Node.js 18+
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Verify installation
node --version
npm --version
```

#### Windows
```bash
# Download and install Node.js from https://nodejs.org/
# Or use Chocolatey
choco install nodejs

# Verify installation
node --version
npm --version
```

### 2. **Application Deployment**

#### Clone Repository
```bash
# Clone the repository
git clone <repository-url>
cd nest-downloader

# Install dependencies
npm install --production
```

#### Configuration
```bash
# Create environment file
cat > .env << EOF
DEBUG=false
DATABASE_FILE=./database.sqlite
MANIFEST_FILE=./manifest.json
DOWNLOAD_DIR=./downloads
EOF
```

#### Database Setup
```bash
# Run one-time migration
npm run migrate:sqlite

# Verify database
npm run db:view
```

---

## 🔧 Configuration

### Environment Variables

#### Production Settings
```bash
# .env file
DEBUG=false
DATABASE_FILE=/opt/downloader/database.sqlite
MANIFEST_FILE=/opt/downloader/manifest.json
DOWNLOAD_DIR=/opt/downloader/downloads
```

#### Development Settings
```bash
# .env file
DEBUG=true
DATABASE_FILE=./database.sqlite
MANIFEST_FILE=./manifest.json
DOWNLOAD_DIR=./downloads
```

### Manifest Configuration

#### Production Manifest
```json
{
  "version": "1.0.0",
  "artifact": "https://cdn.company.com/updates/software-v1.0.0.bin",
  "checksum": "sha256:abc123def456...",
  "description": "Production software update",
  "lastUpdated": "2024-01-15T10:30:00.000Z",
  "size": 52428800,
  "format": "bin"
}
```

#### Development Manifest
```json
{
  "version": "1.0.0-dev",
  "artifact": "https://docs.google.com/document/d/1RG1COGb24-t7O1PiLyUH1CV3dajLHO3dCnCbRDCnZ3g/edit?usp=sharing",
  "checksum": "sha256:0cd3cc003012b315c6f143700920bd1c555c3bf45e12b9ab417f67fa34ecd282",
  "description": "Test document for downloader POC",
  "lastUpdated": "2024-01-15T10:30:00.000Z",
  "size": 0,
  "format": "pdf"
}
```

---

## 🚀 Deployment Methods

### 1. **Direct Deployment**

#### Manual Installation
```bash
# Create application directory
sudo mkdir -p /opt/downloader
cd /opt/downloader

# Copy application files
sudo cp -r /path/to/nest-downloader/* .

# Set permissions
sudo chown -R downloader:downloader /opt/downloader
sudo chmod +x /opt/downloader/src/cli/simple-downloader.ts

# Create systemd service
sudo tee /etc/systemd/system/downloader.service << EOF
[Unit]
Description=IoT Downloader Service
After=network.target

[Service]
Type=simple
User=downloader
WorkingDirectory=/opt/downloader
ExecStart=/usr/bin/node /opt/downloader/src/cli/simple-downloader.ts
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable downloader
sudo systemctl start downloader
```

#### Service Management
```bash
# Check status
sudo systemctl status downloader

# View logs
sudo journalctl -u downloader -f

# Restart service
sudo systemctl restart downloader

# Stop service
sudo systemctl stop downloader
```

### 2. **Docker Deployment**

#### Dockerfile
```dockerfile
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S downloader -u 1001

# Set permissions
RUN chown -R downloader:nodejs /app
USER downloader

# Expose port (if needed)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start application
CMD ["npm", "run", "start:prod"]
```

#### Docker Compose
```yaml
version: '3.8'

services:
  downloader:
    build: .
    container_name: iot-downloader
    restart: unless-stopped
    volumes:
      - ./data:/app/data
      - ./downloads:/app/downloads
      - ./logs:/app/logs
    environment:
      - NODE_ENV=production
      - DEBUG=false
      - DATABASE_FILE=/app/data/database.sqlite
      - MANIFEST_FILE=/app/manifest.json
      - DOWNLOAD_DIR=/app/downloads
    networks:
      - downloader-network

networks:
  downloader-network:
    driver: bridge
```

#### Docker Commands
```bash
# Build image
docker build -t iot-downloader .

# Run container
docker run -d \
  --name iot-downloader \
  --restart unless-stopped \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/downloads:/app/downloads \
  iot-downloader

# View logs
docker logs -f iot-downloader

# Execute commands
docker exec -it iot-downloader npm run db:view
```

### 3. **Kubernetes Deployment**

#### Deployment YAML
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: iot-downloader
  labels:
    app: iot-downloader
spec:
  replicas: 1
  selector:
    matchLabels:
      app: iot-downloader
  template:
    metadata:
      labels:
        app: iot-downloader
    spec:
      containers:
      - name: downloader
        image: iot-downloader:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_FILE
          value: "/app/data/database.sqlite"
        - name: MANIFEST_FILE
          value: "/app/manifest.json"
        - name: DOWNLOAD_DIR
          value: "/app/downloads"
        volumeMounts:
        - name: data-volume
          mountPath: /app/data
        - name: downloads-volume
          mountPath: /app/downloads
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: data-volume
        persistentVolumeClaim:
          claimName: downloader-data-pvc
      - name: downloads-volume
        persistentVolumeClaim:
          claimName: downloader-downloads-pvc
```

#### Persistent Volume Claims
```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: downloader-data-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: downloader-downloads-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
```

---

## 📊 Monitoring

### Health Checks

#### Application Health
```bash
# Check service status
systemctl status downloader

# Test network connectivity
npm run network:check

# Verify database
npm run db:view

# Test recovery mechanisms
npm run recovery:test
```

#### System Health
```bash
# Check system resources
free -h
df -h
top -p $(pgrep -f downloader)

# Check network
ping -c 3 google.com
curl -I https://www.google.com

# Check logs
journalctl -u downloader --since "1 hour ago"
```

### Monitoring Scripts

#### Health Check Script
```bash
#!/bin/bash
# health-check.sh

echo "🔍 IoT Downloader Health Check"
echo "=============================="

# Check service status
if systemctl is-active --quiet downloader; then
    echo "✅ Service: RUNNING"
else
    echo "❌ Service: STOPPED"
    exit 1
fi

# Check network connectivity
cd /opt/downloader
if npm run network:check > /dev/null 2>&1; then
    echo "✅ Network: ONLINE"
else
    echo "❌ Network: OFFLINE"
fi

# Check database
if npm run db:view > /dev/null 2>&1; then
    echo "✅ Database: HEALTHY"
else
    echo "❌ Database: ERROR"
fi

# Check disk space
DISK_USAGE=$(df /opt/downloader | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -lt 80 ]; then
    echo "✅ Disk Space: OK ($DISK_USAGE%)"
else
    echo "⚠️ Disk Space: LOW ($DISK_USAGE%)"
fi

echo "🎯 Health Check Complete"
```

#### Automated Monitoring
```bash
# Add to crontab for regular health checks
# */5 * * * * /opt/downloader/health-check.sh >> /var/log/downloader-health.log
```

---

## 🔒 Security

### File Permissions
```bash
# Set proper permissions
sudo chown -R downloader:downloader /opt/downloader
sudo chmod 755 /opt/downloader
sudo chmod 644 /opt/downloader/*.json
sudo chmod 755 /opt/downloader/src/cli/*.ts
```

### Network Security
```bash
# Configure firewall (if needed)
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### SSL/TLS
```bash
# For HTTPS endpoints, ensure SSL certificates are valid
# Check certificate expiration
openssl x509 -in certificate.crt -text -noout | grep "Not After"
```

---

## 🔄 Updates

### Application Updates
```bash
# Stop service
sudo systemctl stop downloader

# Backup current version
sudo cp -r /opt/downloader /opt/downloader-backup-$(date +%Y%m%d)

# Update application
cd /opt/downloader
git pull origin main
npm install --production

# Run migration if needed
npm run migrate:sqlite

# Start service
sudo systemctl start downloader

# Verify update
npm run network:check
npm run db:view
```

### Database Updates
```bash
# Backup database
cp /opt/downloader/database.sqlite /opt/downloader/database-backup-$(date +%Y%m%d).sqlite

# Run migration
npm run migrate:sqlite

# Verify database
npm run db:view
```

---

## 🚨 Troubleshooting

### Common Issues

#### Service Won't Start
```bash
# Check logs
sudo journalctl -u downloader -f

# Check permissions
ls -la /opt/downloader

# Check dependencies
npm list
```

#### Network Issues
```bash
# Test connectivity
npm run network:check

# Check DNS
nslookup google.com

# Check firewall
sudo ufw status
```

#### Database Issues
```bash
# Check database file
ls -la /opt/downloader/database.sqlite

# Test database
npm run db:view

# Check disk space
df -h /opt/downloader
```

#### Performance Issues
```bash
# Check system resources
top -p $(pgrep -f downloader)
free -h
iostat -x 1

# Check logs for errors
sudo journalctl -u downloader --since "1 hour ago" | grep ERROR
```

### Recovery Procedures

#### Service Recovery
```bash
# Restart service
sudo systemctl restart downloader

# Check status
sudo systemctl status downloader

# View logs
sudo journalctl -u downloader -f
```

#### Database Recovery
```bash
# Test database
npm run db:view

# If corrupted, restore from backup
cp /opt/downloader/database-backup-*.sqlite /opt/downloader/database.sqlite

# Run recovery test
npm run recovery:test
```

#### Full System Recovery
```bash
# Stop service
sudo systemctl stop downloader

# Restore from backup
sudo rm -rf /opt/downloader
sudo cp -r /opt/downloader-backup-* /opt/downloader

# Restore permissions
sudo chown -R downloader:downloader /opt/downloader

# Start service
sudo systemctl start downloader
```

---

## 📈 Performance Tuning

### System Optimization
```bash
# Increase file descriptor limits
echo "* soft nofile 65536" >> /etc/security/limits.conf
echo "* hard nofile 65536" >> /etc/security/limits.conf

# Optimize kernel parameters
echo "net.core.somaxconn = 65536" >> /etc/sysctl.conf
echo "net.ipv4.tcp_max_syn_backlog = 65536" >> /etc/sysctl.conf
sysctl -p
```

### Application Optimization
```bash
# Set Node.js options
export NODE_OPTIONS="--max-old-space-size=512"

# Optimize SQLite
# Add to .env
DATABASE_FILE=./database.sqlite?cache_size=10000&journal_mode=WAL
```

---

## 📋 Maintenance

### Regular Tasks

#### Daily
- [ ] Check service status
- [ ] Monitor disk space
- [ ] Review error logs
- [ ] Test network connectivity

#### Weekly
- [ ] Run health checks
- [ ] Test recovery mechanisms
- [ ] Review performance metrics
- [ ] Update documentation

#### Monthly
- [ ] Full system backup
- [ ] Security updates
- [ ] Performance analysis
- [ ] Capacity planning

### Backup Procedures
```bash
# Create backup script
cat > /opt/downloader/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups/downloader"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup application
tar -czf $BACKUP_DIR/downloader_$DATE.tar.gz /opt/downloader

# Backup database
cp /opt/downloader/database.sqlite $BACKUP_DIR/database_$DATE.sqlite

# Clean old backups (keep 30 days)
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
find $BACKUP_DIR -name "*.sqlite" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR/downloader_$DATE.tar.gz"
EOF

chmod +x /opt/downloader/backup.sh

# Add to crontab
# 0 2 * * * /opt/downloader/backup.sh
```

---

## 🎯 Production Checklist

### Pre-Deployment
- [ ] System requirements met
- [ ] Dependencies installed
- [ ] Configuration verified
- [ ] Security settings applied
- [ ] Monitoring configured
- [ ] Backup procedures tested

### Post-Deployment
- [ ] Service running
- [ ] Network connectivity
- [ ] Database operational
- [ ] Health checks passing
- [ ] Performance acceptable
- [ ] Logs being generated

### Ongoing
- [ ] Regular monitoring
- [ ] Performance tracking
- [ ] Security updates
- [ ] Backup verification
- [ ] Documentation updates

---

**🚀 Production Ready - Deploy with Confidence!**
