import { db } from './server/_core/db.ts';
import { users } from './drizzle/schema.ts';

const allUsers = await db.select().from(users);
console.log('All users:', JSON.stringify(allUsers, null, 2));
