INSERT INTO "User" (username, password, role, "updatedAt") 
VALUES ('admin_test', 'admin_test', 'ADMIN', NOW())
ON CONFLICT (username) DO UPDATE SET password = 'admin_test', role = 'ADMIN', "updatedAt" = NOW();
