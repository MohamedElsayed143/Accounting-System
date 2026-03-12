"use client";

import { useState } from "react";
import { Lock, Loader2, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { verifyPasswordAction } from "@/app/actions/auth";
import { toast } from "sonner";

interface PasswordProtectionGateProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
}

export function PasswordProtectionGate({
  isOpen,
  onClose,
  onSuccess,
  title = "التحقق من كلمة المرور",
  description = "يرجى إدخال كلمة المرور الخاصة بك للوصول إلى خيارات التعديل والحذف.",
}: PasswordProtectionGateProps) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    if (!password) {
      setError("يرجى إدخال كلمة المرور");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await verifyPasswordAction(password);
      if (result.success) {
        toast.success("تم التحقق بنجاح");
        setPassword("");
        onSuccess();
        onClose();
      } else {
        setError(result.error || "فشل التحقق");
      }
    } catch (err) {
      setError("حدث خطأ أثناء الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent dir="rtl" className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
            <Lock className="h-6 w-6 text-blue-600" />
          </div>
          <DialogTitle className="text-xl font-bold text-center">
            {title}
          </DialogTitle>
          <DialogDescription className="text-center">
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="pass-gate" className="text-sm font-medium">
              كلمة المرور
            </Label>
            <Input
              id="pass-gate"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleVerify()}
              className={error ? "border-red-500 focus-visible:ring-red-500" : ""}
              placeholder="••••••••"
              disabled={loading}
              name="password"
              autoComplete="new-password"
              autoFocus
            />
            {error && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                {error}
              </p>
            )}
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            onClick={handleVerify}
            className="w-full sm:flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                جاري التحقق...
              </>
            ) : (
              "تأكيد الهوية"
            )}
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full sm:flex-1"
            disabled={loading}
          >
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
