# HostelIQ — Hostel Complaint Management System

A full-stack web application for managing hostel complaints across multiple roles, with AI-powered shift reports, duplicate detection, and automated cron-based workflows.

🔗 **Live Demo:** [https://hostel-management-system-livid-alpha.vercel.app](https://hostel-management-system-livid-alpha.vercel.app)

---

## Features by Role

### Student
- Submit complaints with category, room number, floor, and description
- Real-time duplicate detection — warns if a similar complaint was already filed
- Track complaint status (Pending → Assigned → In Progress → Resolved)

### Floor Warden
- View and manage all complaints from their floor
- Assign complaints to maintenance staff
- Update complaint status
- View AI-powered shift reports with Gemini integration

### Main Warden
- Full dashboard with analytics and complaint overview
- View merged/duplicate complaint groups
- Monitor staff performance
- Access all floor data in one place

### Night Warden
- Dedicated dashboard for 10pm–6am shift
- View and resolve complaints during night hours
- Automatic shift handoff to floor wardens at 6am
- AI-generated shift summary report every morning at 6:10am

---

## Key Technical Features

- **Duplicate Detection Engine** — semantic similarity check flags duplicate complaints before submission
- **Priority Engine** — auto-assigns complaints based on urgency, category, and staff availability
- **AI Shift Reports** — on-demand Gemini AI analysis with smart template fallback
- **Cron Jobs** — 5 automated jobs handle night shift handoff, shift reports, and complaint escalation
- **JWT Authentication** — role-based access control across 4 user types
- **Real-time Status Updates** — complaint lifecycle managed end-to-end

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, React Router |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas, Mongoose |
| Auth | JWT (JSON Web Tokens) |
| AI | Google Gemini API (with smart fallback) |
| Scheduling | node-cron (5 automated jobs) |
| Deployment | Vercel (frontend) + Render (backend) |

---

## Project Structure

```
hostel-complaint-system/
├── backend/
│   ├── models/          # Complaint, User, Staff, ShiftReport
│   ├── routes/          # auth, complaints, staff, analytics, duplicates, nightWarden, shiftReports
│   ├── utils/           # duplicateEngine, priorityEngine, cronJobs
│   └── server.js
└── frontend/
    └── src/
        ├── pages/       # StudentDashboard, FloorWardenDashboard, MainWardenDashboard, NightWardenDashboard, Login, LandingPage
        └── components/  # ComplaintCard, DuplicateWarning, MergedGroups, ShiftReportPanel, Navbar
```

---

## Run Locally

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)

### Backend
```bash
cd backend
npm install
# Create .env file:
# PORT=5000
# MONGO_URI=your_mongodb_uri
# JWT_SECRET=your_secret
node server.js
```

### Frontend
```bash
cd frontend
npm install
# Create .env file:
# VITE_GEMINI_API_KEY=your_gemini_key (optional — fallback works without it)
npm run dev
```

---

## Demo Accounts

Register accounts with these roles to test the full flow:
- `student` — submit and track complaints
- `floor_warden` — manage floor complaints and staff
- `main_warden` — full system overview and analytics
- `night_warden` — night shift management and AI reports

---

## Automated Cron Jobs

| Job | Schedule | Action |
|-----|----------|--------|
| Urgent Escalation | Every 30 min | Escalates unresolved urgent complaints |
| Auto-assign | Every hour | Assigns pending complaints to available staff |
| Night Shift Start | 10:00 PM | Activates night warden mode |
| Night Handoff | 6:00 AM | Hands off unresolved complaints to floor wardens |
| Shift Report | 6:10 AM | Generates and saves night shift summary report |
