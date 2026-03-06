/**
 * TypeScript interfaces for the Concrete Mix Monitoring System
 * These define the shape of data coming from the Django REST API
 */

// Possible status values for a concrete mix batch
export type MixStatus = "too_dry" | "acceptable" | "too_wet";

// Single mix batch data from the API
export interface MixBatch {
  id: number;               // Unique identifier for the batch
  cement_weight: number;    // Weight of cement in kg
  water_weight: number;     // Weight of water in kg
  sand_weight: number;      // Weight of sand in kg
  gravel_weight: number;    // Weight of gravel in kg
  moisture: number;         // Moisture sensor percentage (0-100)
  wc_ratio: number;         // Water-to-cement ratio (typically 0.4-0.6)
  status: MixStatus;        // Quality status of the mix
  timestamp: string;        // ISO 8601 timestamp
}

// API response structure for latest mix
export interface LatestMixResponse {
  message: string;
  data: MixBatch;
}

// API response structure for mix history
export interface MixHistoryResponse {
  message: string;
  count: number;
  data: MixBatch[];
}

// Connection status for the dashboard
export type ConnectionStatus = "connected" | "disconnected" | "connecting";
