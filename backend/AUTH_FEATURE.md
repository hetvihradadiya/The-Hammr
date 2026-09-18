# Hammr Authentication Feature

Implemented according to Phase 4 and the feature-development instructions.

## Endpoints

- POST `/api/v1/auth/register`
- POST `/api/v1/auth/login`
- POST `/api/v1/auth/2fa/setup/verify`
- POST `/api/v1/auth/2fa/verify`
- GET `/api/v1/auth/me`
- POST `/api/v1/auth/logout`

Authentication is stored in an HTTP-only cookie. Seller login requires TOTP after password verification. Seller registration starts the one-time TOTP setup flow.

## Security

- bcrypt password hashing
- generic invalid-credential response
- strict Zod request validation
- unique email constraint
- rate limiting
- encrypted TOTP secrets at rest
- HTTP-only cookies
- no password hash in responses
- no secret logging
