/**
 * Custom hook for fetching and managing concrete mix data
 * Handles polling (real-time-ish) and error handling
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { AxiosError } from "axios";
import { MixBatch, ConnectionStatus } from "@/types/concrete";
import { fetchLatestMix, fetchMixHistory, getErrorMessage } from "@/services/api";

// Polling intervals
// - Latest mix is polled frequently for "real-time" status
// - History is polled less frequently to reduce load
const LATEST_REFRESH_INTERVAL = 1000;
const HISTORY_REFRESH_INTERVAL = 5000;

// How many consecutive failures before marking disconnected
const DISCONNECT_AFTER_FAILURES = 2;

interface UseMixDataReturn {
  latestMix: MixBatch | null;
  mixHistory: MixBatch[];
  connectionStatus: ConnectionStatus;
  lastUpdated: Date | null;
  error: string | null;
  isRefreshing: boolean;
  refreshData: () => Promise<void>;
}

export const useMixData = (): UseMixDataReturn => {
  // State for mix data
  const [latestMix, setLatestMix] = useState<MixBatch | null>(null);
  const [mixHistory, setMixHistory] = useState<MixBatch[]>([]);
  
  // State for connection and loading
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Refs for intervals + connection stability
  const latestIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const historyIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const failureStreakRef = useRef(0);

  const markConnected = useCallback(() => {
    failureStreakRef.current = 0;
    setConnectionStatus("connected");
    setError(null);
  }, []);

  const markFailure = useCallback((err: unknown) => {
    const msg = getErrorMessage(err);

    // 404 means backend is up but no data yet (normal)
    if (err instanceof AxiosError && err.response?.status === 404) {
      markConnected();
      setLatestMix(null);
      return;
    }

    failureStreakRef.current += 1;
    if (failureStreakRef.current >= DISCONNECT_AFTER_FAILURES) {
      setConnectionStatus("disconnected");
    }

    // Keep last known values on screen; just surface the error
    if (msg) setError(msg);
  }, [markConnected]);

  const refreshLatest = useCallback(async () => {
    try {
      const latest = await fetchLatestMix();
      setLatestMix(latest);
      markConnected();
      setLastUpdated(new Date());
    } catch (err) {
      markFailure(err);
    }
  }, [markConnected, markFailure]);

  const refreshHistory = useCallback(async () => {
    try {
      const history = await fetchMixHistory();
      setMixHistory(history);
      markConnected();
    } catch (err) {
      markFailure(err);
    }
  }, [markConnected, markFailure]);

  /**
   * Fetch data from API
   */
  const refreshData = useCallback(async () => {
    // Manual refresh (button)
    setIsRefreshing(true);
    try {
      await Promise.all([refreshLatest(), refreshHistory()]);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshHistory, refreshLatest]);

  // Initial fetch (do not block UI)
  useEffect(() => {
    refreshLatest();
    refreshHistory();
  }, [refreshHistory, refreshLatest]);

  // Poll latest mix frequently for real-time status
  useEffect(() => {
    latestIntervalRef.current = setInterval(() => {
      refreshLatest();
    }, LATEST_REFRESH_INTERVAL);

    return () => {
      if (latestIntervalRef.current) clearInterval(latestIntervalRef.current);
    };
  }, [refreshLatest]);

  // Poll history less frequently
  useEffect(() => {
    historyIntervalRef.current = setInterval(() => {
      refreshHistory();
    }, HISTORY_REFRESH_INTERVAL);

    return () => {
      if (historyIntervalRef.current) clearInterval(historyIntervalRef.current);
    };
  }, [refreshHistory]);

  return {
    latestMix,
    mixHistory,
    connectionStatus,
    lastUpdated,
    error,
    isRefreshing,
    refreshData,
  };
};
