/**
 * API Service for communicating with the Django REST backend
 * Handles all HTTP requests and error handling
 */

import axios, { AxiosError } from "axios";
import { MixBatch, LatestMixResponse, MixHistoryResponse } from "@/types/concrete";

// Base URL for the Django API - change this to match your backend
const API_BASE_URL = "http://localhost:8000/api";

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000, // 5 second timeout
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Fetch the latest mix batch data from sensors
 * Endpoint: GET /api/latest-mix/
 */
export const fetchLatestMix = async (): Promise<MixBatch> => {
  const response = await apiClient.get<LatestMixResponse>("/latest-mix/");
  return response.data.data;
};

/**
 * Fetch historical mix batch data
 * Endpoint: GET /api/mix-history/
 * @param limit - Maximum number of records to return (default: 50)
 */
export const fetchMixHistory = async (limit: number = 50): Promise<MixBatch[]> => {
  const response = await apiClient.get<MixHistoryResponse>("/mix-history/", {
    params: { limit }
  });
  return response.data.data;
};

/**
 * Delete a mix batch from history
 * Endpoint: DELETE /api/mix-history/:id/
 */
export const deleteMixHistoryItem = async (batchId: number): Promise<void> => {
  await apiClient.delete(`/mix-history/${batchId}/`);
};

/**
 * Create a new mix batch (for ESP32)
 * Endpoint: POST /api/mix-data/
 */
export const createMixBatch = async (data: {
  cement_weight: number;
  water_weight: number;
  sand_weight: number;
  gravel_weight: number;
}): Promise<MixBatch> => {
  const response = await apiClient.post("/mix-data/", data);
  return response.data.data;
};

/**
 * Check if an error is a network/connection error
 */
export const isNetworkError = (error: unknown): boolean => {
  if (error instanceof AxiosError) {
    return (
      error.code === "ECONNABORTED" ||
      error.code === "ERR_NETWORK" ||
      !error.response
    );
  }
  return false;
};

/**
 * Get a user-friendly error message
 */
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof AxiosError) {
    if (isNetworkError(error)) {
      return "⚠️ Cannot connect to Django backend. Make sure server is running: cd backend && python manage.py runserver 0.0.0.0:8000";
    }
    if (error.response?.status === 404) {
      // Don't show as error - this is normal when waiting for first ESP32 data
      return "";
    }
    if (error.response?.status === 500) {
      return "Server error occurred. Check Django terminal for details.";
    }
    return error.message;
  }
  return "An unexpected error occurred.";
};
