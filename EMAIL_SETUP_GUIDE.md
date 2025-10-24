# Email Configuration Guide for Password Reset

This guide will help you set up email sending for password reset codes in Mentora.

## 📧 Quick Setup

1. **Copy the environment file:**
   ```bash
   cd backend
   cp .env.example .env
   ```

2. **Choose your email provider** (Gmail recommended for testing)

3. **Update the `.env` file** with your email credentials

4. **Restart the backend** to apply changes

---

## 🔧 Email Provider Setup

### Option 1: Gmail (Recommended)

#### Step 1: Enable App Passwords
1. Go to your Google Account: https://myaccount.google.com/
2. Select **Security** from the left menu
3. Under "Signing in to Google", select **2-Step Verification** (enable if not already)
4. Scroll down and select **App passwords**
5. Select app: **Mail**
6. Select device: **Other (Custom name)** → Type "Mentora"
7. Click **Generate**
8. Copy the 16-character password (remove spaces)

#### Step 2: Update .env
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-16-char-app-password
FROM_EMAIL=your-email@gmail.com
FROM_NAME=Mentora
SMTP_USE_TLS=True
```

### Option 2: Outlook/Hotmail

#### Step 1: Enable SMTP
1. Go to Outlook settings
2. Navigate to **Sync email**
3. Make sure IMAP is enabled

#### Step 2: Update .env
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASSWORD=your-password
FROM_EMAIL=your-email@outlook.com
FROM_NAME=Mentora
SMTP_USE_TLS=True
```

### Option 3: Other Email Providers

#### Yahoo Mail
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_USER=your-email@yahoo.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=your-email@yahoo.com
SMTP_USE_TLS=True
```

#### ProtonMail Bridge (Self-hosted)
```env
SMTP_HOST=127.0.0.1
SMTP_PORT=1025
SMTP_USER=your-email@protonmail.com
SMTP_PASSWORD=your-bridge-password
FROM_EMAIL=your-email@protonmail.com
SMTP_USE_TLS=False
```

#### SendGrid (Production)
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
FROM_EMAIL=noreply@yourdomain.com
SMTP_USE_TLS=True
```

---

## 🧪 Testing Email Configuration

### Method 1: Test via API

```bash
# Start the backend
cd backend
source ../.venv/bin/activate
uvicorn app.main:app --reload

# In another terminal, test password reset
curl -X POST http://localhost:8000/api/auth/password-reset/request \
  -H "Content-Type: application/json" \
  -d '{"email":"your-test-email@gmail.com"}'
```

**Expected Response:**
```json
{
  "message": "If the email exists, a reset code has been sent",
  "email": "your-test-email@gmail.com"
}
```

**Check your email inbox** for the reset code!

### Method 2: Test via Frontend

1. Start the frontend: `cd frontend && npm start`
2. Go to http://localhost:3000
3. Click "Forgot your password?"
4. Enter your email
5. Check your inbox for the 6-digit code
6. Enter the code and reset your password

---

## 🔍 Troubleshooting

### Email Not Sending

1. **Check backend logs:**
   ```bash
   # Look for email-related errors
   tail -f /tmp/backend.log
   ```

2. **Common Issues:**

   #### "Authentication failed"
   - Double-check your email and password
   - For Gmail, make sure you're using an **App Password**, not your regular password
   - Verify 2-Step Verification is enabled

   #### "Connection refused"
   - Check SMTP_HOST and SMTP_PORT are correct
   - Verify your firewall isn't blocking outbound SMTP connections

   #### "TLS/SSL error"
   - Try toggling `SMTP_USE_TLS` between `True` and `False`
   - For port 465, use `SMTP_USE_TLS=False`
   - For port 587, use `SMTP_USE_TLS=True`

3. **Development Mode:**
   If email is not configured, the system will:
   - Print the code to the console
   - Return the code in the API response (`dev_code` field)
   - This allows testing without email setup

---

## 🔒 Security Best Practices

### ✅ DO:
- Use **App Passwords** instead of your main password (Gmail)
- Store credentials in `.env` file (never commit to git)
- Use environment variables in production
- Rotate passwords regularly
- Use a dedicated email account for app notifications

### ❌ DON'T:
- Commit `.env` file to version control
- Share your email credentials
- Use your personal email in production
- Store passwords in code

---

## 🚀 Production Deployment

For production, use a dedicated email service:

### Recommended Services:
1. **SendGrid** - 100 emails/day free
   - https://sendgrid.com/

2. **AWS SES** - $0.10 per 1,000 emails
   - https://aws.amazon.com/ses/

3. **Mailgun** - 5,000 emails/month free
   - https://www.mailgun.com/

4. **Postmark** - 100 emails/month free
   - https://postmarkapp.com/

### Example: SendGrid Setup
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=SG.your-api-key-here
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=Mentora
SMTP_USE_TLS=True
```

---

## 📊 Email Template

The password reset email includes:
- **Beautiful HTML design** with gradient header
- **6-digit code** in large, easy-to-read format
- **Expiry warning** (15 minutes)
- **Security notice** about unsolicited requests
- **Plain text fallback** for email clients that don't support HTML

### Preview:
```
┌─────────────────────────────────┐
│   🎓 Mentora                    │
│   Password Reset Request        │
├─────────────────────────────────┤
│                                 │
│ Hello User,                     │
│                                 │
│ Your password reset code is:    │
│                                 │
│        ┌─────────┐             │
│        │ 123456  │             │
│        └─────────┘             │
│                                 │
│ ⏰ Expires in 15 minutes        │
│                                 │
└─────────────────────────────────┘
```

---

## 🛠️ Advanced Configuration

### Custom Email Template

Edit `/backend/app/core/email.py` to customize the email HTML:

```python
def send_password_reset_email(self, to_email: str, reset_code: str, username: str = "User"):
    # Modify html_content here
    html_content = f"""
    <!-- Your custom HTML template -->
    """
```

### Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SMTP_HOST` | Yes | - | SMTP server hostname |
| `SMTP_PORT` | Yes | 587 | SMTP server port |
| `SMTP_USER` | Yes | - | SMTP username |
| `SMTP_PASSWORD` | Yes | - | SMTP password |
| `FROM_EMAIL` | Yes | - | Sender email address |
| `FROM_NAME` | No | "Mentora" | Sender display name |
| `SMTP_USE_TLS` | No | True | Use TLS encryption |

---

## ✅ Verification Checklist

Before going to production:

- [ ] Email credentials configured in `.env`
- [ ] Test email sending works
- [ ] Verify email arrives in inbox (not spam)
- [ ] Check email template displays correctly
- [ ] Confirm 6-digit code works
- [ ] Test code expiry (15 minutes)
- [ ] Verify security (used codes can't be reused)
- [ ] Remove `dev_code` from responses (automatic when email configured)
- [ ] Use dedicated email service (SendGrid, etc.)
- [ ] Set up SPF/DKIM records for your domain

---

## 📞 Support

If you need help:
1. Check the troubleshooting section above
2. Review backend logs for errors
3. Test with development mode first (no email config)
4. Verify your email provider allows SMTP access

---

**Note:** Email configuration is optional. If not configured, the system will operate in development mode and print codes to the console.
