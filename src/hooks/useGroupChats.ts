import { useInfiniteQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import type { NostrEvent } from '@nostrify/nostrify';

const CHATS_PER_PAGE = 50;

function validateGroupChat(event: NostrEvent, groupId: string): boolean {
  // Check if it's a chat message (kind 9)
  if (event.kind !== 9) return false;

  // Check for required h tag with correct group ID
  const hTag = event.tags.find(([name]) => name === 'h')?.[1];
  if (hTag !== groupId) return false;

  return true;
}

export function useGroupChats(groupId: string) {
  const { nostr } = useNostr();

  return useInfiniteQuery({
    queryKey: ['group-chats', groupId],
    queryFn: async ({ pageParam, signal }) => {
      const querySignal = AbortSignal.any([signal, AbortSignal.timeout(5000)]);
      
      try {
        const filter: {
          kinds: number[];
          '#h': string[];
          limit: number;
          until?: number;
        } = {
          kinds: [9],
          '#h': [groupId],
          limit: CHATS_PER_PAGE,
        };

        // Add until parameter for pagination
        if (pageParam) {
          filter.until = pageParam;
        }

        const events = await nostr.query([filter], { signal: querySignal });
        
        // Filter and validate chat messages
        const validChats = events.filter(event => validateGroupChat(event, groupId));
        
        // Sort by created_at descending (newest first)
        validChats.sort((a, b) => b.created_at - a.created_at);

        return {
          chats: validChats,
          nextCursor: validChats.length === CHATS_PER_PAGE 
            ? validChats[validChats.length - 1].created_at 
            : undefined,
        };
      } catch (error) {
        console.error('Failed to fetch group chats:', error);
        return {
          chats: [],
          nextCursor: undefined,
        };
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as number | undefined,
    staleTime: 30000, // 30 seconds
    refetchInterval: 30000, // Refetch every 30 seconds for new messages
  });
}