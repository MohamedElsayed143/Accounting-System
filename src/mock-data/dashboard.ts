import { CompanyInfo, UserProfile, ChartData } from "@/types";

export const companyInfo: CompanyInfo = {
  name: "AccuBooks Inc",
  email: "contact@accubooks.com",
  phone: "+1 (555) 000-0000",
  address: "500 Financial District, Tower A",
  city: "San Francisco",
  country: "USA",
  taxId: "US-TAX-123456",
  website: "https://accubooks.com",
};

export const userProfile: UserProfile = {
  id: "user-001",
  name: "John Smith",
  email: "john.smith@accubooks.com",
  role: "Admin",
  avatar: undefined,
};

export const monthlyRevenueData: ChartData[] = [
  { name: "Jan", value: 65000 },
  { name: "Feb", value: 78000 },
  { name: "Mar", value: 92000 },
  { name: "Apr", value: 85000 },
  { name: "May", value: 110000 },
  { name: "Jun", value: 125000 },
  { name: "Jul", value: 98000 },
  { name: "Aug", value: 115000 },
  { name: "Sep", value: 130000 },
  { name: "Oct", value: 142000 },
  { name: "Nov", value: 155000 },
  { name: "Dec", value: 178000 },
];

export const monthlyExpensesData: ChartData[] = [
  { name: "Jan", value: 45000 },
  { name: "Feb", value: 52000 },
  { name: "Mar", value: 48000 },
  { name: "Apr", value: 55000 },
  { name: "May", value: 62000 },
  { name: "Jun", value: 58000 },
  { name: "Jul", value: 65000 },
  { name: "Aug", value: 72000 },
  { name: "Sep", value: 68000 },
  { name: "Oct", value: 75000 },
  { name: "Nov", value: 82000 },
  { name: "Dec", value: 88000 },
];

export const expensesByCategory: ChartData[] = [
  { name: "Supplies", value: 125000 },
  { name: "Services", value: 89000 },
  { name: "Equipment", value: 156000 },
  { name: "Logistics", value: 78000 },
  { name: "Other", value: 45000 },
];

export const revenueByRegion: ChartData[] = [
  { name: "North America", value: 450000 },
  { name: "Europe", value: 380000 },
  { name: "Asia Pacific", value: 290000 },
  { name: "Other", value: 85000 },
];
