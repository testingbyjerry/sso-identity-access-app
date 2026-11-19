import { useQuery } from '@tanstack/react-query';
import type { SystemHealth, ReadinessCheck } from '@sso/shared';
import { apiClient } from '../lib/api-client.js';

export function useSystemHealth() {
  return useQuery<SystemHealth>({
    queryKey: ['system', 'health'],
    queryFn: () => apiClient.get<SystemHealth>('/api/v1/health'),
    refetchInterval: 10000,
    retry: 2,
  });
}

export function useSystemReadiness() {
  return useQuery<ReadinessCheck>({
    queryKey: ['system', 'readiness'],
    queryFn: () => apiClient.get<ReadinessCheck>('/api/v1/ready'),
    refetchInterval: 15000,
    retry: 1,
  });
}
