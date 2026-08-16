import { useEffect, useRef, useState, type RefObject } from 'react';
import { GravixEngine, type GravixEngineOptions } from '@giraphics/gravix-engine';
import { BabylonBackend } from '@giraphics/gravix-engine/babylon';

import { readLaunchOptions } from './options';

export function useGravixEngine(
  configure: (engine: GravixEngine) => void | Promise<void>,
  extraOptions?: Pick<GravixEngineOptions, 'clearColor' | 'sceneName' | 'systems'>,
): { canvasRef: RefObject<HTMLCanvasElement | null>; engine: GravixEngine | null } {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [engine, setEngine] = useState<GravixEngine | null>(null);
  const configureRef = useRef(configure);
  configureRef.current = configure;
  const extraRef = useRef(extraOptions);
  extraRef.current = extraOptions;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const launch = readLaunchOptions();
    let cancelled = false;
    let created: GravixEngine | undefined;

    void (async () => {
      const backend = new BabylonBackend();
      const next = await GravixEngine.create(backend, {
        canvas,
        preference: launch.preference,
        failDeviceCreation: launch.failDeviceCreation,
        ...extraRef.current,
      });
      if (cancelled) {
        next.dispose();
        return;
      }
      await configureRef.current(next);
      if (cancelled) {
        next.dispose();
        return;
      }
      created = next;
      next.start();
      setEngine(next);
    })().catch((error: unknown) => {
      console.error('GravixEngine failed to start', error);
    });

    return () => {
      cancelled = true;
      created?.dispose();
      setEngine(null);
    };
  }, []);

  return { canvasRef, engine };
}
