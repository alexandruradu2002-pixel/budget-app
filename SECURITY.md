# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| latest  | :white_check_mark: |

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
3. **Use strong passwords** for your Turso database
4. **Regularly update** your deployment to get security patches
5. **Enable rate limiting** on your reverse proxy (nginx, Cloudflare, etc.)

## Scope

This security policy applies to:
- The Budget App codebase
- Official Docker images
- Vercel deployments using our template

It does **NOT** cover:
- Third-party forks
- User-modified versions
- Infrastructure security (your hosting provider's responsibility)
