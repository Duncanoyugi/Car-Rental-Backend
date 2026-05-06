# Dante Car Rental - Backend API

A comprehensive car rental management system built with **NestJS**, **PostgreSQL**, and **Prisma ORM**. This backend provides a robust RESTful API for managing vehicles, bookings, payments, reviews, and user management with role-based access control.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [Authentication & Authorization](#authentication--authorization)
- [API Endpoints](#api-endpoints)
- [Environment Variables](#environment-variables)
- [Installation & Setup](#installation--setup)
- [Running the Application](#running-the-application)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [Third-Party Integrations](#third-party-integrations)
- [Security Features](#security-features)
- [Error Handling](#error-handling)

---

## Features

### Core Functionality
- **User Management**: Registration, email verification, password reset, profile management
- **Role-Based Access Control**: Three distinct roles (ADMIN, AGENT, CUSTOMER) with granular permissions
- **Vehicle Management**: Full CRUD operations for vehicles with image uploads via Cloudinary
- **Booking System**: Create and manage bookings with status workflow (PENDING → CONFIRMED → COMPLETED/CANCELLED)
- **Payment Processing**: Integrated payment tracking with invoice generation
- **Review System**: Customers can review vehicles; reviews are linked to bookings
- **Admin Dashboard**: System statistics, user management, agent creation, full booking oversight
- **Agent Portal**: Vehicle management, booking management for owned vehicles, customer interactions
- **Customer Portal**: Profile management, rental history, vehicle browsing/searching
- **Email Notifications**: Automated emails for verification, password reset, password changes

### Advanced Features
- **JWT Authentication**: Stateless authentication with access tokens
- **File Uploads**: Cloudinary integration for profile images and vehicle photos
- **Local File Serving**: Static file serving for uploaded assets
- **Input Validation**: DTOs with class-validator for request validation
- **Global Error Handling**: Consistent error responses across the API
- **CORS Configuration**: Secure cross-origin request handling

---

## Tech Stack

| Category | Technology |
|----------|-----------|
| **Framework** | NestJS (Node.js) |
| **Language** | TypeScript |
| **Database** | PostgreSQL |
| **ORM** | Prisma |
| **Authentication** | JWT + Passport.js |
| **File Storage** | Cloudinary |
| **Email Service** | Nodemailer + EJS templates |
| **Validation** | class-validator, class-transformer |
| **Testing** | Jest + Supertest |
| **API Documentation** | (Swagger can be added) |
| **Static Files** | Express static serving |

---

## Architecture

The application follows a **modular architecture** inspired by Domain-Driven Design (DDD) principles. Each domain (Auth, Vehicle, Booking, etc.) is encapsulated in its own module with clear boundaries.

### Key Architectural Patterns

1. **Modules**: Self-contained feature modules with controllers, services, and DTOs
2. **Services**: Business logic layer; all database operations go through services
3. **Controllers**: HTTP request handling; delegates to services
4. **DTOs (Data Transfer Objects)**: Request/response shape definitions with validation decorators
5. **Guards**: Route protection (JWT auth, role-based authorization)
6. **Interceptors** (if present): Request/response transformation
7. **Pipes**: Global validation pipe for DTO sanitization

---

## Database Schema

The PostgreSQL database is managed via **Prisma ORM**. Below is the schema definition from `prisma/schema.prisma`:

### Entity Relationship Diagram (Textual)

```
User (id, fullName, email, password, phoneNumber, role, profileImage, isEmailVerified, ...)
  ├── has many → Booking[]
  └── has many → Review[]

Vehicle (id, title, category, pricePerDay, features[], imageUrls[], availableFrom, availableTo, location, createdBy)
  ├── has many → Booking[]
  └── has many → Review[]

Booking (id, userId, vehicleId, startDate, endDate, status, totalPrice)
  ├── belongs to → User
  ├── belongs to → Vehicle
  └── has one → Payment? (optional)

Payment (id, bookingId, amount, method, status)
  └── belongs to → Booking

Review (id, rating, comment, userId, vehicleId)
  ├── belongs to → User
  └── belongs to → Vehicle
```

### Enums

- **Role**: `ADMIN` | `AGENT` | `CUSTOMER`
- **BookingStatus**: `PENDING` | `CONFIRMED` | `CANCELLED` | `COMPLETED`

---

## Authentication & Authorization

### JWT Flow

1. **Registration** (`POST /auth/register`):
   - User provides email, password, fullName, phoneNumber
   - Password is hashed with bcrypt (10 rounds)
   - Email verification token generated
   - Verification email sent via Nodemailer
   - JWT access token returned in response

2. **Login** (`POST /auth/login`):
   - Credentials validated against hashed password
   - Customers must have verified email
   - Users with `mustChangePassword=true` are blocked
   - JWT returned on success

3. **Protected Routes**:
   - Use `JwtAuthGuard` to extract and validate JWT from `Authorization: Bearer <token>` header
   - `RolesGuard` enforces role-based access using `@Roles()` decorator

### Password Reset Flow

1. User requests reset (`POST /auth/request-reset`) → 6-digit code sent to email (10-min expiry)
2. User confirms with code and new password (`POST /auth/confirm-reset`)
3. Admin password changes bypass email verification requirement

### Email Verification

- Token-based verification link: `GET /auth/verify-email?token=<token>`
- Marks `isEmailVerified=true` upon success

---

## API Endpoints

All routes are prefixed with `/api` (configured in `main.ts`). Below is the endpoint reference.

### Root Endpoint
| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| GET | `/` | Health check / welcome message | Public |

---

### Authentication (`/auth`)
| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| POST | `/auth/register` | Register new user (customer by default) | Public |
| POST | `/auth/login` | Login and receive JWT | Public |
| GET | `/auth/verify-email` | Verify email with token | Public |
| POST | `/auth/change-password` | Change logged-in user's password | Auth Required |
| POST | `/auth/request-reset` | Request password reset code | Auth Required |
| POST | `/auth/confirm-reset` | Confirm password reset with code | Auth Required |

---

### Vehicles (`/vehicles`)
| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| POST | `/vehicles` | Create new vehicle | Admin/Agent |
| PUT | `/vehicles/:id` | Update vehicle | Admin/Agent |
| DELETE | `/vehicles/:id` | Delete vehicle | Admin/Agent |
| GET | `/vehicles` | List all vehicles | Admin/Agent |
| GET | `/vehicles/featured` | Get featured vehicles (recent) | All Roles |
| GET | `/vehicles/browse` | Search available vehicles by filters | Customer |

**Browse Query Parameters**: `?location=...&category=...&from=...&to=...&q=...`

---

### Bookings (`/booking`)
| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| GET | `/booking/my-vehicles` | Get bookings for agent's vehicles | Agent |
| PATCH | `/booking/:id/status` | Update booking status | Agent |

---

### Payments (`/payments`)
| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| POST | `/payments` | Create payment and confirm booking | Customer |
| GET | `/payments` | Get user's payment history | Customer |
| GET | `/payments/invoice/:id` | Get invoice for a payment | Customer |

---

### Reviews (`/reviews`)
| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| POST | `/reviews` | Create vehicle review | Customer |
| PATCH | `/reviews/:id` | Update own review | Customer |
| DELETE | `/reviews/:id` | Delete own review | Customer |
| GET | `/reviews/my` | Get user's reviews | Customer |
| GET | `/reviews/vehicle/:vehicleId` | Get all reviews for a vehicle | All Auth Users |

---

### Admin (`/admin`)
| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| POST | `/admin/create-agent` | Create new agent account | Admin |
| GET | `/admin/stats` | Get system statistics | Admin |
| GET | `/admin/bookings` | Get all bookings | Admin |
| PATCH | `/admin/booking/:id/status` | Update any booking status | Admin |
| GET | `/admin/users` | Get all users | Admin |
| GET | `/admin/user` | Find user by email/name/role | Admin |
| PATCH | `/admin/update-user/:id` | Update user details | Admin |
| DELETE | `/admin/delete-user/:id` | Delete user | Admin |
| PATCH | `/admin/block-user/:id` | Block/unblock user | Admin |

---

### Agent (`/agent`)
| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| GET | `/agent/customers` | Get customers who booked agent's vehicles | Agent |
| GET | `/agent/payments` | Get payments for agent's vehicles | Agent |
| GET | `/agent/profile` | Get agent profile | Agent |
| PATCH | `/agent/profile` | Update agent profile | Agent |
| POST | `/agent/profile/photo` | Upload profile photo | Agent |
| POST | `/agent/change-password` | Change agent password | Agent |

---

### Customer (`/customer`)
| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| GET | `/customer/profile` | Get customer profile | Customer |
| PATCH | `/customer/profile` | Update customer profile | Customer |
| POST | `/customer/profile/photo` | Upload profile photo | Customer |
| POST | `/customer/change-password` | Change password | Customer |
| GET | `/customer/rentals` | Get rental history | Customer |

---

## Environment Variables

Create a `.env` file in the backend root directory:

```env
# Server
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL="postgresql://username:password@localhost:5432/car_rental_db?schema=public"

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Email (Nodemailer)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
MAIL_FROM="Car Rental <no-reply@carrental.com>"

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Frontend URL
FRONTEND_URL=http://localhost:4200
```

---

## Installation & Setup

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Setup database
# 1. Create PostgreSQL database
# 2. Update DATABASE_URL in .env

# Run Prisma migration
npx prisma migrate dev --name init

# (Optional) Seed database
npx prisma db seed

# Start development server
npm run start:dev
```

---

## Running the Application

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Development mode with hot-reload |
| `npm run start:debug` | Debug mode |
| `npm run build && npm run start:prod` | Production mode |
| `npm test` | Run unit tests |
| `npm run test:e2e` | Run E2E tests |
| `npm run test:cov` | Generate test coverage report |

---

## Project Structure

```
backend/
├── src/
│   ├── admin/                    # Admin module
│   ├── agent/                    # Agent module
│   ├── auth/                     # Authentication & Authorization
│   │   ├── strategies/           # JWT strategy
│   │   ├── guards/               # JWT & Role guards
│   │   └── decorators/           # @Roles() decorator
│   ├── booking/                  # Booking module
│   ├── customer/                 # Customer module
│   ├── mail/                     # Email service & templates
│   ├── payment/                  # Payment module
│   ├── prisma/                   # Database service
│   ├── review/                   # Review module
│   ├── utils/                    # Cloudinary service
│   ├── vehicle/                  # Vehicle module
│   ├── interfaces/               # TypeScript interfaces
│   ├── app.module.ts             # Root module
│   ├── main.ts                   # Entry point
│   └── *.spec.ts                 # Test files
├── prisma/
│   ├── schema.prisma             # Database schema
│   └── seed.ts                   # Seeder
├── test/                         # E2E tests
├── uploads/                      # Local file storage
├── package.json
├── tsconfig.json
└── README.md
```

---

## Third-Party Integrations

### Cloudinary
Handles image uploads for:
- User profile photos (2MB max, 400×400 auto-crop)
- Vehicle images (8MB max, 1200×800 optimized)
- Uploaded files stored in `car-rental/` folder structure

### Nodemailer + EJS
Sends transactional emails via SMTP. Templates located in `src/mail/templates/`:
- `verify-email.ejs` – Account verification
- `reset-code.ejs` – Password reset code
- `password-changed.ejs` – Password change confirmation

---

## Security Features

- **Bcrypt** password hashing (10 rounds)
- **JWT** signed with secret; 7-day expiry
- **Role-Based Access Control** via guards and decorators
- **Input validation** with class-validator (whitelist, forbidNonWhitelisted)
- **CORS** restricted to frontend origin (`http://localhost:4200`)
- **File upload validation** (size, format checks)
- **Prisma ORM** prevents SQL injection
- **Email verification** required for customers
- **Password reset codes** expire in 10 minutes
- **Admin block/unblock** user capability

---

## Error Handling

Standardized error responses:

```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Bad Request"
}
```

**Used Exceptions**:
- `BadRequestException` – Invalid input (400)
- `UnauthorizedException` – Auth failure (401)
- `ForbiddenException` – Permission denied (403)
- `NotFoundException` – Resource not found (404)
- `InternalServerErrorException` – Server error (500)

---

## Development Notes

- Global validation pipe enabled in `main.ts:16-22` (transforms & sanitizes DTOs)
- Static assets served from `/uploads` directory at `http://localhost:3000/uploads/...`
- Server listens on `PORT` from env (default: 3000)
- API is globally prefixed with `/api`

---

**Dante Car Rental Backend – Production Ready**
