# 🚀 Quick Start Guide

## 5-Minute Setup

### 1. **Install & Setup**
```bash
# Install dependencies
npm install

# Run one-time migration
npm run migrate:sqlite

# Test system
npm run network:check
```

### 2. **Basic Download**
```bash
# Download with connectivity check
npm run download
```

### 3. **View Results**
```bash
# See download history
npm run db:view
```

## 🎯 Common Commands

### **Daily Operations**
```bash
npm run download          # Download updates
npm run network:check     # Check connectivity
npm run db:view          # View database
```

### **Troubleshooting**
```bash
npm run test:offline     # Test offline behavior
npm run recovery:test    # Test recovery
npm run download:clean   # Clean database
```

### **Advanced Testing**
```bash
npm run crash:simulate network_timeout
npm run crash:test
npm run db:query "SELECT * FROM downloads"
```

## 🔧 Configuration

### **Environment Setup**
```bash
# Debug mode
export DEBUG=true

# Custom database location
export DATABASE_FILE=./custom-db.sqlite
```

### **Manifest File** (`manifest.json`)
```json
{
  "version": "1.0.0",
  "artifact": "https://example.com/update.pdf",
  "checksum": "sha256:abc123...",
  "description": "Software update",
  "format": "pdf"
}
```

## 🚨 Quick Troubleshooting

| Issue | Command | Solution |
|-------|---------|----------|
| No internet | `npm run network:check` | Check WiFi/cable |
| Download fails | `npm run download:debug` | Check logs |
| Database error | `npm run db:view` | Check permissions |
| Process crash | `npm run recovery:test` | Auto-recovery |

## 📊 Status Indicators

- 🟢 **ONLINE**: Ready for downloads
- 🟡 **PARTIAL**: Some issues, may work
- 🔴 **OFFLINE**: No internet connection
- ✅ **SUCCESS**: Operation completed
- ❌ **FAILED**: Check error messages

## 🎯 Next Steps

1. **Test System**: Run `npm run network:check`
2. **Download Update**: Run `npm run download`
3. **Verify Success**: Run `npm run db:view`
4. **Monitor Health**: Regular `npm run network:check`

**Ready to go! 🚀**
