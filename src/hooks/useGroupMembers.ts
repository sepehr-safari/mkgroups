import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';

export function useGroupMembers(groupId: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['group-members', groupId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      
      try {
        const events = await nostr.query(
          [{ kinds: [39002], '#d': [groupId], limit: 1 }],
          { signal }
        );

        if (events.length > 0) {
          const memberTags = events[0].tags.filter(([name]) => name === 'p');
          return memberTags.map(([, pubkey]) => pubkey);
        }

        return [];
      } catch (error) {
        console.error('Failed to fetch group members:', error);
        return [];
      }
    },
    staleTime: 60000, // 1 minute
  });
}