import React, { useEffect, useRef } from 'react';
import { NostrEvent, NPool, NRelay1, NostrFilter } from '@nostrify/nostrify';
import { NostrContext } from '@nostrify/react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '@/hooks/useAppContext';

interface NostrProviderProps {
  children: React.ReactNode;
}

// General purpose relays for profile metadata and other content
const GENERAL_RELAYS = [
  'wss://relay.nostr.band',
  'wss://relay.damus.io',
  'wss://relay.primal.net',
];

const NostrProvider: React.FC<NostrProviderProps> = (props) => {
  const { children } = props;
  const { config, presetRelays } = useAppContext();

  const queryClient = useQueryClient();

  // Create NPool instance only once
  const pool = useRef<NPool | undefined>(undefined);

  // Use refs so the pool always has the latest data
  const relayUrl = useRef<string>(config.relayUrl);

  // Update refs when config changes
  useEffect(() => {
    relayUrl.current = config.relayUrl;
    queryClient.resetQueries();
  }, [config.relayUrl, queryClient]);

  // Initialize NPool only once
  if (!pool.current) {
    pool.current = new NPool({
      open(url: string) {
        return new NRelay1(url);
      },
      reqRouter(filters: NostrFilter[]) {
        const routingMap = new Map<string, NostrFilter[]>();

        for (const filter of filters) {
          // Route different types of queries to appropriate relays
          if (isGroupQuery(filter)) {
            // Group-related queries go to the selected group relay
            const existing = routingMap.get(relayUrl.current) || [];
            routingMap.set(relayUrl.current, [...existing, filter]);
          } else if (isProfileQuery(filter)) {
            // Profile queries go to general relays
            for (const relay of GENERAL_RELAYS) {
              const existing = routingMap.get(relay) || [];
              routingMap.set(relay, [...existing, filter]);
            }
          } else {
            // Other queries go to both the selected relay and general relays
            const allRelays = [relayUrl.current, ...GENERAL_RELAYS];
            for (const relay of allRelays) {
              const existing = routingMap.get(relay) || [];
              routingMap.set(relay, [...existing, filter]);
            }
          }
        }

        return routingMap;
      },
      eventRouter(_event: NostrEvent) {
        // Publish to the selected relay
        const allRelays = new Set<string>([relayUrl.current]);

        // Also publish to the preset relays, capped to 5
        for (const { url } of (presetRelays ?? [])) {
          allRelays.add(url);

          if (allRelays.size >= 5) {
            break;
          }
        }

        return [...allRelays];
      },
    });
  }

  return (
    <NostrContext.Provider value={{ nostr: pool.current }}>
      {children}
    </NostrContext.Provider>
  );
};

// Helper function to determine if a filter is for group-related content
function isGroupQuery(filter: NostrFilter): boolean {
  // Group messages (kind 1 with h tag)
  if (filter.kinds?.includes(1) && filter['#h']) {
    return true;
  }
  
  // Group metadata (kind 39000-39005)
  if (filter.kinds?.some(kind => kind >= 39000 && kind <= 39005)) {
    return true;
  }

  return false;
}

// Helper function to determine if a filter is for profile metadata
function isProfileQuery(filter: NostrFilter): boolean {
  // Profile metadata (kind 0)
  if (filter.kinds?.includes(0)) {
    return true;
  }

  return false;
}

export default NostrProvider;