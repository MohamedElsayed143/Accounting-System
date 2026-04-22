const fs = require('fs');
const files = [
  { path: 'src/app/(dashboard)/purchase-invoices/create/page.tsx', key: 'purchase_create' },
  { path: 'src/app/(dashboard)/purchase-returns/new/page.tsx', key: 'returns_purchase' },
  { path: 'src/app/(dashboard)/purchase-returns/[id]/page.tsx', key: 'returns_purchase' },
  { path: 'src/app/(dashboard)/reports/banks/page.tsx', key: 'reports_treasury_banks' },
  { path: 'src/app/(dashboard)/reports/treasury/page.tsx', key: 'reports_treasury_banks' },
  { path: 'src/app/(dashboard)/sales-invoices/create/page.tsx', key: 'sales_create' },
  { path: 'src/app/(dashboard)/sales-quotations/create/page.tsx', key: 'sales_quotations_view' },
  { path: 'src/app/(dashboard)/sales-quotations/[id]/page.tsx', key: 'sales_quotations_view' },
  { path: 'src/app/(dashboard)/sales-returns/new/page.tsx', key: 'returns_sales' },
  { path: 'src/app/(dashboard)/sales-returns/[id]/page.tsx', key: 'returns_sales' },
  { path: 'src/app/(dashboard)/treasury/archived/page.tsx', key: 'treasury_view' },
  { path: 'src/app/(dashboard)/treasury/payment-voucher/page.tsx', key: 'treasury_vouchers' },
  { path: 'src/app/(dashboard)/treasury/receipt-voucher/page.tsx', key: 'treasury_vouchers' },
  { path: 'src/app/(dashboard)/treasury/[id]/page.tsx', key: 'treasury_view' },
];

files.forEach(f => {
  if (!fs.existsSync(f.path)) {
     console.log('File missing: ', f.path);
     return;
  }
  let content = fs.readFileSync(f.path, 'utf8');
  if (content.includes('PermissionGuard')) {
    console.log('Skipped (already guarded):', f.path);
    return;
  }

  const defaultExportRegex = /export\s+default\s+function\s+([A-Za-z0-9_]+)/;
  const match = content.match(defaultExportRegex);
  if (!match) {
    console.log('Could not find export default function in:', f.path);
    return;
  }
  const funcName = match[1];

  // Replace 'export default function XYZ' with 'function XYZ'
  content = content.replace(defaultExportRegex, `function ${funcName}`);

  // Add import and wrapper
  const importStmt = 'import { PermissionGuard } from "@/components/shared";\n';
  const wrapper = `\n\nexport default function Protected${funcName}(props: any) {\n  return (\n    <PermissionGuard permissionKey="${f.key}">\n      <${funcName} {...props} />\n    </PermissionGuard>\n  );\n}\n`;

  const useClientRegex = /^(\s*\/\/.*?\n)*\s*['"]use client['"];?\s*\n/i;
  const useClientMatch = content.match(useClientRegex);
  
  if (useClientMatch) {
    content = content.replace(useClientRegex, useClientMatch[0] + importStmt);
  } else {
    content = importStmt + content;
  }

  content += wrapper;
  fs.writeFileSync(f.path, content);
  console.log('Patched:', f.path);
});
console.log('Done');
