# Project Overview

Kids coin manager

## Tech Stack

- Deno
- Fresh v2 (Web Framework)
- Tailwind (CSS Framework)

## Tools

- For GitHub operations, use `gh` CLI (not direct API calls)
  - Example: `gh issue view`, `gh pr create`
- For Git operations, use standard git commands

## Directory Structure

This project uses a Deno workspace-based monorepo structure.

- `/docs` - Documentation
- `/docs/reports` - Technical research reports. Research reports should be saved to here.
- `/docs/issues` - Issue documents
- `/apps/web` - Main application of this repository
- `/packages` - Shared packages used across applications
