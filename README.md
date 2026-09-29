# 🏥 HMS — Hospital Management System

A comprehensive, production-grade Hospital Management System covering clinical operations, patient management, hospital administration, analytics, AI-assisted workflows, and SaaS capabilities.

**45 modules** across Core (20), Essential (14), and Advanced (11) feature areas.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Vite 8, React Router, Axios, Lucide Icons |
| **Backend** | Node.js, Express 5, Mongoose 9 |
| **Database** | MongoDB |
| **Auth** | JWT (access + refresh tokens), bcryptjs |
| **Styling** | Vanilla CSS with design tokens |

---

## Project Structure

```
hms/
├── server/                   # Backend API
│   ├── server.js             # Entry point
│   ├── .env.example          # Environment template
│   └── src/
│       ├── app.js            # Express app setup
│       ├── config/           # DB, CORS, env config
│       ├── controllers/      # Route handlers
│       ├── middleware/        # Auth, RBAC, error handling
│       ├── models/           # Mongoose schemas
│       ├── routes/           # API route definitions
│       ├── services/         # Business logic
│       ├── utils/            # ApiError, ApiResponse, logger, constants
│       └── validations/      # Request validation schemas
│
├── client/                   # Frontend SPA
│   ├── index.html
│   └── src/
│       ├── App.jsx           # Root component
│       ├── index.css         # Design system
│       ├── context/          # React contexts (Auth)
│       ├── layouts/          # AuthLayout, DashboardLayout
│       ├── pages/            # Page components by module
│       ├── routes/           # Route definitions & guards
│       ├── services/         # API service layer
│       ├── components/       # Reusable UI components
│       ├── hooks/            # Custom hooks
│       └── utils/            # Formatters, validators, constants
│
└── README.md
```

---

## Getting Started

### Prerequisites

- **Node.js** >= 18
- **MongoDB** — local install or [MongoDB Atlas](https://www.mongodb.com/atlas)
- **npm** >= 9

### 1. Clone the Repository

```bash
git clone https://github.com/yogitharao08/hms.git
cd hms
```

### 2. Backend Setup

```bash
cd server
cp .env.example .env        # Create your .env file
# Edit .env with your MongoDB URI and JWT secrets
npm install
npm run dev                  # Starts with nodemon on port 5000
```

### 3. Frontend Setup

```bash
cd client
npm install
npm run dev                  # Starts Vite dev server on port 5173
```

### 4. Verify

- Backend health: [http://localhost:5000/api/v1/health](http://localhost:5000/api/v1/health)
- Frontend app: [http://localhost:5173](http://localhost:5173)

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `5000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/hms` |
| `JWT_SECRET` | JWT signing secret | *(required)* |
| `JWT_EXPIRES_IN` | Access token expiry | `7d` |
| `JWT_REFRESH_SECRET` | Refresh token secret | *(required)* |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry | `30d` |
| `CLIENT_URL` | Frontend origin for CORS | `http://localhost:5173` |
| `LOG_LEVEL` | Logging level | `debug` |

> ⚠️ **Never commit `.env` files.** Use `.env.example` as a reference.

---

## API Structure

All APIs are versioned under `/api/v1/`.

| Endpoint | Description | Phase |
|----------|-------------|-------|
| `GET /api/v1/health` | Health check | 1 ✅ |
| `/api/v1/auth` | Authentication | 2 |
| `/api/v1/users` | User management | 2 |
| `/api/v1/patients` | Patient management | 3 |
| `/api/v1/departments` | Departments | 4 |
| `/api/v1/doctors` | Doctor management | 4 |
| `/api/v1/appointments` | Scheduling | 4 |
| `/api/v1/opd` | OPD workflow | 4 |
| `/api/v1/ipd` | Inpatient management | 5 |
| `/api/v1/beds` | Bed/ward management | 5 |
| `/api/v1/pharmacy` | Pharmacy | 6 |
| `/api/v1/laboratory` | Lab management | 6 |
| `/api/v1/billing` | Billing & payments | 7 |
| `/api/v1/insurance` | Insurance & claims | 7 |
| `/api/v1/emr` | Medical records | 7 |

---

## Authentication & RBAC

- JWT-based authentication with access + refresh tokens
- Role-based access control with configurable permissions
- Permission format: `resource:action` (e.g., `patients:create`)

### Supported Roles

Super Admin, Hospital Admin, Doctor, Nurse, Receptionist, Pharmacist, Lab Technician, Radiologist, Billing Staff, Insurance Staff, HR Staff, Inventory Staff, Blood Bank Staff, OT Staff, Ambulance Staff, Patient

---

## Development Commands

| Command | Directory | Description |
|---------|-----------|-------------|
| `npm run dev` | `server/` | Start backend with hot-reload |
| `npm start` | `server/` | Start backend (production) |
| `npm run dev` | `client/` | Start frontend dev server |
| `npm run build` | `client/` | Build frontend for production |
| `npm run lint` | `client/` | Run ESLint |

---

## Implementation Phases

| Phase | Focus | Status |
|-------|-------|--------|
| 0 | Inspection & Architecture | ✅ |
| 1 | Foundation & Infrastructure | ✅ |
| 2 | Authentication & RBAC | 🔜 |
| 3 | Patient Management | — |
| 4 | Doctor, Department, Appointment, OPD | — |
| 5 | IPD, Beds, Wards, Nursing | — |
| 6 | Pharmacy & Laboratory | — |
| 7 | Billing, Insurance, EMR | — |
| 8 | Radiology, OT, Blood Bank, Inventory, HR, Admin | — |
| 9 | Portals, Notifications, Reports, Security | — |
| 10 | AI, Telemedicine, Analytics, Integrations, SaaS | — |

---

## Git Workflow

- Branch: `main`
- Remote: `https://github.com/yogitharao08/hms.git`
- Use meaningful commit messages: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`

---

## License

ISC

---

*Built by GD*
