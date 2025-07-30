"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  StickyNote, 
  X, 
  Minimize2, 
  Maximize2, 
  Save,
  Trash2,
  Copy,
  Download
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";

interface PersistedNotesWidgetProps {
  propertyId: string;
  className?: string;
}

export function PersistedNotesWidget({ propertyId, className }: PersistedNotesWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [notes, setNotes] = useState("");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const storageKey = `property-notes-${propertyId}`;

  // Load notes from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem(storageKey);
    if (savedData) {
      try {
        const { notes: savedNotes, lastSaved: savedTime } = JSON.parse(savedData);
        setNotes(savedNotes);
        setLastSaved(savedTime ? new Date(savedTime) : null);
        if (savedNotes) {
          setIsOpen(true);
        }
      } catch (error) {
        console.error("Error loading notes:", error);
      }
    }
  }, [storageKey]);

  const saveNotes = useCallback(() => {
    const data = {
      notes,
      lastSaved: new Date().toISOString(),
    };
    localStorage.setItem(storageKey, JSON.stringify(data));
    setLastSaved(new Date());
    setIsDirty(false);
  }, [notes, storageKey]);

  // Auto-save notes with debounce
  useEffect(() => {
    if (!isDirty) return;

    const timer = setTimeout(() => {
      saveNotes();
    }, 1000); // Auto-save after 1 second of inactivity

    return () => clearTimeout(timer);
  }, [notes, isDirty, saveNotes]);

  const handleNotesChange = (value: string) => {
    setNotes(value);
    setIsDirty(true);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(notes);
    toast({
      title: "Notes Copied",
      description: "Notes copied to clipboard",
    });
  };

  const handleClear = () => {
    if (window.confirm("Are you sure you want to clear all notes?")) {
      setNotes("");
      localStorage.removeItem(storageKey);
      setLastSaved(null);
      setIsDirty(false);
      toast({
        title: "Notes Cleared",
        description: "All notes have been cleared",
      });
    }
  };

  const handleDownload = () => {
    const blob = new Blob([notes], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `property-${propertyId}-notes-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatLastSaved = () => {
    if (!lastSaved) return "Not saved";
    const now = new Date();
    const diff = now.getTime() - lastSaved.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    if (seconds > 10) return `${seconds}s ago`;
    return "Just now";
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-4 right-4 shadow-lg z-50",
          className
        )}
        size="lg"
      >
        <StickyNote className="h-5 w-5 mr-2" />
        Notes
        {notes && (
          <Badge variant="secondary" className="ml-2">
            {notes.split('\n').filter(line => line.trim()).length}
          </Badge>
        )}
      </Button>
    );
  }

  if (isMinimized) {
    return (
      <Card className={cn(
        "fixed bottom-4 right-4 w-64 shadow-lg z-50",
        className
      )}>
        <CardHeader className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StickyNote className="h-4 w-4" />
              <span className="font-medium text-sm">Session Notes</span>
              {isDirty && <Badge variant="secondary" className="text-xs">Unsaved</Badge>}
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsMinimized(false)}
              >
                <Maximize2 className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "fixed bottom-4 right-4 w-96 max-h-[600px] shadow-lg z-50 flex flex-col",
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <StickyNote className="h-5 w-5" />
            Session Notes
          </CardTitle>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsMinimized(true)}
            >
              <Minimize2 className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Property session notes</span>
          <span>
            {isDirty ? (
              <Badge variant="secondary" className="text-xs">Unsaved</Badge>
            ) : (
              `Saved ${formatLastSaved()}`
            )}
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col pb-3">
        <Textarea
          value={notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          placeholder="Enter calculations, notes, or reminders here. They'll persist across pages and browser sessions."
          className="flex-1 min-h-[300px] resize-none font-mono text-sm"
        />
        <div className="flex gap-2 mt-3">
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopy}
            disabled={!notes}
          >
            <Copy className="h-3 w-3 mr-1" />
            Copy
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownload}
            disabled={!notes}
          >
            <Download className="h-3 w-3 mr-1" />
            Export
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={saveNotes}
            disabled={!isDirty}
          >
            <Save className="h-3 w-3 mr-1" />
            Save
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleClear}
            disabled={!notes}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Clear
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Notes are saved locally and persist across sessions.
        </p>
      </CardContent>
    </Card>
  );
}