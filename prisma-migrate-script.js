const { spawn } = require('child_process');
const child = spawn('npx', ['prisma', 'migrate', 'dev', '--create-only', '--name', 'rename_saved_listing_to_favorite'], { 
  cwd: '/home/tgenericx/dev/github.com/odysseon/orita/orita-api',
  env: { ...process.env }
});
child.stdout.on('data', (d) => {
  const str = d.toString();
  process.stdout.write(str);
  if (str.includes('yes/no') || str.includes('Warnings') || str.includes('lost') || str.includes('reset')) {
    child.stdin.write('y\n');
  }
});
child.stderr.on('data', (d) => process.stderr.write(d.toString()));
child.on('close', (c) => process.exit(c));
