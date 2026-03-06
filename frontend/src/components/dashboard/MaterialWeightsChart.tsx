/**
 * Material Weights Chart Component
 * Bar chart showing the weight of each material per batch
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MixBatch } from "@/types/concrete";

interface MaterialWeightsChartProps {
  history: MixBatch[];
}

export const MaterialWeightsChart = ({ history }: MaterialWeightsChartProps) => {
  // Transform data for the chart - take last 8 batches, sorted by time
  const chartData = [...history]
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .slice(-8) // Show last 8 for readability
    .map((batch, index) => ({
      batch: `Batch ${index + 1}`,
      time: new Date(batch.timestamp).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      Cement: batch.cement_weight,
      Sand: batch.sand_weight,
      Gravel: batch.gravel_weight,
      Water: batch.water_weight,
    }));

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium mb-2">{label}</p>
          {payload.map((entry: any) => (
            <p
              key={entry.name}
              className="text-sm"
              style={{ color: entry.color }}
            >
              {entry.name}: {entry.value.toFixed(1)} kg
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">
          Material Weights per Batch
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Comparison of material quantities across recent batches
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-64 md:h-80">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="batch"
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                  label={{
                    value: "Weight (kg)",
                    angle: -90,
                    position: "insideLeft",
                    style: { textAnchor: "middle", fontSize: 12 },
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                
                <Bar
                  dataKey="Cement"
                  fill="hsl(var(--chart-cement))"
                  radius={[2, 2, 0, 0]}
                />
                <Bar
                  dataKey="Sand"
                  fill="hsl(var(--chart-sand))"
                  radius={[2, 2, 0, 0]}
                />
                <Bar
                  dataKey="Gravel"
                  fill="hsl(var(--chart-aggregate))"
                  radius={[2, 2, 0, 0]}
                />
                <Bar
                  dataKey="Water"
                  fill="hsl(var(--chart-water))"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
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
