# Advanced Search Operators Guide

This guide explains how to use advanced search operators in Klyp to create precise and powerful search queries.

## Overview

Advanced search operators allow you to refine your video searches using special syntax. These operators work with DuckDuckGo's search engine to filter and target specific content.

## Accessing Advanced Search

1. Open the **Search** tab in Klyp
2. Click the **⚙️ Advanced** button in the filters section
3. The Advanced Search Panel will expand, showing operator input fields

## Available Operators

### Exact Phrase Matching

Match exact phrases by entering them in the "Exact Phrases" field.

**Example:**
- Input: `attack on titan`
- Result: Only videos with the exact phrase "attack on titan" (not "attack titan" or "titan attack")

**Use Case:** Finding specific titles, quotes, or phrases

### Exclude Terms

Exclude unwanted terms from your search results using the "Exclude Terms" field.

**Example:**
- Base Query: `python tutorial`
- Exclude: `beginner`
- Result: Python tutorials excluding beginner-level content

**Use Case:** Filtering out unwanted content, duplicates, or specific topics

### OR Logic

Combine multiple search terms where any match is acceptable using the "OR Terms" field.

**Example:**
- OR Terms: `tutorial, guide, walkthrough`
- Result: Videos containing any of these terms

**Use Case:** Broadening search to include synonyms or related terms

### Must Contain

Require specific terms to be present in all results using the "Must Contain" field.

**Example:**
- Base Query: `javascript`
- Must Contain: `2024, latest`
- Result: JavaScript videos that must include both "2024" and "latest"

**Use Case:** Ensuring critical keywords are present

### Site Filter

Restrict search to specific domains using the "Site" field.

**Example:**
- Site: `youtube.com`
- Result: Only videos from YouTube

**Use Case:** Searching within a specific platform

### File Type Filter

Filter by file extension using the "File Type" field.

**Example:**
- File Type: `mp4`
- Result: Only MP4 video files

**Use Case:** Finding specific file formats

### In Title

Search for terms that must appear in the video title using the "In Title" field.

**Example:**
- In Title: `official`
- Result: Only videos with "official" in the title

**Use Case:** Finding official releases, trailers, or specific content types

### In URL

Search for terms that must appear in the video URL using the "In URL" field.

**Example:**
- In URL: `watch`
- Result: Only videos with "watch" in the URL

**Use Case:** Targeting specific URL patterns or structures

## Combining Operators

You can combine multiple operators for powerful, precise searches.

### Example 1: Finding Official Music Videos

- Base Query: `lofi hip hop`
- Exact Phrases: `official music video`
- Exclude Terms: `remix, cover`
- Site: `youtube.com`

**Result:** Official lofi hip hop music videos from YouTube, excluding remixes and covers

### Example 2: Recent Programming Tutorials

- Base Query: `react hooks`
- Must Contain: `2024`
- In Title: `tutorial`
- Exclude Terms: `beginner, basics`

**Result:** Advanced React hooks tutorials from 2024

### Example 3: Anime Episode Search

- Base Query: `demon slayer`
- Exact Phrases: `season 3`
- In Title: `episode`
- Site: `bilibili.com`

**Result:** Demon Slayer Season 3 episodes from Bilibili

## Tips and Best Practices

### 1. Start Simple, Then Refine
Begin with a basic query and add operators gradually to narrow results.

### 2. Use Exact Phrases for Titles
When searching for specific shows or movies, use exact phrase matching for the title.

### 3. Combine Site Filter with Content Type
Restrict to specific platforms known for certain content types (e.g., Bilibili for anime).

### 4. Exclude Common Noise
Use exclusions to filter out common unwanted terms like "reaction", "review", "trailer" when looking for full content.

### 5. Leverage OR Logic for Synonyms
Include multiple terms that mean the same thing to broaden your search.

### 6. Check the Built Query
The Advanced Search Panel shows the constructed query at the bottom. Review it to ensure it matches your intent.

## Common Search Patterns

### Finding Full Episodes
```
Base Query: [show name]
Exact Phrases: [season X episode Y]
Exclude Terms: preview, trailer, clip
In Title: full, episode
```

### Music Discovery
```
Base Query: [genre or artist]
OR Terms: official, music video, audio
Exclude Terms: reaction, cover, remix
Site: youtube.com, soundcloud.com
```

### Tutorial Search
```
Base Query: [technology or skill]
In Title: tutorial, guide
Must Contain: 2024
Exclude Terms: beginner (if advanced)
```

### Platform-Specific Content
```
Base Query: [content type]
Site: [platform domain]
In Title: [specific keywords]
Exclude Terms: [unwanted content]
```

## Troubleshooting

### Too Few Results
- Remove some operators
- Use OR logic instead of Must Contain
- Broaden your base query
- Remove site restrictions

### Too Many Irrelevant Results
- Add more exclusions
- Use exact phrase matching
- Add Must Contain terms
- Restrict to specific sites

### No Results
- Check for typos in operators
- Simplify your query
- Remove conflicting operators
- Try a different base query

## Advanced Features Integration

### Quality Pre-filtering
Combine advanced operators with quality filters to find high-quality content:
- Use advanced operators to find specific content
- Set quality filter to "Full HD (1080p)" or higher
- Results will be verified for quality before display

### Metadata Enrichment
Advanced search results are automatically enriched with:
- View counts and likes
- Upload dates
- Available qualities
- Descriptions and tags

### Series Detection
When searching for episodic content with advanced operators:
- Use exact phrases for show names
- Include episode numbers in the query
- Klyp will automatically detect and offer to find all episodes

## Examples by Use Case

### Anime Enthusiast
```
Base Query: one piece
Exact Phrases: episode 1000
Site: bilibili.com
Exclude Terms: preview, reaction
```

### Music Collector
```
Base Query: synthwave
OR Terms: mix, compilation, playlist
Must Contain: 2024
Exclude Terms: reaction, review
```

### Educational Content
```
Base Query: machine learning
In Title: course, tutorial
Must Contain: python
Exclude Terms: introduction, beginner
```

### Gaming Content
```
Base Query: elden ring
In Title: gameplay, walkthrough
Exclude Terms: review, trailer, reaction
Site: twitch.tv, youtube.com
```

## Keyboard Shortcuts

- **Enter**: Execute search with current operators
- **Escape**: Close Advanced Search Panel
- **Tab**: Navigate between operator fields

## Additional Resources

- [DuckDuckGo Search Syntax](https://duckduckgo.com/duckduckgo-help-pages/results/syntax/)
- [yt-dlp Supported Sites](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md)
- [Klyp GitHub Repository](https://github.com/yourusername/klyp)

---

**Need Help?** If you encounter issues or have questions about advanced search operators, please open an issue on our GitHub repository.
