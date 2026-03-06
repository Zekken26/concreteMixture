/**
 * Sensor Values Grid Component
 * Displays live sensor readings in a responsive grid layout
 */

import { Package, Mountain, Layers, Droplet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { MixBatch } from "@/types/concrete";

interface SensorValuesGridProps {
  mixData: MixBatch | null;
}

// Configuration for each sensor value card
const sensorConfig = [
  {
    key: "cement_weight" as keyof MixBatch,
    label: "Cement",
    unit: "kg",
    icon: Package,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    description: "Portland cement weight",
  },
  {
    key: "water_weight" as keyof MixBatch,
    label: "Water",
    unit: "kg",
    icon: Droplet,
    color: "text-cyan-600",
    bgColor: "bg-cyan-100",
    description: "Water content",
  },
  {
    key: "sand_weight" as keyof MixBatch,
    label: "Sand",
    unit: "kg",
    icon: Mountain,
    color: "text-amber-600",
    bgColor: "bg-amber-100",
    description: "Fine aggregate weight",
  },
  {
    key: "gravel_weight" as keyof MixBatch,
    label: "Gravel (Opt.)",
    unit: "kg",
    icon: Layers,
    color: "text-gray-600",
    bgColor: "bg-gray-100",
    description: "Optional coarse aggregate",
  },
];

export const SensorValuesGrid = ({ mixData }: SensorValuesGridProps) => {
  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold mb-4 text-foreground">
        Live Sensor Values
      </h2>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {sensorConfig.map((sensor) => {
          const SensorIcon = sensor.icon;
          const rawValue = mixData ? (mixData[sensor.key] as number | null | undefined) : null;
          const value =
            sensor.key === "gravel_weight" && (rawValue === 0 || rawValue === null || rawValue === undefined)
              ? null
              : rawValue;

          return (
            <Card key={sensor.key} className="relative overflow-hidden">
              <CardContent className="p-4">
                {/* Icon and Label */}
                <div className="flex items-center gap-2 mb-3">
                  <div className={`p-2 rounded-lg ${sensor.bgColor}`}>
                    <SensorIcon className={`h-5 w-5 ${sensor.color}`} />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-foreground">
                      {sensor.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {sensor.description}
                    </p>
                  </div>
                </div>

                {/* Value Display */}
                <div className="text-right">
                  {value !== null ? (
                    <p className="text-2xl md:text-3xl font-bold tabular-nums text-foreground">
                      {value.toFixed(1)}
                      <span className="text-base font-normal text-muted-foreground ml-1">
                        {sensor.unit}
                      </span>
                    </p>
                  ) : (
                    <div className="flex flex-col items-end">
                      <p className="text-2xl font-bold text-muted-foreground">--</p>
                      <p className="text-xs text-blue-600">Waiting...</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
