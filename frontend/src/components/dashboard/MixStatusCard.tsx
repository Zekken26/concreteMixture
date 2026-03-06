/**
 * Mix Status Card Component
 * Displays the current mix status with color-coded background
 * and prominent W/C ratio display
 */

import { Droplets, AlertTriangle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MixBatch, MixStatus } from "@/types/concrete";

interface MixStatusCardProps {
  mixData: MixBatch | null;
}

// Configuration for each status type
const statusConfig: Record<
  MixStatus,
  {
    label: string;
    description: string;
    bgClass: string;
    textClass: string;
    icon: typeof Droplets;
  }
> = {
  too_dry: {
    label: "TOO DRY",
    description: "Water content is below optimal range. Add more water to the mix.",
    bgClass: "bg-red-600",
    textClass: "text-white",
    icon: AlertTriangle,
  },
  acceptable: {
    label: "ACCEPTABLE",
    description: "Mix proportions are within acceptable range. Good workability expected.",
    bgClass: "bg-green-600",
    textClass: "text-white",
    icon: CheckCircle,
  },
  too_wet: {
    label: "TOO WET",
    description: "Excess water detected. This may reduce concrete strength.",
    bgClass: "bg-blue-600",
    textClass: "text-white",
    icon: Droplets,
  },
};

export const MixStatusCard = ({ mixData }: MixStatusCardProps) => {
  // Handle no data state - waiting for hardware
  if (!mixData) {
    return (
      <Card className="border-2 border-dashed border-blue-300">
        <CardHeader>
          <CardTitle className="text-blue-900">Current Mix Status</CardTitle>
        </CardHeader>
        <CardContent className="h-48 flex flex-col items-center justify-center text-center">
          <div className="animate-pulse h-12 w-12 bg-blue-500 rounded-full mb-4 opacity-50"></div>
          <p className="text-blue-900 font-semibold mb-2">No Data Yet</p>
          <p className="text-sm text-blue-700">Waiting for ESP32 to send first measurement</p>
        </CardContent>
      </Card>
    );
  }

  const config = statusConfig[mixData.status];
  const StatusIcon = config.icon;

  const moisture = typeof mixData.moisture === "number" ? mixData.moisture : null;
  const moistureLabel =
    moisture === null
      ? "--"
      : moisture < 30
        ? "DRY"
        : moisture < 70
          ? "OK"
          : "WET";

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Current Mix Status (W/C)</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Status Display with Color Background */}
        <div className={`${config.bgClass} ${config.textClass} p-6`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <StatusIcon className="h-8 w-8" />
              <span className="text-2xl md:text-3xl font-bold">{config.label}</span>
            </div>
          </div>
          
          {/* W/C Ratio - Prominent Display */}
          <div className="bg-white/20 rounded-lg p-4 mb-4">
            <div className="text-center">
              <p className="text-sm opacity-90 mb-1">Water-Cement Ratio</p>
              <p className="text-5xl md:text-6xl font-bold tabular-nums">
                {mixData.wc_ratio.toFixed(2)}
              </p>
              <p className="text-xs opacity-75 mt-1">
                Optimal range: 0.45 - 0.60
              </p>
            </div>
          </div>

          {/* Moisture (from sensor) */}
          <div className="bg-white/10 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between">
              <p className="text-sm opacity-90">Moisture (Sensor)</p>
              <p className="text-sm font-semibold tabular-nums">
                {moisture === null ? "--" : `${moisture}%`} <span className="opacity-80">({moistureLabel})</span>
              </p>
            </div>
            <p className="text-xs opacity-75 mt-1">
              Note: "Too Wet" above is based on W/C ratio, not moisture %.
            </p>
          </div>

          {/* Status Description */}
          <p className="text-sm opacity-90">{config.description}</p>
        </div>

        {/* Timestamp */}
        <div className="p-4 bg-muted/50 text-sm text-muted-foreground">
          <span className="font-medium">Last Reading: </span>
          {new Date(mixData.timestamp).toLocaleString("en-US", {
            dateStyle: "medium",
            timeStyle: "medium",
          })}
        </div>
      </CardContent>
    </Card>
  );
};
