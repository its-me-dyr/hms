/**
 * Super Admin Password Hash Generator
 * 
 * Generates a bcrypt password hash to be placed into server/.env:
 * SUPER_ADMIN_PASSWORD_HASH=<generated-hash>
 * 
 * Usage: node src/utils/generateSuperAdminHash.js [password]
 */

const bcrypt = require('bcryptjs');

const password = process.argv[2] || 'SuperAdmin@2026!';

(async () => {
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);

  console.log('==============================================');
  console.log('Super Admin Password Hash Generator');
  console.log('==============================================');
  console.log('Plain Password: ', password);
  console.log('Bcrypt Hash:    ', hash);
  console.log('==============================================');
  console.log('Add the following to server/.env:');
  console.log(`SUPER_ADMIN_PASSWORD_HASH=${hash}`);
  console.log('==============================================');
})();
