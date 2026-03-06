/**
 * Concrete Mix Monitoring Dashboard - Main Page
 * 
 * This dashboard displays real-time sensor data for monitoring
 * concrete mix proportions in construction applications.
 * 
 * Features:
 * - Live mix status with color-coded indicators
 * - Real-time sensor value display
 * - Historical charts for W/C ratio and material weights
 * - Scrollable mix history table
 * - Auto-refresh every 5 seconds
 */

import { useMixData } from "@/hooks/useMixData";
import {
  DashboardHeader,
  MixStatusCard,
  SensorValuesGrid,
  WCRatioChart,
  MaterialWeightsChart,
  MixHistoryTable,
} from "@/components/dashboard";

const Index = () => {
  // Custom hook handles all data fetching, auto-refresh, and error handling
  const {
    latestMix,
    mixHistory,
    connectionStatus,
    lastUpdated,
    error,
    isRefreshing,
    refreshData,
  } = useMixData();

  return (
    <div className="min-h-screen bg-background">
      {/* Main Container with responsive padding */}
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header with title, connection status, and controls */}
        <DashboardHeader
          connectionStatus={connectionStatus}
          lastUpdated={lastUpdated}
          isRefreshing={isRefreshing}
          onRefresh={refreshData}
        />

        {/* Error or No Data Alert */}
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
            ⚠️ {error}
          </div>
        )}
        
        {/* Waiting for Hardware Alert */}
        {!error && !latestMix && connectionStatus === "connected" && (
          <div className="mb-6 p-6 bg-blue-50 border-2 border-blue-200 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="animate-pulse h-3 w-3 bg-blue-500 rounded-full"></div>
              <h3 className="text-lg font-semibold text-blue-900">Waiting for ESP32 Hardware Data</h3>
            </div>
            <p className="text-blue-800 mb-3">
              Backend connected successfully. System is waiting for the first data transmission from your ESP32 device.
            </p>
            <div className="bg-white/70 p-4 rounded border border-blue-200">
              <p className="text-sm text-blue-900 font-mono mb-2">
                <strong>ESP32 Status:</strong> Ready to receive
              </p>
              <p className="text-sm text-blue-800">
                • Make sure your ESP32 is powered on<br/>
                • Check WiFi connection (SSID: "POCO M4 Pro 5G")<br/>
                • Add materials and press CONFIRM button to send data
              </p>
            </div>
          </div>
        )}

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Status Card - Takes 1 column on desktop */}
          <div className="lg:col-span-1">
            <MixStatusCard mixData={latestMix} />
          </div>

          {/* Sensor Values - Takes 2 columns on desktop */}
          <div className="lg:col-span-2">
            <SensorValuesGrid mixData={latestMix} />
          </div>
        </div>

        {/* Charts Section - Side by side on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <WCRatioChart history={mixHistory} />
          <MaterialWeightsChart history={mixHistory} />
        </div>

        {/* History Table - Full width */}
        <MixHistoryTable history={mixHistory} />

        {/* Footer */}
        <footer className="mt-8 pt-6 border-t text-center text-sm text-muted-foreground">
          <p>
            Concrete Mix Monitoring System • Undergraduate Engineering Thesis Project
          </p>
          <p className="mt-1">
            Sensor data refreshes every 5 seconds • All weights in kilograms
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
