# Admin Panel Security Checklist

## ✅ Już zaimplementowane:
- [ ] JWT Authentication w backend
- [ ] Role-based access (is_admin)
- [ ] Protected admin routes
- [ ] Secure token storage
- [ ] Auto logout on session expire

## 🔧 Do dodania w backend:
- [ ] Password hashing (bcrypt)
- [ ] Rate limiting na login endpoint
- [ ] CORS configuration
- [ ] API key dla admin endpoints
- [ ] Session timeout
- [ ] Audit logging

## 🛡️ Dodatkowe środki bezpieczeństwa:

### Environment Variables (.env):
```bash
# Security
ADMIN_API_KEY=your-super-secret-admin-key-here
JWT_SECRET_KEY=your-jwt-secret-key-minimum-32-characters
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Admin User (do pierwszego utworzenia)
ADMIN_EMAIL=admin@kgr33n.com
ADMIN_PASSWORD=super-secure-password-here
```

### Nginx/Cloudflare Security:
- Block direct access to /admin/* from non-admin IPs
- Rate limiting na poziomie serwera
- DDoS protection
- SSL certificates

### Monitoring:
- Log wszystkie admin actions
- Alert na nieudane próby logowania
- Monitor unusual API usage

## 🚨 Emergency Procedures:
1. **Suspected breach**: Change JWT secret, force logout all users
2. **Lost admin access**: Use emergency admin creation script
3. **API abuse**: Enable maintenance mode, block IPs

## 📱 Two-Factor Authentication (optional):
- TOTP (Google Authenticator)
- Email verification
- SMS backup codes
