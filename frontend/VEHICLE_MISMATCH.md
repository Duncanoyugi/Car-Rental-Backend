# Backend vs Frontend Vehicle Browsing Mismatches

## 1. **Primary Issue: Wrong Endpoint (Customer 403)**

**Backend**:
```
GET /vehicles/browse @Roles(CUSTOMER) → filtered available vehicles
```

**Frontend**:
```
useGetVehiclesQuery() → GET /vehicles @Roles(ADMIN, AGENT) → 403
```

**Mismatch**:
Frontend calls **admin/vehicle management endpoint** instead of **customer browse**.

**Fix**: BrowseVehicles.tsx `useGetVehiclesQuery()` → `useBrowseVehiclesQuery()`.

## 2. **Public vs Protected**

**Backend**:
- `/vehicles` → ADMIN/AGENT (management)
- `/vehicles/browse` → CUSTOMER (search)
- `/vehicles/featured` → CUSTOMER/AGENT/ADMIN (public-ish)

**Frontend Routes**:
- `/vehicles` → BrowseVehicles (public?)
- `/customer/vehicles` → same page (protected)

**Mismatch**: Public `/vehicles` calls protected endpoint → inconsistent.

**Fix**: Public use `/vehicles/featured` or make `/vehicles` public.

## 3. **Filtering Logic**

**Backend** (`searchAvailableVehicles`):
```
- location contains
- category equals  
- q: title contains
- availableFrom <= from, availableTo >= to
```

**Frontend** (BrowseVehicles.tsx):
```
- Client-side: search title/location, category exact, maxPrice <= pricePerDay
```

**Mismatch**: Frontend filters **price** client-side (backend has no price filter).

**Fix**: Backend add `maxPrice` filter or keep client.

## 4. **Data Structure**

**Backend** Vehicle:
```
id, title, category, pricePerDay, features[], imageUrls[], availableFrom/to, location, createdBy
```

**Frontend**:
```
Assumes vehicle.imageUrls[0], vehicle.pricePerDay, mock rating
```

**Match**: OK, but frontend mock ratings → add backend avgRating.

## 5. **Public Browse**

**Backend**: No truly public endpoint (all guarded).

**Frontend**: `/vehicles` public route but 403 → broken public flow.

**Fix**: Add public `/vehicles/public` or relax `/vehicles/browse`.

## Summary Table

| Aspect | Backend | Frontend | Status | Fix |
|--------|---------|----------|--------|-----|
| List   | /vehicles/browse (CUSTOMER) | useGetVehiclesQuery → /vehicles (403) | ❌ | useBrowseVehiclesQuery |
| Filter | Server-side date/location | Client-side search/price | ⚠️ | Add price filter backend |
| Public | No | /vehicles expects list | ❌ | Add public endpoint |
| Detail | /vehicles/:id ? | useGetVehicleByIdQuery | ? | Check roles |

## Quick Fix (Priority)

**BrowseVehicles.tsx** line ~25:
```tsx
- const { data: vehicles } = useGetVehiclesQuery(undefined);
+ const { data: vehicles } = useBrowseVehiclesQuery({});
```

**Test**:
```
Frontend browse → vehicles load → no 403
```

**Result**: Customer can browse!

