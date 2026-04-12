const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      if (dirPath.endsWith('.ts') || dirPath.endsWith('.tsx')) {
        callback(dirPath);
      }
    }
  });
}

walkDir(path.resolve("src/app/(dashboard)"), (filePath) => {
  let content = fs.readFileSync(filePath, "utf-8");
  let modified = false;

  if (content.includes("(prisma as any)")) {
    content = content.replace(/\(prisma as any\)/g, "(await getTenantPrisma() as any)");
    modified = true;
  }
  
  if (content.includes("typeof prisma.")) {
      content = content.replace(/typeof prisma\./g, "typeof publicPrisma.");
      modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content, "utf-8");
    console.log("FIXED:", filePath);
  }
});
