import { useEffect, useState } from 'react';
import type { GravixEngine } from '@giraphics/gravix-engine';

export function useEngineStats(
  engine: GravixEngine | null,
  vertexCount: number,
  extra = '',
): string {
  const [text, setText] = useState('starting…');

  useEffect(() => {
    if (!engine) {
      setText('starting…');
      return;
    }
    const tick = (): void => {
      const stats = engine.getStats();
      setText(
        `backend ${engine.backendKind} · fps ${stats.fps.toFixed(0)} · frame ${engine.world.time.frame} · verts ${vertexCount.toLocaleString()} · resources ${engine.world.resources.size()}${extra}`,
      );
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [engine, vertexCount, extra]);

  return text;
}
