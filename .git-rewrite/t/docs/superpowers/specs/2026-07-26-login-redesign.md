# Login Page Redesign

## Overview
Replace the current full-screen landing-style login page with a modern split-panel auth experience. Cleaner, simpler, mobile-optimized, and more polished brand presentation.

## Layout
- **Two equal panels** (50/50): left = brand panel, right = auth panel
- **Mobile (≤768px)**: brand panel collapses to a slim top bar (logo + "HR Pulse"), auth card fills the remaining screen height

## Brand Panel (Left)
- Dark/deep gradient background
- HR Pulse logo + tagline at top
- Centered hero statement: *"Your HR Data, Your Drive"*
- Abstract geometric / cloud motif graphic (CSS-only, no external images)
- No interactive elements — purely atmospheric branding

## Auth Panel (Right)
- Clean light/glass background
- Centered card containing the full login flow
- **Segmented tabs** at the top: "HR Manager" | "Employee"

### HR Manager Tab
- Prominent full-width "Connect Google Drive" button (same OAuth flow as current)
- Trust line below: *"We only create a private HR-Pulse-DB folder"*
- First-time flow: click → trust modal → confirm → OAuth
- Subsequent: click → OAuth directly (based on localStorage flag, same as current)

### Employee Tab
- Email input + Password input
- "Sign In" button
- Error state for bad credentials
- Password validation against stored employee records (existing logic)

### Card Footer
- Expandable "What is HR Pulse?" section
- *"Free forever. No credit card required."*

## Trust Modal
- Same content as current: explanation of drive.appdata scope, permission checklist, Authorize / Learn More buttons
- Restyled with glassmorphism overlay to match the new design

## Removed Elements
- Value proposition cards (3-grid)
- Feature pills row
- Social proof footer avatars
- All associated CSS classes and animations

## Mobile
- Brand panel → slim top bar with logo + name
- Auth card fills full width below
- Tab switching works identically
- No horizontal scroll, no overflow

## Transitions & States
- Auth card fades in on load
- Smooth tab transition between HR Manager / Employee
- Loading spinner on Drive connect button
- Error state on Employee login failure
