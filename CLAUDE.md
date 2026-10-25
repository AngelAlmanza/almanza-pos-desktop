# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

All project and workflow guidance lives in `AGENTS.md`, which is shared with other harnesses. It is imported here so there is a single source of truth:

@AGENTS.md

## Claude Code specifics

- The AI-DLC onboarding for Claude Code is `.claude/CLAUDE.md`; its rules are imported from `.claude/rules/aidlc.md`, which points at the active space's `memory/` files.
- Project skills live in `.claude/skills/`. `interface-design` is restored there and is discovered by the harness.
- After changing `.claude/` hooks or settings, fully restart Claude Code; `/clear` is not enough.
