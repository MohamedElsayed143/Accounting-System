"use client";

import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, Mail, Phone, MapPin } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DataTableToolbar,
  EmptyState,
  PaginationControls,
} from "@/components/shared";
import { customers as initialCustomers } from "@/mock-data";
import { Customer } from "@/types";

const ITEMS_PER_PAGE = 8;

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<Partial<Customer>>({});

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const matchesSearch =
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.city.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCountry =
        !filters.country || customer.country === filters.country;

      return matchesSearch && matchesCountry;
    });
  }, [customers, searchQuery, filters]);

  const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE);
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const uniqueCountries = [...new Set(customers.map((c) => c.country))];

  const filterOptions = [
    {
      label: "الدولة",
      value: "country",
      options: uniqueCountries.map((country) => ({
        label: country,
        value: country,
      })),
    },
  ];

  const handleFilterChange = (key: string, value: string | undefined) => {
    setFilters((prev) => {
      const newFilters = { ...prev };
      if (value) {
        newFilters[key] = value;
      } else {
        delete newFilters[key];
      }
      return newFilters;
    });
    setCurrentPage(1);
  };

  const openCreateModal = () => {
    setEditingCustomer(null);
    setFormData({});
    setIsModalOpen(true);
  };

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData(customer);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (editingCustomer) {
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === editingCustomer.id ? { ...c, ...formData } : c
        )
      );
    } else {
      const newCustomer: Customer = {
        id: `cust-${Date.now()}`,
        name: formData.name || "",
        email: formData.email || "",
        phone: formData.phone || "",
        address: formData.address || "",
        city: formData.city || "",
        country: formData.country || "",
        taxId: formData.taxId,
        totalPurchases: 0,
        createdAt: new Date().toISOString().split("T")[0],
      };
      setCustomers((prev) => [newCustomer, ...prev]);
    }
    setIsModalOpen(false);
    setFormData({});
  };

  const handleDelete = (id: string) => {
    if (confirm("هل أنت متأكد من حذف هذا العميل؟")) {
      setCustomers((prev) => prev.filter((c) => c.id !== id));
    }
  };

  return (
    <>
      <Navbar title="العملاء" />
      <div className="flex-1 space-y-6 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-l from-foreground to-foreground/70 bg-clip-text text-transparent">
              إدارة العملاء
            </h2>
            <p className="text-muted-foreground font-medium">
              إدارة عملائك ومعلوماتهم
            </p>
          </div>
          <Button onClick={openCreateModal} className="gap-2 shadow-md hover:shadow-lg transition-all">
            <Plus className="h-4 w-4" />
            <span className="font-medium">إضافة عميل</span>
          </Button>
        </div>

        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="space-y-4">
              <DataTableToolbar
                searchPlaceholder="ابحث عن عميل..."
                searchValue={searchQuery}
                onSearchChange={(value) => {
                  setSearchQuery(value);
                  setCurrentPage(1);
                }}
                filterOptions={filterOptions}
                activeFilters={filters}
                onFilterChange={handleFilterChange}
              />

              {paginatedCustomers.length > 0 ? (
                <>
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead className="font-bold text-right">الاسم</TableHead>
                          <TableHead className="font-bold text-right">معلومات الاتصال</TableHead>
                          <TableHead className="font-bold text-right">الموقع</TableHead>
                          <TableHead className="font-bold text-right">إجمالي المشتريات</TableHead>
                          <TableHead className="font-bold text-left">الإجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedCustomers.map((customer, index) => (
                          <TableRow 
                            key={customer.id}
                            className={index % 2 === 0 ? "bg-muted/20 hover:bg-muted/40" : "hover:bg-muted/20"}
                          >
                            <TableCell>
                              <div className="font-bold text-primary">{customer.name}</div>
                              {customer.taxId && (
                                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                  <span className="font-medium">الرقم الضريبي:</span>
                                  <span>{customer.taxId}</span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2 text-sm">
                                  <Mail className="h-3.5 w-3.5 text-primary" />
                                  <span className="font-medium">{customer.email}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Phone className="h-3.5 w-3.5" />
                                  <span>{customer.phone}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3.5 w-3.5 text-primary" />
                                <span className="font-medium">{customer.city}, {customer.country}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-bold text-lg">
                                {customer.totalPurchases.toLocaleString('ar-SA')} ر.س
                              </span>
                            </TableCell>
                            <TableCell className="text-left">
                              <div className="flex justify-start gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditModal(customer)}
                                  className="hover:bg-primary/10 transition-all"
                                  title="تعديل"
                                >
                                  <Pencil className="h-4 w-4 text-primary" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(customer.id)}
                                  className="hover:bg-destructive/10 transition-all"
                                  title="حذف"
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    totalItems={filteredCustomers.length}
                    itemsPerPage={ITEMS_PER_PAGE}
                  />
                </>
              ) : (
                <EmptyState
                  title="لم يتم العثور على عملاء"
                  description="حاول تعديل البحث أو الفلاتر، أو قم بإضافة عميل جديد."
                  action={{
                    label: "إضافة عميل",
                    onClick: openCreateModal,
                  }}
                />
              )}
            </div>
          </CardContent>
        </Card>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">
                {editingCustomer ? "تعديل العميل" : "إضافة عميل جديد"}
              </DialogTitle>
              <DialogDescription>
                {editingCustomer
                  ? "قم بتحديث معلومات العميل أدناه."
                  : "املأ التفاصيل لإنشاء عميل جديد."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name" className="font-bold">الاسم</Label>
                <Input
                  id="name"
                  value={formData.name || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="اسم الشركة"
                  dir="rtl"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email" className="font-bold">البريد الإلكتروني</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, email: e.target.value }))
                    }
                    placeholder="email@example.com"
                    dir="ltr"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone" className="font-bold">رقم الهاتف</Label>
                  <Input
                    id="phone"
                    value={formData.phone || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    placeholder="+966 50 000 0000"
                    dir="ltr"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address" className="font-bold">العنوان</Label>
                <Input
                  id="address"
                  value={formData.address || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, address: e.target.value }))
                  }
                  placeholder="عنوان الشارع"
                  dir="rtl"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="city" className="font-bold">المدينة</Label>
                  <Input
                    id="city"
                    value={formData.city || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, city: e.target.value }))
                    }
                    placeholder="المدينة"
                    dir="rtl"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="country" className="font-bold">الدولة</Label>
                  <Input
                    id="country"
                    value={formData.country || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        country: e.target.value,
                      }))
                    }
                    placeholder="الدولة"
                    dir="rtl"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="taxId" className="font-bold">الرقم الضريبي (اختياري)</Label>
                <Input
                  id="taxId"
                  value={formData.taxId || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, taxId: e.target.value }))
                  }
                  placeholder="الرقم الضريبي"
                  dir="ltr"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsModalOpen(false)} className="font-medium">
                إلغاء
              </Button>
              <Button onClick={handleSave} className="font-medium">
                {editingCustomer ? "حفظ التغييرات" : "إضافة عميل"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}