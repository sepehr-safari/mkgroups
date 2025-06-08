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

export function useGroupMetadata(groupId: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['group-metadata', groupId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      
      try {
        const events = await nostr.query(
          [{ kinds: [39000], '#d': [groupId], limit: 1 }],
          { signal }
        );

        if (events.length > 0) {
          return parseGroupMetadata(events[0]);
        }

        // Return default metadata if no event found
        return {
          id: groupId,
          name: groupId === '_' ? 'General' : `Group ${groupId}`,
          about: groupId === '_' ? 'General discussion for this relay' : 'A Nostr group chat',
          public: true,
          open: true,
        };
      } catch (error) {
        console.error('Failed to fetch group metadata:', error);
        return {
          id: groupId,
          name: groupId === '_' ? 'General' : `Group ${groupId}`,
          about: groupId === '_' ? 'General discussion for this relay' : 'A Nostr group chat',
          public: true,
          open: true,
        };
      }
    },
    staleTime: 300000, // 5 minutes
  });
}