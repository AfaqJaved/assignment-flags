# Timezone Handling in `GetFreeSlotsForUser`

## Core Principle

Working hours are stored as **local HH:mm strings** relative to the provider's timezone.
Booked slots in the DB are stored as **UTC ISO 8601 strings**.

The API always returns slots in **UTC**. The frontend is responsible for converting UTC to the visitor's local timezone for display.

---

## The Rule

> `command.timezone` must always be the **provider's timezone**, not the visitor's.

It is used solely to interpret what `"09:00"` means in absolute time (UTC). The visitor's timezone is a display concern — it never touches the API.

---

## Dry Run

### Setup

|                        | Value                           |
| ---------------------- | ------------------------------- |
| Provider timezone      | `Asia/Karachi` (UTC+5)          |
| Provider working hours | `09:00` – `17:00` (local)       |
| Existing booking       | `10:00` – `11:00` Karachi time  |
| Slot duration          | 60 mins                         |
| Buffer time            | 0 mins                          |
| Date requested         | `2025-06-26`                    |
| Visitor timezone       | `America/New_York` (UTC-4, EDT) |

---

### Step 1 — API Request (frontend → backend)

The frontend calls the API passing the **provider's** timezone:

```
GET /users/:userId/free-slots?date=2025-06-26&timezone=Asia/Karachi&durationInMins=60&bufferTimeInMins=0
```

> The visitor's timezone (`America/New_York`) is NOT sent to the API.

---

### Step 2 — Convert working hours to UTC (backend)

```
workingHourToUTC("2025-06-26", "09:00", "Asia/Karachi")
→ "2025-06-26T04:00:00.000Z"   ← windowStart (9 AM Karachi = 4 AM UTC)

workingHourToUTC("2025-06-26", "17:00", "Asia/Karachi")
→ "2025-06-26T12:00:00.000Z"   ← windowEnd   (5 PM Karachi = 12 PM UTC)
```

---

### Step 3 — Fetch booked slots (backend)

The existing booking (`10:00–11:00` Karachi) is stored in the DB as UTC:

```
bookedSlots = [
  { startTime: "2025-06-26T05:00:00.000Z", endTime: "2025-06-26T06:00:00.000Z" }
]
```

---

### Step 4 — Generate slots (backend)

Working window in UTC milliseconds:

- `windowStart` = `04:00 UTC`
- `windowEnd` = `12:00 UTC`
- Each slot = 60 mins

| Slot (UTC)    | Conflict?    | Included? |
| ------------- | ------------ | --------- |
| 04:00 – 05:00 | No           | ✅        |
| 05:00 – 06:00 | Yes (booked) | ❌        |
| 06:00 – 07:00 | No           | ✅        |
| 07:00 – 08:00 | No           | ✅        |
| 08:00 – 09:00 | No           | ✅        |
| 09:00 – 10:00 | No           | ✅        |
| 10:00 – 11:00 | No           | ✅        |
| 11:00 – 12:00 | No           | ✅        |

---

### Step 5 — API Response (UTC)

```json
[
  { "startTime": "2025-06-26T04:00:00.000Z", "endTime": "2025-06-26T05:00:00.000Z" },
  { "startTime": "2025-06-26T06:00:00.000Z", "endTime": "2025-06-26T07:00:00.000Z" },
  { "startTime": "2025-06-26T07:00:00.000Z", "endTime": "2025-06-26T08:00:00.000Z" },
  { "startTime": "2025-06-26T08:00:00.000Z", "endTime": "2025-06-26T09:00:00.000Z" },
  { "startTime": "2025-06-26T09:00:00.000Z", "endTime": "2025-06-26T10:00:00.000Z" },
  { "startTime": "2025-06-26T10:00:00.000Z", "endTime": "2025-06-26T11:00:00.000Z" },
  { "startTime": "2025-06-26T11:00:00.000Z", "endTime": "2025-06-26T12:00:00.000Z" }
]
```

---

### Step 6 — Frontend Display (convert UTC → visitor's local timezone)

The frontend knows the visitor's timezone (`America/New_York`, UTC-4 EDT) and converts each slot:

```ts
// Example using Intl.DateTimeFormat
const display = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
  });
```

| What backend returned (UTC) | What New York visitor sees |
| --------------------------- | -------------------------- |
| 04:00 – 05:00 UTC           | 12:00 AM – 1:00 AM         |
| 06:00 – 07:00 UTC           | 2:00 AM – 3:00 AM          |
| 07:00 – 08:00 UTC           | 3:00 AM – 4:00 AM          |
| 08:00 – 09:00 UTC           | 4:00 AM – 5:00 AM          |
| 09:00 – 10:00 UTC           | 5:00 AM – 6:00 AM          |
| 10:00 – 11:00 UTC           | 6:00 AM – 7:00 AM          |
| 11:00 – 12:00 UTC           | 7:00 AM – 8:00 AM          |

The New York visitor sees available slots from **12:00 AM to 8:00 AM** their local time — because the Karachi provider only works 9 AM–5 PM their time, which overlaps only that window in New York.

---

## What Goes Wrong If You Use the Visitor's Timezone

If `command.timezone = "America/New_York"` is passed instead:

```
workingHourToUTC("2025-06-26", "09:00", "America/New_York")
→ "2025-06-26T13:00:00.000Z"   ← 9 AM New York = 1 PM UTC
```

The window would become `1 PM – 9 PM UTC` = `6 PM – 2 AM Karachi` — the provider's actual working window is completely missed. Conflict detection against DB bookings also breaks because the bookings are still stored relative to Karachi time.

---

## Summary

| Concern                                 | Owner                                    |
| --------------------------------------- | ---------------------------------------- |
| Interpreting `"09:00"` as absolute time | API (`command.timezone` = provider's TZ) |
| Storing/fetching bookings               | DB (always UTC)                          |
| Generating and returning slots          | API (always UTC)                         |
| Displaying times to the visitor         | Frontend (converts UTC → visitor's TZ)   |
