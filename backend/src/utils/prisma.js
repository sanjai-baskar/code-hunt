const { PrismaClient } = require('@prisma/client');

// Singleton Prisma client — shared across all route files to avoid
// exhausting the MongoDB connection pool under concurrent load.
const prisma = global._prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') global._prisma = prisma;

module.exports = prisma;
