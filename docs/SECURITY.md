# Security

We take security seriously. This document outlines our practices and how to report issues.

## Reporting Vulnerabilities

If you discover a security vulnerability, please email us at **security@silentreview.app** with:

- A clear description of the issue.
- Steps to reproduce.
- Potential impact.
- Any suggested fixes.

We will respond within 48 hours and work with you to resolve the issue responsibly.

## Security Practices

- **Authentication:** JWT access tokens (short-lived) and HTTP-only refresh token cookies.
- **Passwords:** Hashed with bcrypt (12 rounds).
- **Rate limiting:** Login and OAuth endpoints are rate-limited.
- **Input validation:** All API inputs validated with Zod.
- **SQL injection:** Prisma ORM prevents raw SQL injection.
- **CORS:** Restricted to the configured `WEB_APP_URL`.
- **Secrets:** Stored in environment variables, never committed.
- **Dependency updates:** Automated via Dependabot.

## Data Protection

- Users can request a full data export at `/api/export/me`.
- Account deletion can be requested via support.
- Regional middleware supports GDPR/CCPA requirements.

## Secure Deployment Checklist

- [ ] Change default JWT secrets.
- [ ] Use strong PostgreSQL password.
- [ ] Enable HTTPS with valid SSL certificates.
- [ ] Restrict server SSH access.
- [ ] Enable automated security updates on the host.
- [ ] Configure AWS IAM least privilege for backups/uploads.
