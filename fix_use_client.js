const fs = require('fs');
const files = [
  'src/app/(dashboard)/purchase-invoices/create/page.tsx',
  'src/app/(dashboard)/purchase-returns/new/page.tsx',
  'src/app/(dashboard)/purchase-returns/[id]/page.tsx',
  'src/app/(dashboard)/reports/banks/page.tsx',
  'src/app/(dashboard)/reports/treasury/page.tsx',
  'src/app/(dashboard)/sales-invoices/create/page.tsx',
  'src/app/(dashboard)/sales-quotations/create/page.tsx',
  'src/app/(dashboard)/sales-quotations/[id]/page.tsx',
  'src/app/(dashboard)/sales-returns/new/page.tsx',
  'src/app/(dashboard)/sales-returns/[id]/page.tsx',
  'src/app/(dashboard)/treasury/archived/page.tsx',
  'src/app/(dashboard)/treasury/payment-voucher/page.tsx',
  'src/app/(dashboard)/treasury/receipt-voucher/page.tsx',
  'src/app/(dashboard)/treasury/[id]/page.tsx'
];

files.forEach(f => {
  if (!fs.existsSync(f)) return;
  let content = fs.readFileSync(f, 'utf8');
  
  // Find "use client"
  if (content.includes('"use client";') && !content.startsWith('"use client";')) {
    // Remove all generic "use client"; statements
    content = content.replace(/["']use client["'];?\s*\n/gi, '');
    
    // Add "use client"; at the very top (after a clean up to avoid double empty lines)
    content = '"use client";\n' + content;
    fs.writeFileSync(f, content);
    console.log('Fixed use client in:', f);
  }
});
