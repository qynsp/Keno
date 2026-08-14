# Casino Keno Ethiopia — Admin Dashboard & Setup Instructions

## 1. Accessing the Admin Dashboard

The Admin Dashboard is integrated directly into the application and accessible via the `/admin` URL path or the in-app interface.

- **URL Route:** Navigate directly to `/admin` in your browser (e.g. `https://your-domain.app/admin`).
- **Profile / Header:** 
  - If logged in as an Admin, click the **Admin Shield icon** in the top header or click **Open Admin Dashboard** in the Profile tab.
  - If logged in as a standard user, click **Admin Login Portal (/admin)** in the Profile tab.

---

## 2. Default System Admin Account

The application seeds a default Administrator account automatically on initialization:

- **Username:** `admin`
- **Default Password:** `admin` (or `admin123`)
- **Role:** `ADMIN`

To log in:
1. Go to `/admin`.
2. Enter `admin` as username and `admin` as password, or click **One-Click Admin Login**.
3. You will gain full access to the Admin Dashboard.

---

## 3. How to Create or Promote Additional Admin Accounts

### Option A: From the Admin Dashboard UI (Recommended)
1. Log in to `/admin` as an existing Admin.
2. Click the **Users** tab in the Admin Dashboard.
3. Search for the player by username or Telegram ID.
4. Click **Promote** next to the user's name to elevate their role to `ADMIN`.

### Option B: Via REST API Endpoint
Send an authenticated HTTP POST request using an existing Admin token:

```http
POST /api/admin/users/role
Authorization: Bearer <YOUR_ADMIN_JWT_TOKEN>
Content-Type: application/json

{
  "userId": "usr_123456789",
  "role": "ADMIN"
}
```

### Option C: Environment Variable Override
You can optionally set the custom admin password in your environment variables or `.env` file:
```env
ADMIN_PASSWORD=your_secure_password_here
```

---

## 4. Key Features of the Admin Dashboard

- **Overview:** Real-time stats (Total Bets, Total Payouts, House Revenue, Active Players, Pending Approvals).
- **Finance Approvals:** Approve or reject Telebirr & CBE Birr Deposit / Withdrawal requests with custom rejection reasons.
- **Manual Payment Settings:** Configure Telebirr phone & holder, CBE Birr phone & holder, min/max thresholds, and screenshot requirement.
- **Voucher System:** Generate promotional claim codes with custom ETB values and usage limits.
- **User Management:** Search registered players, adjust ETB balances with custom audit notes, and elevate roles.
- **Game Controls:** Pause/Resume draw engine, adjust house margin %, or force advance to next round.
- **Payout Tiers:** Customize win multipliers for 1 to 10 number picks.
- **Announcements:** Broadcast live banner notifications to all active players.
- **Audit Trail:** View full history of administrative actions.
