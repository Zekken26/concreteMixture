/**
 * W/C Ratio Over Time Chart Component
 * Line chart showing the water-cement ratio trend
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MixBatch } from "@/types/concrete";

interface WCRatioChartProps {
  history: MixBatch[];
}

// Threshold values for W/C ratio zones
const THRESHOLD_LOW = 0.45;  // Below this is "Too Dry"
const THRESHOLD_HIGH = 0.60; // Above this is "Too Wet"

export const WCRatioChart = ({ history }: WCRatioChartProps) => {
  // Transform data for the chart - sort by timestamp (oldest first)
  const chartData = [...history]
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map((batch) => ({
      time: new Date(batch.timestamp).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      wcRatio: batch.wc_ratio,
      status: batch.status,
    }));

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium">{data.time}</p>
          <p className="text-lg font-bold text-primary">
            W/C Ratio: {data.wcRatio.toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground">
            Status: {data.status.toUpperCase()}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">
          W/C Ratio Over Time
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Water-to-cement ratio trend with acceptable range (0.45 - 0.60)
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-64 md:h-80">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis
                  domain={[0.3, 0.7]}
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                  label={{
                    value: "W/C Ratio",
                    angle: -90,
                    position: "insideLeft",
                    style: { textAnchor: "middle", fontSize: 12 },
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                
                {/* Reference lines for thresholds */}
                <ReferenceLine
                  y={THRESHOLD_LOW}
                  stroke="#ef4444"
                  strokeDasharray="5 5"
                  label={{
                    value: "Too Dry",
                    position: "right",
                    fill: "#ef4444",
                    fontSize: 10,
                  }}
                />
                <ReferenceLine
                  y={THRESHOLD_HIGH}
                  stroke="#3b82f6"
                  strokeDasharray="5 5"
                  label={{
                    value: "Too Wet",
                    position: "right",
                    fill: "#3b82f6",
                    fontSize: 10,
                  }}
                />

                {/* Main data line */}
                <Line
                  type="monotone"
                  dataKey="wcRatio"
                  name="W/C Ratio"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-blue-600">
              <p className="font-semibold mb-1">No Data Yet</p>
              <p className="text-sm text-muted-foreground">Waiting for ESP32 hardware to send measurements</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
