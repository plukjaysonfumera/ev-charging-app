# EV Charging App — Philippines

## Project Overview
Community-first EV charging station app for the Philippine market.
Competitor to EVRO. PlugShare-style community features + PayMongo payments.

## Tech Stack
- Frontend: React Native (Expo SDK 52+)
- Backend: Node.js + Express
- Database: PostgreSQL + PostGIS (via Supabase)
- Auth: Firebase Auth
- Maps: Google Maps Platform
- Payments: PayMongo (GCash, Maya, cards)
- Language: TypeScript throughout

## Project Structure
/apps/mobile    — React Native (Expo) app
/apps/api       — Node.js Express backend
/packages/shared — Shared types, constants, utils

## Conventions
- Use TypeScript strict mode
- Use Prisma for database ORM
- API follows REST conventions
- Tagalog + English (i18n with react-i18next)
- Mobile-first design, optimized for Filipino users
