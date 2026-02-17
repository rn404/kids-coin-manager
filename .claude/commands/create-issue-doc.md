---
description: Create a new issue document with template
argument-hint: '<brief summary>'
---

Create a new issue document:

1. Read `/docs/issues/_Rules.md` to understand the naming convention, status definitions, and document format
2. Ask the user for additional context if the summary is too brief
3. Generate filename following the naming convention in `_Rules.md`
4. Create the file in `/docs/issues/` following the document format defined in `_Rules.md`
   - Set Status to `Draft`
   - Fill in Summary based on the user's input and conversation
   - Leave other sections empty or with minimal placeholder content appropriate for Draft status
5. Open an interactive conversation to flesh out the Summary section
6. Present the created file when done
