@echo off
REM Launch ResearchOS desktop dev (monorepo filtered)
cd /d %~dp0
pnpm --filter @research-os/desktop dev
