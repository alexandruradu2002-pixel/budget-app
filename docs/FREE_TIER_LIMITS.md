# Hosting Limits & User Cap

This project is **open source** - you can self-host it with unlimited users. The information below applies to the **public hosted instance**.

## Public Hosted Instance

The free hosted instance has the following limits due to running on free tiers:

| Resource | Limit | Reason |
|----------|-------|--------|
| **User Cap** | **5 users** | Resend free tier (100 emails/day) |

### Current Status

- Running on: Vercel (Hobby) + Turso (Free) + Resend (Free)
- Cost: **$0/month**
- User cap: **5** (me + idk)

If the project receives funding or sponsorship in the future, limits may be increased.

---

## Self-Hosting (Unlimited)

Want unlimited users? **Self-host it!** This is open source software.

### Quick Setup

```bash
# Clone and deploy
git clone https://github.com/alexandruradu2002-pixel/budget-app
cd budget-app

# Set unlimited users in .env.local
USER_CAP=0  # or USER_CAP=unlimited
DAILY_EMAIL_LIMIT=0  # or DAILY_EMAIL_LIMIT=unlimited

# Deploy to your own Vercel/server
vercel deploy
```

See [INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md) for detailed setup instructions.

---

## Environment Variables

```bash
# Limit users on your instance
USER_CAP=5              # Default: 5 (0 or "unlimited" for no limit)

# Limit daily emails (Resend free tier)
DAILY_EMAIL_LIMIT=100   # Default: 100 (0 or "unlimited" for no limit)
```

**Note**: Password-based auth (no emails) bypasses email limits. See [INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md).
