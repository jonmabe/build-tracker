# build-tracker 🔨

Track nightly builds, their status, and performance metrics. Never lose track of what you built and when.

## Features

- **Build Logging** - Log builds with status, duration, and metadata
- **Git Integration** - Auto-detect commit hash and repo URL
- **Resource Monitoring** - Track CPU and memory usage during builds  
- **Statistics** - Success rates, duration trends, and performance metrics
- **Pretty CLI** - Color-coded output and formatted tables
- **Data Persistence** - JSON storage in `~/clawd/memory/build-history.json`

## Installation

```bash
cd ~/clawd/projects/build-tracker
npm install
npm link  # Make available globally
```

## Usage

### Log a Build

```bash
# Success
build-tracker log --project "awesome-tool" --status success --duration 15.5 --description "CLI for awesome things"

# Failed build
build-tracker log --project "broken-tool" --status failed --notes "Out of memory during compilation"

# With repo URL
build-tracker log --project "my-tool" --status success --repo-url "https://github.com/jonmabe/my-tool" --duration 8.2
```

### View Recent Builds

```bash
# Default: last 20 builds
build-tracker list

# Custom limit
build-tracker list --limit 10
```

### Statistics

```bash
build-tracker stats
```

### Comprehensive Report

```bash
build-tracker report
```

## Example Output

### List Command
```
🔨 Recent Builds

┌────────────────────┬────────────┬──────────┬──────────┬────────────────────────────────────────┐
│ Project            │ Status     │ Duration │ When     │ Repo                                   │
├────────────────────┼────────────┼──────────┼──────────┼────────────────────────────────────────┤
│ llm-bench          │ ✓ Success  │ 12.3m    │ 2h ago   │ jonmabe/llm-bench                      │
│ session-browser    │ ✓ Success  │ 18.7m    │ 1d ago   │ jonmabe/session-browser                │
│ prompt-guard       │ ✗ Failed   │ N/A      │ 2d ago   │ N/A                                    │
└────────────────────┴────────────┴──────────┴──────────┴────────────────────────────────────────┘
```

### Stats Command
```
📊 Build Statistics

┌─────────────────────────┬────────────────────┐
│ Metric                  │ Value              │
├─────────────────────────┼────────────────────┤
│ Total Builds            │ 15                 │
│ Successful              │ 12                 │
│ Failed                  │ 3                  │
│ Success Rate            │ 80%                │
│ Average Duration        │ 14.2m              │
│ Most Recent             │ 2h ago             │
└─────────────────────────┴────────────────────┘

📈 Success Rate Visualization
████████████████████████████████░░░░░░░░ 80%
```

## CLI Options

### `log` command
- `-p, --project <name>` (required) - Project name
- `-s, --status <status>` (required) - Build status: success/failed/running
- `-d, --description <desc>` - Project description
- `-r, --repo-url <url>` - GitHub repository URL
- `-t, --duration <minutes>` - Build duration in minutes
- `-n, --notes <notes>` - Additional notes
- `--directory <path>` - Project directory for git info (default: current)

### `list` command
- `-l, --limit <number>` - Number of builds to show (default: 20)

## Data Structure

Each build is stored with:

```json
{
  "id": "build-1706847234567",
  "timestamp": "2026-02-02T09:00:34.567Z",
  "project": "awesome-tool",
  "description": "CLI for awesome things",
  "status": "success",
  "duration_minutes": 15.5,
  "resource_usage": {
    "start": {
      "load_average": 0.8,
      "memory_usage_percent": 45,
      "timestamp": "2026-02-02T09:00:34.567Z"
    },
    "end": null
  },
  "commit_hash": "a1b2c3d4...",
  "repo_url": "https://github.com/jonmabe/awesome-tool",
  "notes": ""
}
```

## Integration with Nightly Builds

Add to your nightly build scripts:

```bash
# At start of build
BUILD_START=$(date +%s)

# Your build process here...

# At end of build
BUILD_END=$(date +%s)
BUILD_DURATION=$(( (BUILD_END - BUILD_START) / 60 ))

# Log success
build-tracker log \
  --project "my-awesome-tool" \
  --status "success" \
  --duration $BUILD_DURATION \
  --description "Does awesome things" \
  --repo-url "https://github.com/jonmabe/my-awesome-tool"
```

## Storage Location

All build history is stored in: `~/clawd/memory/build-history.json`

The file contains up to 100 most recent builds to prevent bloat.

## Future Enhancements

- [ ] HTML dashboard generation
- [ ] Integration with marvin-dashboard webhook
- [ ] Build trend analysis and charts
- [ ] Slack/Discord notifications for failures
- [ ] Automatic duration tracking (start/stop commands)

## License

MIT