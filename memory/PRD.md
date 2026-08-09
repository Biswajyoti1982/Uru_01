# FitConnect — Activity Classes Marketplace

## Original Problem Statement
Build an app where users subscribe to classes for different activities (gym training, sports coaching, wellness/other) offered by professionals. Service providers self-register and create schedules; an admin controls what's visible to customers; customers browse activities, view class schedules and enroll/subscribe (free). Basic structure to build upon.

## User Choices
- Deliverable: working full-stack app (also serves as the interactive wireframe)
- Roles: Customer + Service Provider + Admin
- Provider onboarding: self-register → admin approval
- Payments: none (free enroll/subscribe)
- Auth: Emergent-managed Google OAuth

## Architecture
- Frontend: React 19 (CRA/craco), react-router, Tailwind + shadcn/ui, framer-motion, sonner. Dark "Performance Pro" theme (Barlow Condensed + DM Sans, obsidian + neon #39FF14).
- Backend: FastAPI (async), all routes under /api.
- DB: MongoDB (motor). Collections: users, user_sessions, services, classes, enrollments. Custom UUID ids; `_id` excluded via projection.
- Auth: Emergent Google OAuth. httpOnly session_token cookie (7d) + Bearer fallback. Admin auto-assigned by email rrlfnlstrategy@gmail.com.

## User Personas
- Customer: browses activities, views schedules, enrolls, manages My Classes.
- Provider: applies to join, once approved publishes services + class schedules, sees attendees.
- Admin: approves providers, moderates services (approve/reject/visibility), views platform stats.

## Core Requirements (static)
- Role-based dashboard with contextual sidebar.
- Provider services require admin approval before customer visibility.
- Enrollment with capacity + duplicate guards.

## Implemented (2026-08-09)
- Google OAuth login, session mgmt, role gating (customer/provider/admin).
- Landing page (hero, categories, how-it-works).
- Customer: browse + category filter, activity detail w/ schedule, enroll/cancel, My Classes.
- Provider: application flow (pending/approved/rejected states), service CRUD, class schedule mgmt, attendees list.
- Admin: overview stats, provider approvals, service moderation (approve/reject/toggle-visibility).
- Seed data: demo provider + 3 approved services with class schedules.
- Verified: 15/15 backend tests pass, all critical frontend flows pass.

## Backlog / Remaining
- P1: Payments/paid subscriptions (Stripe) — deferred per user.
- P1: Notifications/reminders for upcoming classes (email via Resend).
- P2: Provider profiles/pages, reviews & ratings, recurring class scheduling.
- P2: Waitlists when class full; calendar month view.
- P2: Optional endpoint hardening (404 on missing ids, block re-apply while pending).

## Next Tasks
- Gather feedback on the initial structure, then prioritize scheduling depth vs. payments.
