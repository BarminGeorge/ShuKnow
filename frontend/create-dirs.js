const fs = require('fs');
const path = require('path');

// Create directories
const dirs = [
  path.join(__dirname, 'src', 'types'),
  path.join(__dirname, 'src', 'utils'),
  path.join(__dirname, 'src', 'stores'),
  path.join(__dirname, 'src', 'hooks'),
  path.join(__dirname, 'src', 'components', 'sidebar'),
  path.join(__dirname, 'src', 'components', 'chat'),
  path.join(__dirname, 'src', 'components', 'folder'),
  path.join(__dirname, 'src', 'components', 'editor'),
  path.join(__dirname, 'src', 'components', 'settings'),
  path.join(__dirname, 'src', 'components', 'common'),
];

console.log('Creating directories...\n');
dirs.forEach(dir => {
  fs.mkdirSync(dir, { recursive: true });
  console.log('✓ Created: ' + dir);
});

console.log('\nVerifying directories...\n');
dirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log('✓ Verified: ' + dir);
  } else {
    console.log('✗ Failed: ' + dir);
  }
});

console.log('\nDone!');
