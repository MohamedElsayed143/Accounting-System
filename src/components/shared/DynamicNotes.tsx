"use client";

import * as React from "react";
import { Plus, Trash2, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DynamicNotesProps {
  notes: string[];
  onChange: (notes: string[]) => void;
  disabled?: boolean;
}

export function DynamicNotes({ notes, onChange, disabled }: DynamicNotesProps) {
  const addNote = () => {
    onChange([...notes, ""]);
  };

  const removeNote = (index: number) => {
    const newNotes = notes.filter((_, i) => i !== index);
    onChange(newNotes);
  };

  const updateNote = (index: number, value: string) => {
    const newNotes = [...notes];
    newNotes[index] = value;
    onChange(newNotes);
  };

  return (
    <Card className="border-none shadow-sm overflow-hidden">
      <CardHeader className="bg-white border-b py-4 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <div className="w-2 h-6 bg-blue-500 rounded-full" /> ملاحظات إضافية
        </CardTitle>
        {!disabled && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addNote}
            className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
          >
            <Plus className="h-4 w-4" /> إضافة ملاحظة
          </Button>
        )}
      </CardHeader>
      <CardContent className="bg-white p-4 space-y-4">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-muted-foreground border-2 border-dashed border-slate-100 rounded-lg">
            <StickyNote className="h-8 w-8 mb-2 opacity-20" />
            <p className="text-sm font-medium">لا توجد ملاحظات مضافة</p>
          </div>
        ) : (
          notes.map((note, index) => (
            <div key={index} className="flex gap-2">
              <Textarea
                placeholder="اكتب ملاحظاتك هنا..."
                value={note}
                onChange={(e) => updateNote(index, e.target.value)}
                disabled={disabled}
                className="min-h-[80px] bg-slate-50/50 border-slate-200 focus-visible:ring-blue-500 resize-none font-medium text-slate-700"
              />
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeNote(index)}
                  className="text-red-400 hover:text-red-500 hover:bg-red-50 shrink-0 mt-2"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
