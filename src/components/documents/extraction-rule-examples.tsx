"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { 
  ExtractionRule, 
  extractFromPdfWithAreas 
} from "@/lib/area-based-extraction";
import { ExtractionArea } from "./document-area-selector";

/**
 * Example component showing how to use dynamic extraction rules
 * 
 * Usage examples:
 * 
 * 1. Extract only what's after the @ symbol:
 *    Input: "123,456@$0.089550"
 *    Rule: splitAtSymbol("@", "after")
 *    Output: "$0.089550"
 * 
 * 2. Split into two fields:
 *    Input: "123,456@$0.089550"
 *    Rule: quantityAndPrice(["quantity", "price"])
 *    Output: Main field: "123,456", Additional field "price": "$0.089550"
 * 
 * 3. Extract with regex:
 *    Input: "Account #12345-ABC Total: $567.89"
 *    Rule: regexExtract("\\$([0-9,]+\\.?[0-9]*)", 1)
 *    Output: "567.89"
 * 
 * 4. Multiple fields from delimited text:
 *    Input: "John Doe|Manager|$75,000|2023-01-15"
 *    Rule: multiField("|", ["name", "title", "salary", "startDate"])
 *    Output: Main: "John Doe", Additional: {title: "Manager", salary: "$75,000", startDate: "2023-01-15"}
 */

export function ExtractionRuleExamples() {
  // Example extraction rules for different scenarios
  const exampleRules = React.useMemo(() => {
    return {
      // For utility bill format: "123,456@$0.089550" - get the part after @
      "area-1": {
        detectedPattern: {
          type: "after_delimiter" as const,
          delimiter: "@"
        }
      } as ExtractionRule,
      
      // For extracting the part before @
      "area-2": {
        detectedPattern: {
          type: "before_delimiter" as const,
          delimiter: "@"
        }
      } as ExtractionRule,
      
      // For visual text selection
      "area-3": {
        selectedText: "$0.089550",
        selectionStart: 8,
        selectionEnd: 17
      } as ExtractionRule,
    };
  }, []);

  const demonstrateExtraction = async (
    areas: ExtractionArea[], 
    fileUrl: string
  ) => {
    try {
      // Use the extraction with rules
      const results = await extractFromPdfWithAreas(fileUrl, areas, exampleRules);
      
      // Log results to see the extracted data
      results.forEach(result => {
        console.log(`Field: ${result.fieldName}`);
        console.log(`Main Value: ${result.value}`);
        
        if (result.additionalFields) {
          console.log(`Additional Fields:`, result.additionalFields);
        }
        
        console.log("---");
      });
      
      return results;
    } catch (error) {
      console.error("Extraction failed:", error);
      return [];
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Dynamic Extraction Rules Examples</h3>
        
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-medium text-blue-600">1. Extract After Symbol (@)</h4>
            <p className="text-gray-600">Input: "123,456@$0.089550"</p>
            <p className="text-green-600">Output: "$0.089550"</p>
            <code className="text-xs bg-gray-100 p-1 rounded">
              rules.splitAtSymbol("@", "after")
            </code>
          </div>
          
          <div>
            <h4 className="font-medium text-blue-600">2. Split into Multiple Fields</h4>
            <p className="text-gray-600">Input: "123,456@$0.089550"</p>
            <p className="text-green-600">Output: quantity="123,456", unitPrice="$0.089550"</p>
            <code className="text-xs bg-gray-100 p-1 rounded">
              rules.quantityAndPrice(["quantity", "unitPrice"])
            </code>
          </div>
          
          <div>
            <h4 className="font-medium text-blue-600">3. Regex Extraction</h4>
            <p className="text-gray-600">Input: "Account #12345-ABC Total: $567.89"</p>
            <p className="text-green-600">Output: "567.89" (extracted price)</p>
            <code className="text-xs bg-gray-100 p-1 rounded">
              rules.regexExtract("\\$([0-9,]+\\.?[0-9]*)", 1)
            </code>
          </div>
          
          <div>
            <h4 className="font-medium text-blue-600">4. Delimited Data Parsing</h4>
            <p className="text-gray-600">Input: "John Doe|Manager|$75,000|2023-01-15"</p>
            <p className="text-green-600">Output: name="John Doe", title="Manager", salary="$75,000", startDate="2023-01-15"</p>
            <code className="text-xs bg-gray-100 p-1 rounded">
              rules.multiField("|", ["name", "title", "salary", "startDate"])
            </code>
          </div>
          
          <div>
            <h4 className="font-medium text-blue-600">5. Numbers Only</h4>
            <p className="text-gray-600">Input: "Total: $1,234.56 (including tax)"</p>
            <p className="text-green-600">Output: "1234.56"</p>
            <code className="text-xs bg-gray-100 p-1 rounded">
              rules.numbersOnly()
            </code>
          </div>
        </div>
      </Card>
      
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">How to Use in Your Code</h3>
        
        <pre className="text-xs bg-gray-900 text-green-400 p-4 rounded overflow-x-auto">
{`import { extractFromPdfWithAreas, ExtractionRule } from "@/lib/area-based-extraction";

// Create extraction rules using visual selection
const extractionRules = {
  // Extract text after @ symbol
  "area-1": {
    detectedPattern: {
      type: "after_delimiter",
      delimiter: "@"
    }
  } as ExtractionRule,
  
  // Extract text before @ symbol  
  "area-2": {
    detectedPattern: {
      type: "before_delimiter", 
      delimiter: "@"
    }
  } as ExtractionRule,
  
  // Visual text selection (user selected "$0.50" from "123@$0.50")
  "area-3": {
    selectedText: "$0.50",
    selectionStart: 4,
    selectionEnd: 9
  } as ExtractionRule
};

// Extract with rules
const results = await extractFromPdfWithAreas(fileUrl, areas, extractionRules);

// Access results
results.forEach(result => {
  console.log(\`Field: \${result.fieldName}\`);
  console.log(\`Value: \${result.value}\`);
});`}
        </pre>
      </Card>
    </div>
  );
}