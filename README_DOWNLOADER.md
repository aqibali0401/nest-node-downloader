# Simple Downloader

A simple downloader service that reads from `manifest.json` and downloads the artifact to the downloads folder.

## Usage

```bash
# Download from manifest.json
npm run download

# Clean database and downloads folder
npm run download:clean

# Show database statistics
npm run download:stats

# Download with debug logging
npm run download:debug
```

## Manifest Format

The `manifest.json` file should contain:

```json
{
  "version": "1.0.5",
  "artifact": "https://docs.google.com/document/d/1RG1COGb24-t7O1PiLyUH1CV3dajLHO3dCnCbRDCnZ3g/edit?usp=sharing",
  "checksum": "sha256:2bacd69b7f2942dfc0a23b20e17648e360f0952bec4e7339c2d38554cbb35fba",
  "description": "Test document for downloader POC",
  "lastUpdated": "2024-01-15T10:30:00.000Z",
  "size": 0,
  "format": "pdf"
}
```

## Features

- ✅ Reads from `manifest.json`
- ✅ Downloads artifact to `./downloads/` folder
- ✅ Google Docs support (converts edit URLs to export URLs)
- ✅ Checksum verification
- ✅ Database storage (JSON file for now)
- ✅ Progress tracking
- ✅ Automatic cleanup of old downloads
- ✅ Redirect handling
- ✅ Database management commands
- ✅ Statistics and monitoring

## Configuration

Environment variables:
- `MANIFEST_FILE` - Path to manifest file (default: `./manifest.json`)
- `DATABASE_FILE` - Path to database file (default: `./database.json`)
- `DOWNLOAD_DIR` - Download directory (default: `./downloads`)
- `DEBUG` - Enable debug logging (default: `false`)

## Database

The downloader stores download records in a JSON database file with the following structure:

```json
{
  "downloads": [
    {
      "id": "uuid",
      "version": "1.0.5",
      "artifact": "https://example.com/file.pdf",
      "expectedChecksum": "sha256:abc123...",
      "actualChecksum": "sha256:abc123...",
      "filePath": "./downloads/file.pdf",
      "fileName": "file.pdf",
      "fileSize": 1024,
      "downloadedAt": "2024-01-15T10:30:00.000Z",
      "status": "verified",
      "description": "Test file"
    }
  ],
  "metadata": {
    "created": "2024-01-15T10:30:00.000Z",
    "lastUpdated": "2024-01-15T10:30:00.000Z",
    "totalDownloads": 1,
    "currentVersion": "1.0.5"
  }
}
```

## File Structure

```
src/
├── modules/
│   └── downloader/
│       ├── downloader.module.ts
│       └── services/
│           └── simple-downloader.service.ts
└── cli/
    └── simple-downloader.ts
```

## Commands

### Download Commands
- `npm run download` - Download from manifest.json
- `npm run download:debug` - Download with debug logging

### Database Commands
- `npm run download:clean` - Clean database and downloads folder
- `npm run download:stats` - Show database statistics

### Clean Command
The clean command removes:
- All files from the downloads folder
- The database.json file
- Resets all download history

### Stats Command
The stats command shows:
- Total downloads count
- Current version
- Last updated timestamp
- Recent download history
- Downloads folder file count

## Future Enhancements

- Move database to SQLite or PostgreSQL
- Add more download options
- Add retry mechanisms
- Add download scheduling
