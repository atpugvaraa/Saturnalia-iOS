// src/hooks/useNetworkStatus.ts
import { useState, useEffect, useCallback } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  isOffline: boolean;
  type: string;
  refresh: () => Promise<NetInfoState>;
}

/**
 * Hook to monitor network connectivity status
 * Returns current network connection state and offline determination
 */
export const useNetworkStatus = (): NetworkStatus => {
  const [status, setStatus] = useState<{
    isConnected: boolean;
    isInternetReachable: boolean | null;
    type: string;
  }>({
    isConnected: true, // Optimistically assume connected initially
    isInternetReachable: null,
    type: 'unknown',
  });

  const updateState = useCallback((state: NetInfoState) => {
    setStatus({
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable ?? null,
      type: state.type,
    });
  }, []);

  useEffect(() => {
    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener(updateState);

    // Initial check
    NetInfo.fetch().then(updateState);

    return () => {
      unsubscribe();
    };
  }, [updateState]);

  const refresh = useCallback(async () => {
    const state = await NetInfo.refresh();
    updateState(state);
    return state;
  }, [updateState]);

  // If explicitly not connected, or internet reachability check explicitly failed, the device is offline
  const isOffline = status.isConnected === false || status.isInternetReachable === false;

  return {
    ...status,
    isOffline,
    refresh,
  };
};
