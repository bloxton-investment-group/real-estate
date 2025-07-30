"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Target, Eye, Zap } from "lucide-react";

export function OCRTips() {
  return (
    <Card className="p-4 border-yellow-200 bg-yellow-50">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="h-4 w-4 text-yellow-600" />
        <h4 className="font-medium text-yellow-800">OCR Accuracy Tips</h4>
      </div>
      
      <div className="space-y-2 text-sm text-yellow-700">
        <div className="flex items-start gap-2">
          <Target className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-medium">Draw tight boxes:</span> Select just the text/numbers, avoid extra whitespace or lines
          </div>
        </div>
        
        <div className="flex items-start gap-2">
          <Eye className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-medium">Check crop images:</span> Use &quot;Debug OCR&quot; to see what the system is trying to read
          </div>
        </div>
        
        <div className="flex items-start gap-2">
          <Zap className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-medium">Manual override:</span> Use the ✏️ button to manually enter text if OCR fails
          </div>
        </div>
        
        <div className="mt-3 p-2 bg-yellow-100 rounded text-xs">
          <strong>For low confidence:</strong> Try drawing a slightly larger box around the text, 
          or use the manual entry button (✏️) to type the correct value.
        </div>
      </div>
    </Card>
  );
}