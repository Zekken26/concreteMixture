/**
 * Mix History Table Component
 * Displays historical batch data in a scrollable, responsive table
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { MixBatch, MixStatus } from "@/types/concrete";

interface MixHistoryTableProps {
  history: MixBatch[];
}

// Badge styling for each status
const statusBadgeConfig: Record<
  MixStatus,
  { variant: "default" | "destructive" | "secondary"; className: string }
> = {
  too_dry: {
    variant: "destructive",
    className: "bg-red-600 hover:bg-red-700 text-white",
  },
  acceptable: {
    variant: "default",
    className: "bg-green-600 hover:bg-green-700 text-white",
  },
  too_wet: {
    variant: "secondary",
    className: "bg-blue-600 hover:bg-blue-700 text-white",
  },
};

export const MixHistoryTable = ({ history }: MixHistoryTableProps) => {
  // Sort by timestamp (newest first)
  const sortedHistory = [...history].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Format timestamp for display
  const formatDateTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Mix History</CardTitle>
        <p className="text-sm text-muted-foreground">
          Recent batch records from sensor readings ({sortedHistory.length} records)
        </p>
      </CardHeader>
      <CardContent>
        {sortedHistory.length > 0 ? (
          <ScrollArea className="h-80 rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="font-semibold">Date/Time</TableHead>
                  <TableHead className="text-right font-semibold">Cement (kg)</TableHead>
                  <TableHead className="text-right font-semibold">Water (kg)</TableHead>
                  <TableHead className="text-right font-semibold">Sand (kg)</TableHead>
                  <TableHead className="text-right font-semibold">Gravel (kg, opt.)</TableHead>
                  <TableHead className="text-right font-semibold">W/C Ratio</TableHead>
                  <TableHead className="text-center font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedHistory.map((batch, index) => (
                  <TableRow
                    key={`${batch.timestamp}-${index}`}
                    className="hover:bg-muted/50"
                  >
                    <TableCell className="font-medium whitespace-nowrap">
                      {formatDateTime(batch.timestamp)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {batch.cement_weight.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {batch.water_weight.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {batch.sand_weight.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {batch.gravel_weight === 0 ? "--" : batch.gravel_weight.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {batch.wc_ratio.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        className={statusBadgeConfig[batch.status]?.className || "bg-gray-500"}
                      >
                        {batch.status.toUpperCase().replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        ) : (
          <div className="h-40 flex flex-col items-center justify-center border rounded-md">
            <p className="text-blue-600 font-semibold mb-1">No History Yet</p>
            <p className="text-sm text-muted-foreground">Waiting for ESP32 to send first batch data</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
