# Requirements Document

## Introduction

Application to download videos from OK.ru (Odnoklassniki) with a GUI built in tkinter. The application will manage a queue of video downloads, support multi-threaded or sequential downloads, display progress bars, and handle both public and private videos (with user authentication).

## Glossary

- **OK.ru**: Russian social network and video hosting platform
- **Video URL**: Direct link to a video on OK.ru (e.g., https://m.ok.ru/video/7585686555183)
- **Public Video**: Video accessible without authentication
- **Private Video**: Video requiring user login credentials
- **Download Queue**: List of videos waiting to be or currently being downloaded
- **Multi-threaded Download**: Concurrent download of multiple videos using separate threads
- **Sequential Download**: Download of videos one after another in order
- **Progress Bar**: Visual indicator showing download completion percentage
- **Authentication**: Process of logging into OK.ru with user credentials

## Requirements

### Requirement 1

**User Story:** As a user, I want to enter video URLs, so that I can add them to the download queue

#### Acceptance Criteria

1. WHERE a user enters a video URL in the input field, THE application SHALL validate the URL format and add it to the download queue
2. IF the URL is invalid or already in the queue, THEN THE application SHALL display an error message
3. WHEN the user clicks the "Add to Queue" button, THE application SHALL add the video URL to the queue

### Requirement 2

**User Story:** As a user, I want to search for videos on OK.ru, so that I can find and download videos directly from search results

#### Acceptance Criteria

1. WHERE the main interface is available, THE application SHALL provide a search input field and search button
2. WHEN the user enters a search query and clicks search, THE application SHALL query OK.ru's search API and display results
3. WHERE search results are displayed, THE application SHALL show video title, thumbnail, duration, and author
4. WHEN the user selects a video from search results, THE application SHALL add it to the download queue
5. IF the search returns no results, THEN THE application SHALL display a message indicating no videos were found

### Requirement 3

**User Story:** As a user, I want to manage the download queue, so that I can control which videos to download

#### Acceptance Criteria

1. WHERE the download queue is displayed, THE application SHALL show all queued videos with their status
2. WHEN a user selects a video in the queue, THE application SHALL allow removing it from the queue
3. WHILE videos are in the queue, THE application SHALL display them in the order they were added

### Requirement 4

**User Story:** As a user, I want to configure download settings, so that I can choose how videos are downloaded

#### Acceptance Criteria

1. WHERE download settings are available, THE application SHALL allow selecting between multi-threaded and sequential download modes
2. WHERE multi-threaded mode is selected, THE application SHALL download multiple videos concurrently
3. WHERE sequential mode is selected, THE application SHALL download videos one at a time in order

### Requirement 4

**User Story:** As a user, I want to see download progress, so that I know how the downloads are progressing

#### Acceptance Criteria

1. WHILE a video is downloading, THE application SHALL display a progress bar for that video
2. WHEN a video download completes, THE application SHALL update the status to "Completed"
3. IF a download fails, THEN THE application SHALL display an error status and reason

### Requirement 5

**User Story:** As a user, I want to download private videos, so that I can access all videos I have permission to view

#### Acceptance Criteria

1. WHERE a user wants to download a private video, THE application SHALL prompt for OK.ru login credentials
2. WHEN the user provides valid credentials, THE application SHALL authenticate and maintain a session
3. WHILE authenticated, THE application SHALL download private videos using the authenticated session
4. IF authentication fails, THEN THE application SHALL display an error message and not attempt to download private videos

### Requirement 6

**User Story:** As a user, I want to see download status updates, so that I know what the application is doing

#### Acceptance Criteria

1. WHEN a download starts, THE application SHALL update the status to "Downloading"
2. WHEN a download completes, THE application SHALL update the status to "Completed"
3. WHEN a download fails, THE application SHALL update the status to "Failed" with an error message
4. WHILE waiting in queue, THE application SHALL display status as "Queued"

### Requirement 7

**User Story:** As a user, I want to specify download location, so that I can organize my downloaded videos

#### Acceptance Criteria

1. WHERE download settings are available, THE application SHALL allow selecting a download directory
2. WHEN a video downloads, THE application SHALL save it to the selected directory
3. IF the directory does not exist, THEN THE application SHALL create it automatically

### Requirement 8

**User Story:** As a user, I want to stop downloads, so that I can pause or cancel ongoing downloads

#### Acceptance Criteria

1. WHEN a download is in progress, THE application SHALL provide a "Stop" button
2. WHEN the user clicks "Stop", THE application SHALL halt the current download
3. IF a download is stopped, THEN THE application SHALL mark it as "Stopped" and not resume automatically

### Requirement 9

**User Story:** As a user, I want to load URLs from a text file, so that I can add multiple videos at once

#### Acceptance Criteria

1. WHERE the main interface is available, THE application SHALL provide an option to load URLs from a file
2. WHEN the user selects a text file, THE application SHALL read each line as a video URL and add valid URLs to the queue
3. IF a line contains an invalid URL, THEN THE application SHALL skip it and continue with the remaining lines

### Requirement 10

**User Story:** As a user, I want to select video quality, so that I can choose the best format for my needs

#### Acceptance Criteria

1. WHERE video options are available, THE application SHALL display available quality options (e.g., 360p, 480p, 720p, 1080p)
2. WHEN the user selects a quality, THE application SHALL download the video in that resolution
3. WHERE no quality is selected, THE application SHALL use the highest available quality by default

### Requirement 11

**User Story:** As a user, I want to rename videos before downloading, so that I can organize them meaningfully

#### Acceptance Criteria

1. WHERE a video is in the queue, THE application SHALL allow editing its filename
2. WHEN the user specifies a filename, THE application SHALL save the downloaded video with that name
3. IF no filename is specified, THEN THE application SHALL generate a default name based on the video ID or title

### Requirement 12

**User Story:** As a user, I want the application to be portable and shareable, so that I can use it on different systems

#### Acceptance Criteria

1. WHERE the application is ready for distribution, THE application SHALL be packaged for Linux (`.deb` or AppImage) and Windows (`.exe` installer)
2. WHEN packaged for Windows, THE application SHALL include all required dependencies and create a start menu entry
3. WHEN packaged for Linux, THE application SHALL be installable via standard package managers or as a standalone executable

### Requirement 13

**User Story:** As a user, I want to export and import download queues, so that I can save and restore my download lists

#### Acceptance Criteria

1. WHERE the main interface is available, THE application SHALL provide an option to export the current queue to a file
2. WHEN the user exports the queue, THE application SHALL save it in a structured format (JSON or text) with all video URLs and settings
3. WHERE the main interface is available, THE application SHALL provide an option to import a previously saved queue
4. WHEN the user imports a queue file, THE application SHALL restore all videos and their settings to the queue

### Requirement 14

**User Story:** As a user, I want to download video subtitles, so that I can have accessible content

#### Acceptance Criteria

1. WHERE a video is being downloaded, THE application SHALL check for available subtitle files
2. WHERE subtitles are available, THE application SHALL provide an option to download them in `.srt` format
3. WHEN subtitles are downloaded, THE application SHALL save them with the same base name as the video file

### Requirement 15

**User Story:** As a user, I want download notifications, so that I know when downloads complete

#### Acceptance Criteria

1. WHEN a download completes successfully, THE application SHALL display a desktop notification
2. WHEN all downloads in the queue complete, THE application SHALL display a summary notification
3. WHERE notifications are enabled, THE application SHALL play a sound or show a system alert

### Requirement 16

**User Story:** As a user, I want to view download history, so that I can track completed downloads

#### Acceptance Criteria

1. WHERE the main interface is available, THE application SHALL provide access to download history
2. WHEN viewing history, THE application SHALL display completed downloads with date, time, filename, and status
3. WHERE history is available, THE application SHALL allow clearing old entries

### Requirement 17

**User Story:** As a user, I want to use proxy settings, so that I can download through a proxy server

#### Acceptance Criteria

1. WHERE download settings are available, THE application SHALL allow configuring proxy settings (host, port, type)
2. WHERE proxy settings are configured, THE application SHALL route all downloads through the specified proxy
3. WHERE no proxy is configured, THE application SHALL use direct connection for downloads

### Requirement 18

**User Story:** As a user, I want automatic resume of pending downloads, so that I don't lose progress on interrupted downloads

#### Acceptance Criteria

1. WHEN the application starts, THE application SHALL check for pending or incomplete downloads from the last session
2. WHERE pending downloads are found, THE application SHALL offer to resume them automatically or manually
3. WHEN resuming a download, THE application SHALL continue from where it left off using partial files

### Requirement 19

**User Story:** As a user, I want to select a download directory, so that I can organize my downloaded videos

#### Acceptance Criteria

1. WHERE download settings are available, THE application SHALL provide a button to select a download directory
2. WHERE a directory is selected, THE application SHALL display the full path and use it for all downloads
3. IF the selected directory does not exist, THEN THE application SHALL create it automatically when the first download starts

### Requirement 20

**User Story:** As a user, I want a dark/light theme switch, so that I can choose the interface appearance

#### Acceptance Criteria

1. WHERE the main interface is available, THE application SHALL provide a theme switch toggle
2. WHEN the user switches the theme, THE application SHALL immediately apply the selected theme (dark or light)
3. WHERE a theme is selected, THE application SHALL persist the preference and restore it on next launch

### Requirement 21

**User Story:** As a user, I want a modern and minimalistic interface, so that the application is easy to use and visually appealing

#### Acceptance Criteria

1. WHERE the interface is displayed, THE application SHALL use emerald green (#10b981) as the primary color for buttons, highlights, and active states
2. WHERE the interface is displayed, THE application SHALL use consistent spacing and padding throughout all components
3. WHERE the interface is displayed, THE application SHALL establish clear visual hierarchy with appropriate font sizes, weights, and spacing
4. WHERE the interface is displayed, THE application SHALL use a clean, modern design with rounded corners and subtle shadows

### Requirement 22

**User Story:** As a user, I want a dark theme with intense black background, so that the application is comfortable to use in low-light environments

#### Acceptance Criteria

1. WHERE the dark theme is selected, THE application SHALL use an intense black (#0a0a0a) as the primary background color
2. WHERE the dark theme is selected, THE application SHALL use light gray text (#e5e5e5) for primary content
3. WHERE the dark theme is selected, THE application SHALL use a slightly lighter gray (#1f1f1f) for secondary containers and panels
4. WHERE the dark theme is selected, THE application SHALL use emerald green (#10b981) for interactive elements and highlights

### Requirement 23

**User Story:** As a user, I want a light theme with clean background, so that the application is easy to read in bright environments

#### Acceptance Criteria

1. WHERE the light theme is selected, THE application SHALL use a white or very light gray (#ffffff) as the primary background color
2. WHERE the light theme is selected, THE application SHALL use dark gray text (#1f1f1f) for primary content
3. WHERE the light theme is selected, THE application SHALL use a light gray (#f5f5f5) for secondary containers and panels
4. WHERE the light theme is selected, THE application SHALL use emerald green (#10b981) for interactive elements and highlights
