# Customer Authentication Flow

## Overview
The backend implements customer registration, login, and access control using JWT authentication in a NestJS + Prisma + PostgreSQL stack. Customers are Users with \`role: 'CUSTOMER'\`.

Key files:
- \`src/auth/auth.controller.ts\`, \`auth.service.ts\`
- \`src/customer/customer.controller.ts\`
- \`prisma/schema.prisma\` (User model)
- Guards: \`JwtAuthGuard\`, \`RolesGuard\`

## 1. Registration (\`POST /auth/register\`)
**Request Body**: \`RegisterDto\` (inferred: \`{ fullName, email, password, phoneNumber? }\`), optional \`profileImage\` multipart file.

**Logic** (\`auth.service.register\`):
1. Check if email exists → throw \`BadRequestException\` if yes.
2. Hash password (bcrypt, salt=10).
3. Generate \`emailVerifyToken\` (randomBytes hex).
4. **Optional**: Upload profileImage to Cloudinary (\`UploadType.USER_PROFILE\`).
5. Create User:
   \`\`\`
   {
     fullName, email, password: hashed, phoneNumber?, profileImage?,
     role: 'CUSTOMER', isEmailVerified: false, emailVerifyToken
   }
   \`\`\`
6. Generate verification link: \`http://localhost:5173/verify-email?token=\${emailVerifyToken}\`.
7. Send async verification email (template: \`verify-email\`; non-blocking, logs error if fails).
8. **Auto-generate JWT**: Payload \`{ sub: user.id, email, role }\` → \`access_token\`.
9. Return \`{ access_token, user: { id, fullName, email, role, profileImage?, phoneNumber? } }\`.

**Notes**: 
- Registration succeeds even if email send fails.
- Token issued immediately (unverified), but login enforces verification.

**Verification** (\`GET /auth/verify-email?token=...\`):
- Find user by \`emailVerifyToken\`.
- Update \`isEmailVerified: true, emailVerifyToken: null\`.
- Return success message.

## 2. Login (\`POST /auth/login\`)
**Request Body**: \`LoginDto\` \`{ email, password }\`.

**Logic** (\`auth.service.login\`):
1. Find user by email → throw \`UnauthorizedException\` if not found.
2. Verify password (bcrypt.compare) → throw \`UnauthorizedException\` if mismatch.
3. **Guards for CUSTOMER**:
   - \`!user.isEmailVerified\` → throw \`UnauthorizedException('Please verify your email...')\`.
   - \`user.mustChangePassword\` → throw \`UnauthorizedException('You must change...')\`.
4. Generate JWT: Payload \`{ sub: user.id, email, role }\` → \`access_token\`.
5. Return \`{ access_token, user: { id, fullName, email, role, profileImage?, phoneNumber? } }\`.

**Social Login** (Google/Apple OAuth):
- \`/auth/google\` & \`/auth/google/callback\` (similar for Apple).
- Upsert user by email, auto-verify if needed, issue JWT, redirect to frontend with token/user in query.

## 3. Accessing the System (Post-Login)
**Protected Routes**: All \`/customer/*\` guarded by:
\`\`\`
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CUSTOMER)
\`\`\`
- \`JwtAuthGuard\`: Validates \`Authorization: Bearer <token>\`, extracts \`req.user\` from JWT payload.
- \`RolesGuard\`: Checks \`req.user.role === 'CUSTOMER'\`.

**Examples** (\`customer.controller.ts\`):
- \`GET /customer/profile\` → \`customerService.getProfile(req.user.id)\`
- \`PATCH /customer/profile\` → update profile.
- \`POST /customer/profile/photo\` → upload image.
- \`GET /customer/rentals\` → rental history.
- \`POST /customer/change-password\`

**Other Features**:
- Password reset: \`/auth/request-reset\` → send 6-digit code email; \`/auth/confirm-reset\`.
- \`mustChangePassword\` flag for forced changes (admin-set?).

## Database Schema (User Model Relevant Fields)
\`\`\`
model User {
  id                 String    @id @default(uuid())
  fullName           String
  email              String    @unique
  password           String    // hashed
  phoneNumber        String?
  role               Role      @default(CUSTOMER)  // CUSTOMER, AGENT, ADMIN
  profileImage       String?   // Cloudinary URL
  isEmailVerified    Boolean   @default(false)
  emailVerifyToken   String?
  resetToken         String?   // 6-digit code
  resetTokenExpiry   DateTime?
  mustChangePassword Boolean   @default(false)
  isBlocked          Boolean   @default(false)
  // relations: bookings, reviews, favorites, agentRequests
}
\`\`\`

## Error Handling
- \`BadRequestException\`: Duplicate email, invalid tokens/codes.
- \`UnauthorizedException\`: Invalid creds, unverified email, must change pw.

## Testing
Use \`backend/restclient/register.http\` or similar for HTTPie/Postman tests.

**Flow Diagram**:
\`\`\`
Register → Create User (unverified) → Send Verify Email → Auto JWT

[Verify Email] → isEmailVerified=true

Login → Validate pw + verified + !mustChange → JWT → Access /customer/*
\`\`\`

This covers the complete customer auth lifecycle.

