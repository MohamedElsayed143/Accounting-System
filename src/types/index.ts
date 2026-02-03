export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  taxId?: string;
  totalPurchases: number;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  taxId?: string;
  totalOrders: number;
  createdAt: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface SalesInvoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: "paid" | "unpaid" | "overdue" | "partial";
  dueDate: string;
  createdAt: string;
}

export interface PurchaseInvoice {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: "paid" | "unpaid" | "overdue" | "partial";
  dueDate: string;
  createdAt: string;
}

export interface KPIData {
  title: string;
  value: string | number;
  change: number;
  changeType: "increase" | "decrease";
  icon: string;
}

export interface ChartData {
  name: string;
  value: number;
}

export interface CompanyInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  taxId: string;
  website?: string;
  logo?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}
