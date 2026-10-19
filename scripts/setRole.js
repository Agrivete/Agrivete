/**
 * Change a user's role.
 * Usage: npm run set-role -- <email> <role>
 * Example: npm run set-role -- manager@agrivet.local manager
 */
import { User } from '../models/User.js';
import connectDB from '../lib/mongodb.js';

const VALID_ROLES = ['owner', 'manager', 'staff', 'admin'];

async function main() {
  const email = process.argv[2];
  const role = process.argv[3];

  if (!email || !role) {
    console.error('Usage: npm run set-role -- <email> <role>');
    console.error('Roles: owner | manager | staff | admin');
    process.exit(1);
  }

  if (!VALID_ROLES.includes(role)) {
    console.error(`Invalid role "${role}". Must be one of: ${VALID_ROLES.join(', ')}`);
    process.exit(1);
  }

  await connectDB();

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }

  if (user.role === role) {
    console.log(`${email} is already ${role}`);
    process.exit(0);
  }

  const previousRole = user.role;
  user.role = role;
  user.updatedAt = new Date();
  await user.save();

  console.log(`✓ ${email}: ${previousRole} → ${role}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Failed to update role:', err);
  process.exit(1);
});
