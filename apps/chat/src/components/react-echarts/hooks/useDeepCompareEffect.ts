import { useEffect, useRef } from 'react';
import isEqual from 'lodash/isEqual';

export type UseDeepCompareEffect = (
  callback: () => void | (() => void),
  dependencies: any[]
) => void;

export const useDeepCompareEffect: UseDeepCompareEffect = (callback, dependencies) => {
  const previousDependencies = useRef<any[]>();

  useEffect(() => {
    if (!isEqual(previousDependencies.current, dependencies)) {
      previousDependencies.current = dependencies;
      return callback();
    }
  }, dependencies);
};
