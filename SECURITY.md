# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| latest  | :white_check_mark: |

## Security Implementations

### Authentication & Sessions

- **HttpOnly Cookies**: Session tokens stored in HttpOnly cookies, preventing XSS token theft
- **Secure Cookies**: HTTPS-only cookies in production
- **SameSite=Lax**: CSRF protection via cookie SameSite attribute
- **Session Expiration**: 30-day session duration with automatic cleanup
- **Sliding Expiration**: Sessions are extended on activity
- **Secure Session IDs**: Cryptographically random 64-character hex tokens

### Rate Limiting

Rate limiting protects against brute force attacks and API abuse:

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Authentication | 5 requests | 15 minutes |
| General API | 60 requests | 1 minute |
| Write Operations | 30 requests | 1 minute |

### Security Headers

All responses include security headers:

- `X-Content-Type-Options: nosniff` - Prevents MIME type sniffing
- `X-Frame-Options: DENY` - Prevents clickjacking
- `X-XSS-Protection: 1; mode=block` - XSS filter for legacy browsers
- `Referrer-Policy: strict-origin-when-cross-origin` - Controls referrer information
- `Content-Security-Policy` - Restricts resource loading (production only)

### Input Validation

All API inputs are validated using Zod schemas:

- Email format validation
- Password strength requirements (8+ chars, uppercase, lowercase, number)
- SQL injection prevention via parameterized queries
- Request body size limits

### Logging & Monitoring

- Sensitive data (passwords, tokens) automatically redacted from logs
- Security events logged (failed auth, rate limits)
- No PII in production logs

## Reporting a Vulnerability

If you discover a security vulnerability, please do **NOT** open a public issue.

Instead, please report it privately:

1. **Email**: Create a private security advisory on GitHub
2. **GitHub**: Use the "Report a vulnerability" button in the Security tab

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Depends on severity (critical: ASAP, high: 2 weeks, medium: 1 month)

## Security Best Practices for Self-Hosting

1. **Always use HTTPS** in production
2. **Keep your database credentials secret** - never commit `.env` files
3. **Use a strong APP_PASSWORD** (16+ characters recommended)
4. **Regularly update** your deployment to get security patches
5. **Enable additional rate limiting** on your reverse proxy (nginx, Cloudflare, etc.)
6. **Monitor logs** for suspicious activity
7. **Use environment variables** for all secrets

## Scope

This security policy applies to:
- The Budget App codebase
- Official Docker images
- Vercel deployments using our template

It does **NOT** cover:
- Third-party forks
- User-modified versions
- Infrastructure security (your hosting provider's responsibility)
