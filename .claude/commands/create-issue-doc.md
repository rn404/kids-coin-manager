---
description: Create a new issue document with template
argument-hint: "<brief summary>"
---

Create a new issue document:

1. Ask the user for additional context if the summary is too brief
2. Generate filename: `YYYY-MM-DD_<sanitized-summary>.md` 
3. Create the file in `/docs/issues/` with this template:

\`\`\`markdown
# [Summary from user input]

**Created**: YYYY-MM-DD
**Status**: Draft

## Problem / Goal

[To be filled through conversation with user]

## Context

[Background information]

## Approach

[To be filled before starting work]

## Work Log

### YYYY-MM-DD

[Daily progress notes]

## References

[Links to related docs, PRs, etc]
\`\`\`

4. Open an interactive conversation to fill in the Problem/Goal and Context sections
5. Present the created file when done
