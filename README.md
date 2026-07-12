# Fokur Toto Ligi

A modern, invite-only football prediction platform inspired by the weekly Spor Toto format.

Players submit `1 / X / 2` predictions for weekly match lists, follow their results, compare scores on the leaderboard, and review their season performance. Administrators manage weeks, matches, official result imports, and score calculation through a dedicated dashboard.

## Overview

Fokur Toto Ligi is a full-stack web application built as a private prediction league for friends and invited players.

The project focuses on:

- secure authentication,
- weekly football predictions,
- automated score calculation,
- season-based statistics,
- responsive mobile-first design,
- administrative match and result management.

## Features

### Player features

- Secure email and password authentication
- Invite-only account system
- Weekly `1 / X / 2` match predictions
- Prediction deadline and locking behavior
- Weekly results overview
- Overall leaderboard
- Personal profile and prediction statistics
- Previous weeks and prediction history
- Season overview
- Responsive desktop and mobile interface
- Mobile bottom navigation

### Administrator features

- Dedicated admin dashboard
- Create and manage prediction weeks
- Add and update match lists
- Enter or import match results
- Preview official Spor Toto data before saving
- Manually trigger score calculation
- Manage active and published weeks
- Review application and league data

## Technology Stack

| Area | Technology |
|---|---|
| Framework | Next.js |
| Language | TypeScript |
| UI | React |
| Styling | Tailwind CSS |
| Authentication | Supabase Auth |
| Database | Supabase PostgreSQL |
| Server logic | Next.js Server Actions and API routes |
| CI | GitHub Actions |
| Package manager | npm |

## Main Routes

| Route | Description |
|---|---|
| `/` | Application homepage |
| `/giris` | Login and password reset |
| `/tahminler` | Current week predictions |
| `/sonuclar` | Weekly results |
| `/puan-tablosu` | League leaderboard |
| `/profil` | Player profile and statistics |
| `/haftalar` | Previous and available weeks |
| `/sezon` | Season overview |
| `/admin` | Administrator dashboard |

Protected routes require a valid Supabase session.

## Prediction System

Each weekly match can be predicted using:

- `1` — Home team wins
- `X` — Draw
- `2` — Away team wins

Predictions are available until the configured deadline. Once the deadline has passed, the week is locked and existing selections can no longer be changed.

After the official results are entered, the administrator can trigger score calculation for the selected week.

## Official Match Data Workflow

The project includes server-side routes for working with publicly available Spor Toto match and result data.

The administrative workflow is designed around review and confirmation:

1. Request the available match or result data.
2. Display the parsed data as a preview.
3. Allow the administrator to verify the information.
4. Save the approved data to the application database.
5. Calculate player scores after the results are confirmed.

Imported data is not intended to be saved without administrator review.

## Getting Started

### Prerequisites

- Node.js 20 or newer
- npm
- A Supabase project

### Installation

Clone the repository:

```bash
git clone https://github.com/Simurg41/fokur-toto-ligi.git
cd fokur-toto-ligi
```

Install the dependencies:

```bash
npm install
```

### Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Do not commit `.env.local` or any private credentials to GitHub.

### Database Setup

Use the SQL files in the `supabase` directory to create the required tables, policies, and database structure.

To assign administrator access, use the provided example SQL file after replacing the placeholder email address with the correct account:

```sql
where email = 'YOUR_EMAIL@example.com';
```

Review every SQL script before executing it in the Supabase SQL Editor.

### Start the Development Server

```bash
npm run dev
```

Open the application at:

```text
http://localhost:3000
```

## Available Commands

```bash
npm run dev
```

Starts the application in development mode.

```bash
npm run build
```

Creates a production build.

```bash
npm run start
```

Starts the production server after a successful build.

```bash
npm run lint
```

Runs the configured lint checks.

## Project Structure

```text
fokur-toto-ligi/
├── app/                  # Next.js routes, pages and server endpoints
├── components/           # Reusable interface components
├── lib/                  # Shared utilities and Supabase clients
├── public/               # Static assets
├── supabase/             # Database schema and setup scripts
├── .github/workflows/    # Continuous integration workflows
├── package.json
└── README.md
```

## Authentication and Authorization

Authentication is handled through Supabase Auth.

The application uses server-verified session cookies rather than trusting values stored only in the browser. Protected pages are checked before access is granted.

Administrator functionality must also be protected through the corresponding user role stored in the application database.

## Security Notes

- Environment files are excluded from version control.
- Supabase service-role credentials must never be exposed to the browser.
- Administrative operations should always verify authorization on the server.
- Database access is protected through Supabase Row Level Security policies.
- Imported match and result data should be reviewed before it is persisted.

## Current Status

The following functionality is implemented:

- Next.js and Supabase application architecture
- Authentication and protected routes
- Weekly match and prediction management
- Player profiles and statistics
- Leaderboard and result pages
- Season and week navigation
- Administrator dashboard
- Official match and result preview workflows
- Score calculation
- Responsive application shell
- GitHub Actions lint and build workflow

## Possible Future Improvements

- Dedicated automated test accounts
- Additional Playwright end-to-end coverage
- Scheduled cross-browser testing
- Visual regression testing
- Accessibility checks
- Push or email deadline notifications
- Extended season analytics
- Improved administrator audit history

## Disclaimer

This is an independent personal portfolio project.

It is not an official Spor Toto product and is not affiliated with, endorsed by, or sponsored by Spor Toto or any football organization. External data structures and endpoints may change and could require updates to the related parsers or server routes.

## Author

**Ahmet Kislali**

Software development and test automation portfolio project.

## License

This project is provided as personal portfolio work and is not licensed for redistribution.
