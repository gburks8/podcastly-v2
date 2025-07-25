#!/usr/bin/env node
// Script to create a corrected .replit file without the problematic package layer flag

import { writeFileSync } from 'fs';

console.log('🔧 Fixing .replit configuration to remove REPLIT_DISABLE_PACKAGE_LAYER flag...');

const correctedConfig = `modules = ["nodejs-20", "web", "postgresql-16"]
run = "npm run dev"
hidden = [".config", ".git", "generated-icon.png", "node_modules", "dist"]

[nix]
channel = "stable-24_05"
packages = ["ffmpeg"]

[deployment]
deploymentTarget = "autoscale"
build = ["sh", "-c", "node vite-free-build.js"]
run = ["sh", "-c", "NODE_ENV=production node dist/index.js"]

[workflows]
runButton = "Project"

[[workflows.workflow]]
name = "Project"
mode = "parallel"
author = "agent"

[[workflows.workflow.tasks]]
task = "workflow.run"
args = "Start application"

[[workflows.workflow]]
name = "Start application"
author = "agent"

[[workflows.workflow.tasks]]
task = "shell.exec"
args = "npm run dev"
waitForPort = 5000

[[ports]]
localPort = 5000
externalPort = 80

[[ports]]
localPort = 5001
externalPort = 3000
`;

try {
  writeFileSync('.replit', correctedConfig);
  console.log('✅ .replit file corrected!');
  console.log('🗑️  Removed: REPLIT_DISABLE_PACKAGE_LAYER=true flag');
  console.log('📦 Deployment run command now uses standard package resolution');
  console.log('🚀 Your deployment should now work without package layer issues!');
} catch (error) {
  console.error('❌ Error updating .replit file:', error.message);
  console.log('⚠️  You may need to manually edit the .replit file to remove the REPLIT_DISABLE_PACKAGE_LAYER=true flag');
}