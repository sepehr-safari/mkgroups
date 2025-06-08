import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import type { NostrEvent } from '@nostrify/nostrify';

interface GroupMetadata {
  id: string;
  name?: string;
  about?: string;
  picture?: string;
  public?: boolean;
  open?: boolean;
  memberCount?: number;
}

function parseGroupMetadata(event: NostrEvent): GroupMetadata {
  const id = event.tags.find(([name]) => name === 'd')?.[1] || '';
  const name = event.tags.find(([name]) => name === 'name')?.[1];
  const about = event.tags.find(([name]) => name === 'about')?.[1];
  const picture = event.tags.find(([name]) => name === 'picture')?.[1];
  const isPublic = event.tags.some(([name]) => name === 'public');
  const isPrivate = event.tags.some(([name]) => name === 'private');
  const isOpen = event.tags.some(([name]) => name === 'open');
  const isClosed = event.tags.some(([name]) => name === 'closed');

  return {
    id,
    name,
    about,
    picture,
    public: isPrivate ? false : (isPublic ? true : undefined),
    open: isClosed ? false : (isOpen ? true : undefined),
  };
}

export function useGroups() {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['groups'],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      
      try {
        // Fetch group metadata events (kind 39000)
        const metadataEvents = await nostr.query(
          [{ kinds: [39000], limit: 100 }],
          { signal }
        );

        // Fetch group member events (kind 39002) to get member counts
        const memberEvents = await nostr.query(
          [{ kinds: [39002], limit: 100 }],
          { signal }
        );

        const memberCounts = new Map<string, number>();
        memberEvents.forEach(event => {
          const groupId = event.tags.find(([name]) => name === 'd')?.[1];
          if (groupId) {
            const memberCount = event.tags.filter(([name]) => name === 'p').length;
            memberCounts.set(groupId, memberCount);
          }
        });

        const groups = metadataEvents.map(event => {
          const group = parseGroupMetadata(event);
          group.memberCount = memberCounts.get(group.id);
          return group;
        });

        // Add default group if no groups found
        if (groups.length === 0) {
          groups.push({
            id: '_',
            name: 'General',
            about: 'General discussion for this relay',
            public: true,
            open: true,
          });
        }

        return groups;
      } catch (error) {
        console.error('Failed to fetch groups:', error);
        // Return default group on error
        return [{
          id: '_',
          name: 'General',
          about: 'General discussion for this relay',
          public: true,
          open: true,
        }];
      }
    },
    staleTime: 60000, // 1 minute
    retry: 2,
  });
}