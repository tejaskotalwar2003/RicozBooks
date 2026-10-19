import mongoose from 'mongoose';
import { User } from '../models/User';
import { hashPassword } from '../utils/security';
import { AuditService } from '../services/audit.service';
import { config } from '../config';

async function main() {
  const args = process.argv.slice(2);
  let email = '';
  let password = '';
  let name = 'Platform Super Administrator';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email' && args[i + 1]) email = args[++i];
    if (args[i] === '--password' && args[i + 1]) password = args[++i];
    if (args[i] === '--name' && args[i + 1]) name = args[++i];
  }

  if (!email || !password) {
    console.error('Usage: tsx src/scripts/provisionSuperAdmin.ts --email <email> --password <password> [--name <name>]');
    process.exit(1);
  }

  await mongoose.connect(config.mongoUri);
  console.log('[OK] Connected to MongoDB.');

  const password_hash = await hashPassword(password);
  let user = await User.findOne({ email: email.toLowerCase() });

  if (user) {
    user.is_superuser = true;
    user.is_active = true;
    user.role = 'SUPER_ADMIN';
    user.password_hash = password_hash;
    if (name) user.full_name = name;
    await user.save();
    console.log(`[OK] Successfully upgraded user '${email}' to Platform Super Administrator.`);
  } else {
    user = await User.create({
      email: email.toLowerCase(),
      password_hash,
      full_name: name,
      role: 'SUPER_ADMIN',
      is_superuser: true,
      is_active: true,
    });
    console.log(`[OK] Created new Platform Super Administrator '${email}'.`);
  }

  await AuditService.logEvent({
    userId: user._id,
    userEmail: user.email,
    action: 'SUPER_ADMIN_PROVISIONED',
    recordType: 'USER',
    recordId: String(user._id),
    details: { email: user.email, role: 'SUPER_ADMIN', provisioned_via: 'CLI' },
  });

  await mongoose.disconnect();
  console.log('[OK] Audit event logged and database connection closed.');
  process.exit(0);
}

main().catch((err) => {
  console.error('[ERROR] Super Admin provisioning failed:', err);
  process.exit(1);
});
