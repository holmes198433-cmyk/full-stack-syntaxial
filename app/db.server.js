/*
  All rights reserved 2026 © Syntaxial - Pro Modernis
  Proprietary and confidential.
*/

import { PrismaClient } from '@prisma/client';

let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  // Prevent creating multiple instances in development (HMR)
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  prisma = global.prisma;
}

export default prisma;