Backend created: simple Express + SQLite server.

How to run locally:
1. cd server
2. npm install
3. ADMIN_TOKEN=yourtoken npm start
- Server will run on port 3001 by default.

Endpoints:
- GET /api/health
- POST /api/register  { name, username, email, password, sponsorCode }
- GET /api/users?adminToken=devtoken   (or set header x-admin-token)

The server stores data in server/database.sqlite
