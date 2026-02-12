# Data Persistence in Klyp Video Downloader

## Overview

Klyp stores application data securely in the user's home directory using JSON files. All data is stored in plain text JSON format for transparency and easy debugging.

## Storage Locations

### Configuration Directory
```
~/.config/klyp/
```

All application data is stored in this directory, which is created automatically on first run.

### Files

#### 1. Settings File
**Location:** `~/.config/klyp/settings.json`

**Purpose:** Stores user preferences and configuration

**Format:** JSON

**Contents:**
- Download directory path
- Theme preference (dark/light)
- Download mode (sequential/parallel)
- Proxy settings
- Subtitle preferences
- Notification settings
- Auto-resume preference
- Advanced yt-dlp settings
- OpenSubtitles credentials
- Search enhancement settings

**Security:** 
- File permissions: 0644 (readable by user, not writable by others)
- Passwords are stored in plain text (consider encryption in future)
- API keys are stored in plain text

**Example:**
```json
{
  "download_directory": "/home/user/Downloads/Klyp",
  "theme": "dark",
  "download_mode": "sequential",
  "notifications_enabled": true,
  "auto_resume": true,
  "os_username": "user@example.com",
  "os_password": "password123",
  "os_api_key": "FNyoC96mlztsk3ALgNdhfSNapfFY9lOi"
}
```

#### 2. Pending Downloads File
**Location:** `~/.config/klyp/pending_downloads.json`

**Purpose:** Stores incomplete downloads for auto-resume on next startup

**Format:** JSON array of download tasks

**Contents:**
- Task ID
- Video URL
- Video metadata (title, author, duration, thumbnail)
- Selected quality
- Download path
- Status (queued, downloading, stopped)
- Progress percentage
- Creation timestamp

**Behavior:**
- Automatically saved when downloads are in progress
- Automatically deleted when all downloads complete
- Loaded on startup if auto-resume is enabled
- User can choose to resume or discard on startup

**Example:**
```json
[
  {
    "id": "f7a8aabd-5c2c-4a1a-8265-f01180f4022e",
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "title": "Example Video",
    "author": "Example Channel",
    "duration": 213,
    "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    "selected_quality": "best",
    "filename": "Example Video.mp4",
    "download_subtitles": false,
    "download_path": "/home/user/Downloads/Klyp",
    "status": "queued",
    "progress": 0.0,
    "created_at": "2026-02-12T02:21:00.000000"
  }
]
```

#### 3. Session Files
**Location:** `~/.config/klyp/cookies/`

**Purpose:** Stores authentication cookies for platforms that require login

**Files:**
- `ok_cookies.txt` - OK.ru authentication cookies (Netscape format)
- `session.json` - Session metadata

**Security:**
- Cookies are stored in plain text
- File permissions: 0600 (readable/writable only by user)

## Data Flow

### On Application Startup

1. **Load Settings**
   - Read `settings.json`
   - Merge with default settings
   - Apply theme and preferences

2. **Check Auto-Resume**
   - If enabled, check for `pending_downloads.json`
   - If found, show resume dialog
   - User chooses to resume or discard

3. **Restore Queue**
   - If user chooses resume, load tasks from file
   - Reset "downloading" status to "queued"
   - Add tasks to queue manager

### During Operation

1. **Settings Changes**
   - Immediately saved to `settings.json`
   - No caching, always written to disk

2. **Download Progress**
   - Periodically save pending downloads
   - Update task status and progress
   - Save on status changes (queued → downloading → completed)

3. **Queue Operations**
   - Add/remove tasks update in-memory queue
   - Pending downloads file updated when downloads start/stop

### On Application Shutdown

1. **Save Pending Downloads**
   - Save all queued, downloading, or stopped tasks
   - Delete file if no pending tasks

2. **Save Settings**
   - Ensure all settings are persisted

3. **Clean Up**
   - Close file handles
   - Remove temporary files

## Security Considerations

### Current Implementation

✅ **Good:**
- Data stored in user's home directory (not system-wide)
- JSON format is human-readable and auditable
- No sensitive data in logs
- File permissions restrict access to user only

⚠️ **Needs Improvement:**
- Passwords stored in plain text
- API keys stored in plain text
- No encryption at rest
- No secure credential storage

### Recommended Improvements

1. **Use System Keyring**
   - Store passwords in system keyring (keyring library)
   - Use OS-native credential storage
   - Encrypt sensitive data at rest

2. **Encrypt Sensitive Fields**
   - Use cryptography library
   - Encrypt passwords and API keys
   - Store encryption key in system keyring

3. **Secure File Permissions**
   - Set restrictive permissions on config files (0600)
   - Verify permissions on startup
   - Warn user if permissions are too open

4. **Data Validation**
   - Validate JSON structure on load
   - Sanitize user input before saving
   - Handle corrupted files gracefully

## Export/Import Features

### Queue Export
- Export queue to JSON file
- User chooses location
- Includes all task metadata

### Queue Import
- Import queue from JSON file
- Validates task structure
- Skips duplicate URLs

### Settings Backup
- Manual backup of settings.json
- Restore from backup
- Reset to defaults option

## Future Enhancements

1. **Database Migration**
   - Consider SQLite for better performance
   - Maintain JSON export for compatibility

2. **Cloud Sync**
   - Optional cloud backup of settings
   - Sync queue across devices

3. **History Tracking**
   - Store completed downloads in database
   - Track download statistics
   - Search and filter history

4. **Secure Vault**
   - Encrypted storage for credentials
   - Master password protection
   - Biometric authentication support
