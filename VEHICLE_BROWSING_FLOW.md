# Vehicle Browsing & Management Flow

## Overview
Vehicles managed by **Admin/Agent** (create/update/delete), **Customer browse** via public/filtered endpoints.

**Key Files**:
- `src/vehicle/vehicle.controller.ts` (endpoints)
- `src/vehicle/vehicle.service.ts` (logic)
- `prisma/schema.prisma` (Vehicle model)
- Frontend: `api/vehicleApi.ts` → `BrowseVehicles.tsx`

## Backend Endpoints

### 1. **Create Vehicle** (`POST /vehicles`)
```
@Roles(ADMIN, AGENT)
body: CreateVehicleDto
files: images[]
```
**Logic** (vehicle.service.create):
1. Validate DTO.
2. Upload images to Cloudinary → imageUrls[].
3. `prisma.vehicle.create({ ...dto, imageUrls, createdBy: req.user.sub })`.

### 2. **Update Vehicle** (`PUT /vehicles/:id`)
```
@Roles(ADMIN, AGENT)
```
**Logic**: Find existing → append/merge images → prisma.update.

### 3. **Browse/Search** (`GET /vehicles/browse`)
```
@Roles(CUSTOMER)
query: location, category, from, to, q
```
**Logic** (searchAvailableVehicles):
```
where: {
  location: { contains },
  category: equals,
  q: title contains,
  availableFrom <= from,
  availableTo >= to
}
orderBy createdAt desc
```
**Customer can't browse?** → 403 if calling protected or role guard strict.

### 4. **Featured** (`GET /vehicles/featured`)
```
@Roles(ADMIN, AGENT, CUSTOMER)
```
Recent 6 vehicles (last 7 days).

### 5. **List All** (`GET /vehicles`)
```
@Roles(ADMIN, AGENT)
```
Admin/Agent management list.

## Frontend Flow (vehicleApi.ts)
```
useBrowseVehiclesQuery(params)
useGetFeaturedVehiclesQuery()
useGetVehicleByIdQuery(id)
```

## Issue: Customer Can't Browse
**Error**: 403 Forbidden `/api/vehicles`

**Cause**:
- Frontend calls `/vehicles` (ADMIN/AGENT only).
- `/vehicles/browse` CUSTOMER ok, but frontend uses wrong endpoint.

**Fix**:
Frontend BrowseVehicles.tsx → useBrowseVehiclesQuery (not getVehicles).

## Complete Flow Diagram
```
Admin/Agent:
POST /vehicles → Cloudinary → Prisma → success

Customer:
GET /vehicles/featured → 6 cards
GET /vehicles/browse?location=... → filtered list
GET /vehicles/:id → detail → CreateBooking
```

**Test**:
```
curl localhost:3000/api/vehicles/featured  # CUSTOMER ok
curl -H "Authorization: Bearer TOKEN" localhost:3000/api/vehicles/browse  # CUSTOMER ok
```

**Prisma Model**:
```
model Vehicle {
  id            String    @id @default(uuid())
  title         String
  category      String
  pricePerDay   Float
  features      String[]
  imageUrls     String[]
  availableFrom DateTime
  availableTo   DateTime
  location      String
  createdBy     String
}
```

Customer browsing **works via /browse** endpoint. Frontend endpoint mismatch.

