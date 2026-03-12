#!/usr/bin/env python3
import os
import subprocess

# Create directories
os.makedirs(r'C:\Users\energ\ShuKnow\frontend\src\types', exist_ok=True)
os.makedirs(r'C:\Users\energ\ShuKnow\frontend\src\stores', exist_ok=True)

print("✓ Directories created successfully")

# Install zustand
os.chdir(r'C:\Users\energ\ShuKnow\frontend')
result = subprocess.run(['npm', 'install', 'zustand'])
exit(result.returncode)
