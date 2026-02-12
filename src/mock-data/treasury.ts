export interface Treasury {
  id: string;
  name: string;
  type: "safe" | "bank";
  balance: number;
  accountNumber?: string;
  bankBranch?: string;
}

export interface Voucher {
  id: string;
  voucherNumber: string;
  type: "receipt" | "payment";
  date: string;
  amount: number;
  fromAccount: string;
  toAccount: string;
  description: string;
  status: "مكتمل" | "معلق" | "ملغي";
}

export const treasuryAccounts: Treasury[] = [
  {
    id: "treasury-001",
    name: "الخزنة الرئيسية",
    type: "safe",
    balance: 245000,
  },
  {
    id: "bank-001",
    name: "البنك الأهلي",
    type: "bank",
    balance: 1250000,
    accountNumber: "SA0380000000608010167519",
    bankBranch: "فرع الرياض الرئيسي",
  },
  {
    id: "bank-002",
    name: "بنك الراجحي",
    type: "bank",
    balance: 870000,
    accountNumber: "SA6180000000608010254812",
    bankBranch: "فرع جدة",
  },
  {
    id: "bank-003",
    name: "بنك الإنماء",
    type: "bank",
    balance: 432000,
    accountNumber: "SA4405000068203170518000",
    bankBranch: "فرع الدمام",
  },
];

export const vouchers: Voucher[] = [
  {
    id: "v-001",
    voucherNumber: "RV-2026-001",
    type: "receipt",
    date: "2026-02-12",
    amount: 15000,
    fromAccount: "Acme Corporation",
    toAccount: "الخزنة الرئيسية",
    description: "تحصيل دفعة من فاتورة مبيعات رقم 1024",
    status: "مكتمل",
  },
  {
    id: "v-002",
    voucherNumber: "PV-2026-001",
    type: "payment",
    date: "2026-02-11",
    amount: 8500,
    fromAccount: "البنك الأهلي",
    toAccount: "Industrial Supplies Co",
    description: "سداد فاتورة مشتريات رقم 5012",
    status: "مكتمل",
  },
  {
    id: "v-003",
    voucherNumber: "RV-2026-002",
    type: "receipt",
    date: "2026-02-10",
    amount: 32000,
    fromAccount: "TechStart Inc",
    toAccount: "بنك الراجحي",
    description: "تحصيل قيمة عقد صيانة سنوي",
    status: "مكتمل",
  },
  {
    id: "v-004",
    voucherNumber: "PV-2026-002",
    type: "payment",
    date: "2026-02-09",
    amount: 4200,
    fromAccount: "الخزنة الرئيسية",
    toAccount: "مصاريف إيجار",
    description: "دفع إيجار المكتب - شهر فبراير",
    status: "مكتمل",
  },
  {
    id: "v-005",
    voucherNumber: "RV-2026-003",
    type: "receipt",
    date: "2026-02-08",
    amount: 19500,
    fromAccount: "Global Solutions Ltd",
    toAccount: "البنك الأهلي",
    description: "تحصيل دفعة مقدمة على طلبية جديدة",
    status: "معلق",
  },
  {
    id: "v-006",
    voucherNumber: "PV-2026-003",
    type: "payment",
    date: "2026-02-07",
    amount: 12800,
    fromAccount: "بنك الإنماء",
    toAccount: "Office Essentials Ltd",
    description: "سداد فاتورة توريد أثاث مكتبي",
    status: "مكتمل",
  },
  {
    id: "v-007",
    voucherNumber: "PV-2026-004",
    type: "payment",
    date: "2026-02-06",
    amount: 3500,
    fromAccount: "الخزنة الرئيسية",
    toAccount: "مصاريف نثرية",
    description: "مصاريف نثرية متنوعة",
    status: "مكتمل",
  },
  {
    id: "v-008",
    voucherNumber: "RV-2026-004",
    type: "receipt",
    date: "2026-02-05",
    amount: 45000,
    fromAccount: "Premium Goods Inc",
    toAccount: "بنك الراجحي",
    description: "تحصيل كامل قيمة فاتورة مبيعات رقم 1019",
    status: "مكتمل",
  },
];

export const expenseCategories = [
  "مصاريف إيجار",
  "مصاريف رواتب",
  "مصاريف نثرية",
  "مصاريف صيانة",
  "مصاريف تسويق",
  "مصاريف نقل",
  "مصاريف خدمات",
];
