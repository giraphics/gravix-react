import { BackendPreference } from '@giraphics/gravix-engine';

export interface LaunchOptions {
  readonly preference: BackendPreference;
  readonly failDeviceCreation: boolean;
  readonly pointCapacity: number;
}

export function readLaunchOptions(): LaunchOptions {
  const params = new URLSearchParams(window.location.search);
  const points = Number(params.get('points') ?? 300_000);
  return {
    preference:
      params.get('backend') === 'webgl' ? BackendPreference.WebGL2 : BackendPreference.Auto,
    failDeviceCreation: params.get('failDevice') === '1',
    pointCapacity: Number.isFinite(points) && points > 0 ? Math.floor(points) : 300_000,
  };
}
