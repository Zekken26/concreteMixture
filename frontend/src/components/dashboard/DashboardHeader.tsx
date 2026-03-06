/**
 * Dashboard Header Component
 * Displays the main title, subtitle, and connection status
 */

import { RefreshCw, Wifi, WifiOff, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConnectionStatus } from "@/types/concrete";

interface DashboardHeaderProps {
  connectionStatus: ConnectionStatus;
  lastUpdated: Date | null;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export const DashboardHeader = ({
  connectionStatus,
  lastUpdated,
  isRefreshing,
  onRefresh,
}: DashboardHeaderProps) => {
  // Format the last updated timestamp
  const formatLastUpdated = (date: Date | null): string => {
    if (!date) return "Never";
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <header className="mb-8">
      {/* Main Title */}
      <div className="text-center mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
          Concrete Mix Monitoring Dashboard
        </h1>
        <p className="text-lg text-muted-foreground">
          Sensor-Based Mix Proportion Indicator
        </p>
      </div>

      {/* Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-card rounded-lg border">
        {/* Connection Status */}
        <div className="flex items-center gap-3">
          {connectionStatus === "connected" ? (
            <Badge variant="default" className="bg-status-acceptable text-white gap-1.5">
              <Wifi className="h-3.5 w-3.5" />
              Connected to Sensors
            </Badge>
          ) : connectionStatus === "connecting" ? (
            <Badge variant="secondary" className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Connecting...
            </Badge>
          ) : (
            <Badge variant="outline" className="text-status-dry border-status-dry gap-1.5">
              <WifiOff className="h-3.5 w-3.5" />
              Disconnected
            </Badge>
          )}
        </div>

        {/* Last Updated & Refresh Controls */}
        <div className="flex items-center gap-4">
          {/* Last Updated Time */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Updated: {formatLastUpdated(lastUpdated)}</span>
          </div>

          {/* Manual Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>
    </header>
  );
};
