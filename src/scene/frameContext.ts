import { createContext, useContext, type RefObject } from 'react';
import type { SceneFrame } from '../shared/types';

/** Latest SceneFrame, read inside useFrame without re-rendering the scene graph. */
export const FrameContext = createContext<RefObject<SceneFrame | null> | null>(null);

export function useFrameRef(): RefObject<SceneFrame | null> {
  const ref = useContext(FrameContext);
  if (!ref) throw new Error('useFrameRef must be used inside HelmetScene');
  return ref;
}
