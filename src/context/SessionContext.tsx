import React, {createContext, useContext} from 'react';

import type {BootstrapState} from '../logic/bootstrap';

const SessionContext = createContext<BootstrapState | null>(null);

export function SessionProvider({
  value,
  children,
}: {
  value: BootstrapState;
  children: React.ReactNode;
}) {
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const session = useContext(SessionContext);
  if (!session) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return session;
}

/** Safe read when a screen may render outside the provider during tests. */
export function useSessionOptional() {
  return useContext(SessionContext);
}
