# MyCareer - Resume Review Platform

A resume review and approval platform for the American University of Nigeria (AUN) Career Center.

## Overview

This system digitizes the resume review process, allowing students to submit resumes electronically and enabling staff to review them asynchronously. The platform includes:

- **Resume State Machine**: draft → submitted → changes_required/approved
- **Auto Staff Assignment**: Fair distribution using "least-loaded" algorithm
- **Role-Based Permissions**: Student, Staff, and Admin roles with different capabilities
- **Supabase Integration**: PostgreSQL database with real-time capabilities

## Quick Start

### Install Dependencies

```bash
npm install
```

### Run the Demo

```bash
npm run dev
```

This will run an interactive demo showing:
- Students submitting resumes
- Automatic staff assignment
- Staff reviewing and updating status
- Permission checking for different roles
- Fair workload distribution

### Build the Project

```bash
npm run build
```

Compiled JavaScript will be output to the `dist/` directory.

## Project Structure

```
src/
├── core/                      # Business logic & models
│   ├── resume.model.ts        # Resume data model with 4 states
│   ├── assignment.logic.ts    # "Least-loaded" staff assignment
│   └── permissions.rules.ts   # Role-based access control
├── repositories/              # Database operations
│   └── resume.repository.ts
├── services/                  # Business services
│   └── resume.service.ts      # Submit & status update logic
├── lib/                       # External integrations
│   └── supabase.client.ts     # Supabase client initialization
├── mock/                      # Mock implementations for demo
│   └── supabase.mock.ts       # Mock database for testing
└── demo.ts                    # Interactive demonstration
```

## Key Features

### Resume Workflow
1. **Draft**: Student creates resume
2. **Submitted**: Student submits for review (auto-assigns staff)
3. **Changes Required**: Staff requests revisions
4. **Approved**: Staff approves resume

### Staff Assignment
Resumes are automatically assigned to staff using a "least-loaded" algorithm that:
- Tracks current workload per staff member
- Assigns new resumes to the staff with the fewest active assignments
- Ensures fair distribution of review work

### Role-Based Permissions
- **Student**: Can create drafts and submit resumes
- **Staff**: Can review and update status (except to draft)
- **Admin**: Can perform any operation

## Environment Variables

For production use with real Supabase database:

```bash
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

Client (Vite) environment variables:

```bash
VITE_API_BASE_URL=https://your-api-host.com/api
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## Deploy on Vercel (Client) + External API

This repo is a monorepo. The fastest deployment is to host only the Vite client on Vercel and run the Express API elsewhere (Render/Railway/Fly).

1. Create a new Vercel project and set **Root Directory** to `client`.
2. Set **Build Command** to `npm install && npm run build`.
3. Set **Output Directory** to `dist`.
4. Add Vercel environment variables:
   - `VITE_API_BASE_URL` = `https://<your-api-host>/api`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - Ensure `VITE_API_BASE_URL` includes the `/api` path and has no trailing slash.
5. Deploy the Express server separately and ensure it is reachable at the URL used in `VITE_API_BASE_URL`.

## Goals

- Reduce average processing time from 1.5 weeks to 2-3 days
- Reduce revision cycles from ~3.2 to ~1.8
- Eliminate printing costs for students
- Scale to handle 200:2-5 student-to-staff ratios

## License

MIT
