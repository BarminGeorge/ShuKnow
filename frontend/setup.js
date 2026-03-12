const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Create directories
const typesDir = path.join(__dirname, 'src', 'types');
const storesDir = path.join(__dirname, 'src', 'stores');

fs.mkdirSync(typesDir, { recursive: true });
fs.mkdirSync(storesDir, { recursive: true });

console.log('✓ Created directory:', typesDir);
console.log('✓ Created directory:', storesDir);

// Install zustand
console.log('\nInstalling zustand...');
execSync('npm install zustand', { stdio: 'inherit', cwd: __dirname });
