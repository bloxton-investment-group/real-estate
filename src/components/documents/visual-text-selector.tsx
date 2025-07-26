"use client";

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Check, X, RefreshCw } from "lucide-react";
import { ExtractionRule, detectPatternFromSelection } from "@/lib/area-based-extraction";

interface VisualTextSelectorProps {
  rawText: string;
  fieldName: string;
  onRuleSelect: (rule: ExtractionRule) => void;
  onCancel: () => void;
  currentRule?: ExtractionRule;
}

export function VisualTextSelector({
  rawText,
  fieldName,
  onRuleSelect,
  onCancel,
  currentRule
}: VisualTextSelectorProps) {
  const [selectedText, setSelectedText] = useState(currentRule?.selectedText || "");
  const [selectionStart, setSelectionStart] = useState(currentRule?.selectionStart || 0);
  const [selectionEnd, setSelectionEnd] = useState(currentRule?.selectionEnd || 0);
  const [detectedPattern, setDetectedPattern] = useState<ExtractionRule["detectedPattern"]>(undefined);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const handleTextSelection = () => {
    const textarea = textRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = rawText.substring(start, end);

    if (selected.length > 0) {
      setSelectedText(selected);
      setSelectionStart(start);
      setSelectionEnd(end);

      // Auto-detect pattern
      const pattern = detectPatternFromSelection(rawText, selected, start, end);
      setDetectedPattern(pattern);
    }
  };

  const handleConfirm = () => {
    const rule: ExtractionRule = {
      selectedText,
      selectionStart,
      selectionEnd,
      detectedPattern
    };
    onRuleSelect(rule);
  };

  const getPatternDescription = (pattern: ExtractionRule["detectedPattern"]) => {
    if (!pattern) return null;

    switch (pattern.type) {
      case "after_delimiter":
        return `Auto-detected: Extract text after "${pattern.delimiter}"`;
      case "before_delimiter":
        return `Auto-detected: Extract text before "${pattern.delimiter}"`;
      case "substring":
        return `Auto-detected: Extract ${pattern.length} characters from ${pattern.position}`;
      default:
        return "Custom selection";
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Select text to extract for: {fieldName}</h4>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onCancel}>
            <X className="h-3 w-3 mr-1" />
            Cancel
          </Button>
          <Button 
            size="sm" 
            onClick={handleConfirm}
            disabled={!selectedText}
          >
            <Check className="h-3 w-3 mr-1" />
            Confirm
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Raw extracted text:</Label>
        <div className="text-xs text-gray-600 mb-2">
          Click and drag to select the part you want to extract
        </div>
        <textarea
          ref={textRef}
          value={rawText}
          readOnly
          onMouseUp={handleTextSelection}
          onKeyUp={handleTextSelection}
          className="w-full p-3 border rounded-md bg-gray-50 font-mono text-sm resize-none"
          rows={Math.min(4, Math.ceil(rawText.length / 50))}
          style={{
            userSelect: "text",
            cursor: "text"
          }}
        />
      </div>

      {selectedText && (
        <div className="space-y-3 p-3 bg-blue-50 rounded-md">
          <div>
            <Label className="text-sm font-medium">Selected text:</Label>
            <div className="mt-1 p-2 bg-white border rounded text-sm font-mono">
              "{selectedText}"
            </div>
          </div>

          {detectedPattern && (
            <div>
              <Badge variant="secondary" className="text-xs">
                {getPatternDescription(detectedPattern)}
              </Badge>
              <div className="text-xs text-gray-600 mt-1">
                This pattern will be applied to similar text automatically
              </div>
            </div>
          )}

          <div className="text-xs text-gray-600">
            Position: characters {selectionStart} to {selectionEnd}
          </div>
        </div>
      )}

      {!selectedText && (
        <div className="text-sm text-gray-500 italic">
          No text selected. Please highlight the text you want to extract.
        </div>
      )}

      <div className="space-y-2">
        <Label className="text-sm font-medium">Preview:</Label>
        <div className="p-2 bg-gray-100 rounded text-sm">
          Will extract: <span className="font-mono font-medium">
            {selectedText || <span className="text-gray-400">Nothing selected</span>}
          </span>
        </div>
      </div>
    </Card>
  );
}