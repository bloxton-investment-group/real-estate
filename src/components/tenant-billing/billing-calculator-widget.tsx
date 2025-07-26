"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calculator, Minus, Plus, X } from "lucide-react";

export function BillingCalculatorWidget() {
  const [roomReading, setRoomReading] = useState("");
  const [fanReading, setFanReading] = useState("");
  const [meterMultiplier, setMeterMultiplier] = useState("16");
  const [customCalculation, setCustomCalculation] = useState("");

  const roomValue = parseFloat(roomReading) || 0;
  const fanValue = parseFloat(fanReading) || 0;
  const multiplier = parseFloat(meterMultiplier) || 1;

  const snyderResult = roomValue - fanValue;
  const multipliedResult = (parseFloat(customCalculation) || 0) * multiplier;

  const clearAll = () => {
    setRoomReading("");
    setFanReading("");
    setMeterMultiplier("16");
    setCustomCalculation("");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Billing Calculator Widget
          </CardTitle>
          <p className="text-sm text-gray-600">
            Quick calculations for tenant billing scenarios
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Snyder Calculation */}
          <div className="p-4 border rounded-lg bg-blue-50">
            <h4 className="font-semibold text-blue-800 mb-3">Snyder Calculation (Room - Fan)</h4>
            <div className="grid grid-cols-3 gap-4 items-end">
              <div>
                <Label htmlFor="room-reading">Room Reading</Label>
                <Input
                  id="room-reading"
                  type="number"
                  step="0.01"
                  value={roomReading}
                  onChange={(e) => setRoomReading(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="text-center">
                <Minus className="h-6 w-6 mx-auto text-gray-400" />
              </div>
              <div>
                <Label htmlFor="fan-reading">Fan Reading</Label>
                <Input
                  id="fan-reading"
                  type="number"
                  step="0.01"
                  value={fanReading}
                  onChange={(e) => setFanReading(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-white rounded-lg border-2 border-blue-300">
              <div className="flex justify-between items-center">
                <span className="font-medium text-blue-800">Net kWh for Snyder:</span>
                <span className="text-xl font-bold text-blue-900 font-mono">
                  {snyderResult.toFixed(2)} kWh
                </span>
              </div>
              {roomValue > 0 && fanValue > 0 && (
                <div className="text-sm text-blue-600 mt-1">
                  {roomValue.toFixed(2)} - {fanValue.toFixed(2)} = {snyderResult.toFixed(2)}
                </div>
              )}
            </div>
          </div>

          {/* Meter Multiplier Calculation */}
          <div className="p-4 border rounded-lg bg-amber-50">
            <h4 className="font-semibold text-amber-800 mb-3">Meter Reading Multiplier</h4>
            <div className="grid grid-cols-3 gap-4 items-end">
              <div>
                <Label htmlFor="custom-calculation">Meter Reading</Label>
                <Input
                  id="custom-calculation"
                  type="number"
                  step="0.01"
                  value={customCalculation}
                  onChange={(e) => setCustomCalculation(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="text-center">
                <X className="h-6 w-6 mx-auto text-gray-400" />
              </div>
              <div>
                <Label htmlFor="multiplier">Multiplier</Label>
                <Input
                  id="multiplier"
                  type="number"
                  step="0.01"
                  value={meterMultiplier}
                  onChange={(e) => setMeterMultiplier(e.target.value)}
                  placeholder="16"
                />
              </div>
            </div>

            <div className="mt-4 p-3 bg-white rounded-lg border-2 border-amber-300">
              <div className="flex justify-between items-center">
                <span className="font-medium text-amber-800">Actual kWh:</span>
                <span className="text-xl font-bold text-amber-900 font-mono">
                  {multipliedResult.toFixed(2)} kWh
                </span>
              </div>
              {parseFloat(customCalculation) > 0 && multiplier > 0 && (
                <div className="text-sm text-amber-600 mt-1">
                  {parseFloat(customCalculation).toFixed(2)} × {multiplier} = {multipliedResult.toFixed(2)}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={clearAll} className="flex-1">
              Clear All
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                const resultText = `Snyder: ${snyderResult.toFixed(2)} kWh | Multiplied: ${multipliedResult.toFixed(2)} kWh`;
                navigator.clipboard.writeText(resultText);
              }}
              className="flex-1"
            >
              Copy Results
            </Button>
          </div>

          {/* Usage Instructions */}
          <div className="text-xs text-gray-500 space-y-1 p-3 bg-gray-50 rounded-lg">
            <div><strong>Snyder Calculation:</strong> For tenants with fan meters that need to be subtracted</div>
            <div><strong>Meter Multiplier:</strong> For meters that show readings that need to be multiplied (e.g., ×16)</div>
            <div><strong>Quick Copy:</strong> Use "Copy Results" to paste into calculation notes</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}