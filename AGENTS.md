# Agent Guidelines for KPI Schedule to Google Calendar

This document provides coding agents with essential information about build commands, testing, and code style guidelines for this project.

## Project Overview

A tool to sync KPI schedules to Google Calendar. Technology stack to be determined (Python recommended for Google Calendar API integration).

---

## Build, Lint, and Test Commands

### Python Project (if applicable)

**Setup:**
```bash
# Install dependencies
pip install -r requirements.txt
# OR with poetry
poetry install
```

**Lint:**
```bash
# Run linter (if using flake8)
flake8 src/ tests/
# OR with pylint
pylint src/ tests/
# OR with ruff
ruff check .
```

**Format:**
```bash
# Run formatter (if using black)
black src/ tests/
# OR with ruff
ruff format .
```

**Type Check:**
```bash
# Run type checker (if using mypy)
mypy src/
```

**Test:**
```bash
# Run all tests
pytest
# Run single test file
pytest tests/test_filename.py
# Run single test function
pytest tests/test_filename.py::test_function_name
# Run with coverage
pytest --cov=src tests/
```

**Build:**
```bash
# Build package (if applicable)
python -m build
```

### Node.js/TypeScript Project (if applicable)

**Setup:**
```bash
npm install
# OR
yarn install
```

**Lint:**
```bash
npm run lint
# OR
yarn lint
```

**Format:**
```bash
npm run format
# OR
yarn format
```

**Type Check:**
```bash
npm run type-check
# OR
tsc --noEmit
```

**Test:**
```bash
# Run all tests
npm test
# Run single test file
npm test -- path/to/test.spec.ts
# Run with coverage
npm run test:coverage
```

**Build:**
```bash
npm run build
```

---

## Code Style Guidelines

### General Principles

1. **Write clear, readable code** - Prioritize clarity over cleverness
2. **Follow DRY principle** - Don't repeat yourself
3. **Keep functions small** - Single responsibility principle
4. **Document complex logic** - Use comments for non-obvious code
5. **Test your code** - Write tests for new features and bug fixes

### Import Organization

**Python:**
```python
# Standard library imports
import os
import sys
from datetime import datetime

# Third-party imports
import requests
from google.oauth2.credentials import Credentials

# Local application imports
from src.utils.calendar import create_event
from src.config import settings
```

**TypeScript/JavaScript:**
```typescript
// Node.js standard library
import * as fs from 'fs';
import * as path from 'path';

// Third-party packages
import axios from 'axios';
import { google } from 'googleapis';

// Local imports - absolute
import { createEvent } from '@/utils/calendar';
import { config } from '@/config';

// Local imports - relative (if not using absolute paths)
import { helper } from './helper';
```

### Naming Conventions

**Python:**
- **Variables/Functions:** `snake_case` (e.g., `schedule_event`, `user_id`)
- **Classes:** `PascalCase` (e.g., `CalendarManager`, `EventScheduler`)
- **Constants:** `UPPER_SNAKE_CASE` (e.g., `MAX_RETRIES`, `API_TIMEOUT`)
- **Private members:** Prefix with `_` (e.g., `_internal_method`)

**TypeScript/JavaScript:**
- **Variables/Functions:** `camelCase` (e.g., `scheduleEvent`, `userId`)
- **Classes/Interfaces/Types:** `PascalCase` (e.g., `CalendarManager`, `EventScheduler`)
- **Constants:** `UPPER_SNAKE_CASE` or `camelCase` (e.g., `MAX_RETRIES` or `maxRetries`)
- **Private members:** Prefix with `#` or `_` (e.g., `#privateField`, `_internalMethod`)

### Type Annotations

**Always use type hints/annotations:**

Python:
```python
def schedule_event(event_name: str, date: datetime, attendees: list[str]) -> dict[str, Any]:
    """Schedule an event on Google Calendar."""
    pass
```

TypeScript:
```typescript
function scheduleEvent(eventName: string, date: Date, attendees: string[]): Promise<Event> {
  // Implementation
}
```

### Error Handling

**Be explicit and specific:**

Python:
```python
try:
    result = api_call()
except requests.HTTPError as e:
    logger.error(f"HTTP error occurred: {e}")
    raise
except requests.ConnectionError as e:
    logger.error(f"Connection error: {e}")
    return None
except Exception as e:
    logger.error(f"Unexpected error: {e}")
    raise
```

TypeScript:
```typescript
try {
  const result = await apiCall();
} catch (error) {
  if (error instanceof HTTPError) {
    logger.error(`HTTP error occurred: ${error.message}`);
    throw error;
  } else if (error instanceof ConnectionError) {
    logger.error(`Connection error: ${error.message}`);
    return null;
  } else {
    logger.error(`Unexpected error: ${error}`);
    throw error;
  }
}
```

### Documentation

**Add docstrings/JSDoc for public APIs:**

Python:
```python
def sync_schedule(schedule_id: str, calendar_id: str) -> bool:
    """
    Sync KPI schedule to Google Calendar.
    
    Args:
        schedule_id: The ID of the schedule to sync
        calendar_id: Target Google Calendar ID
        
    Returns:
        True if sync successful, False otherwise
        
    Raises:
        ValueError: If schedule_id or calendar_id is invalid
        APIError: If Google Calendar API call fails
    """
    pass
```

TypeScript:
```typescript
/**
 * Sync KPI schedule to Google Calendar
 * @param scheduleId - The ID of the schedule to sync
 * @param calendarId - Target Google Calendar ID
 * @returns Promise resolving to true if sync successful
 * @throws {ValueError} If schedule_id or calendar_id is invalid
 * @throws {APIError} If Google Calendar API call fails
 */
async function syncSchedule(scheduleId: string, calendarId: string): Promise<boolean> {
  // Implementation
}
```

---

## Best Practices

1. **Avoid hardcoded values** - Use configuration files or environment variables
2. **Validate inputs** - Check parameters at function boundaries
3. **Log appropriately** - Use structured logging with appropriate levels
4. **Handle async operations properly** - Use proper error handling with promises/async-await
5. **Write idempotent operations** - Functions should be safe to retry
6. **Keep dependencies minimal** - Only add dependencies when necessary
7. **Version lock dependencies** - Use lock files (poetry.lock, package-lock.json)

---

## Testing Guidelines

1. **Test file naming:** Match source files (e.g., `calendar.py` → `test_calendar.py`)
2. **Test function naming:** Descriptive names (e.g., `test_sync_schedule_with_invalid_id_raises_error`)
3. **Arrange-Act-Assert pattern:** Structure tests clearly
4. **Mock external services:** Don't make real API calls in tests
5. **Test edge cases:** Include boundary conditions and error cases

---

## Notes for Agents

- **Before committing:** Run linter, formatter, and tests
- **Update tests:** When modifying functionality
- **Check credentials:** Ensure API keys/secrets are in .env or config, not committed
- **Google Calendar API:** Requires OAuth2 authentication setup
- **Rate limiting:** Implement backoff for API calls
- **Time zones:** Handle properly when scheduling events
