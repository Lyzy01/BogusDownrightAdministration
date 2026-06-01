# BotForge — Discord Bot Hosting Platform

## Overview

BotForge is a no-code Discord bot hosting platform. Users log in with Discord OAuth, paste their bot token, toggle intents/permissions, enable command modules (moderation, fun, utility), build custom commands, and generate invite URLs — all without writing code.

## Architecture

- **Frontend**: React + Vite (port 5000), Tailwind CSS, Framer Motion, Wouter, TanStack Query
- **Backend**: Express.js (port 3001), TypeScript, tsx
- **Database**: PostgreSQL (Replit managed)
- **Auth**: Discord OAuth2

## Running the App

Two processes run in parallel:
1. `npm run dev` — Express server on port 3001
2. `npx vite` — Vite dev server on port 5000 (proxies /api to 3001)

Workflow: "Start App" runs both concurrently.

## Required Environment Variables

Set these in the Secrets tab:
- `DISCORD_CLIENT_ID` — From Discord Developer Portal
- `DISCORD_CLIENT_SECRET` — From Discord Developer Portal
- `SESSION_SECRET` — Random string for session signing (auto-generated if not set)

## Setting up Discord OAuth

1. Go to https://discord.com/developers/applications
2. Create a new application
3. Go to OAuth2 → Redirects
4. Add redirect: `https://<your-replit-domain>/api/auth/callback`
5. Copy Client ID and Client Secret to secrets

## User Preferences

- Smooth dark UI with Discord-style aesthetic
- No emojis in UI
- No coding required for end users
