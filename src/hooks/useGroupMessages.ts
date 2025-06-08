import { useInfiniteQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import type { NostrEvent } from '@nostrify/nostrify';

const MESSAGES_PER_PAGE = 50;

function validateGroupMessage(event: NostrEvent, groupId: string): boolean {
  // Support legacy kind 1, new kind 9 chats, and kind 11 threads
  if (![1, 9, 11].includes(event.kind)) return false;

  // Check for required h tag with correct group ID
  const hTag = event.tags.find(([name]) => name === 'h')?.[1];
  if (hTag !== groupId) return false;

  // For kind 11 (threads), require title tag
  if (event.kind === 11) {
    const titleTag = event.tags.find(([name]) => name === 'title')?.[1];
    if (!titleTag) return false;
  }

  return true;
}

export function useGroupMessages(groupId: string) {
  const { nostr } = useNostr();

  return useInfiniteQuery({
    queryKey: ['group-messages', groupId],
    queryFn: async ({ pageParam, signal }) => {
      const querySignal = AbortSignal.any([signal, AbortSignal.timeout(5000)]);
      
      try {
        const filter: {
          kinds: number[];
          '#h': string[];
          limit: number;
          until?: number;
        } = {
          kinds: [1, 9, 11], // Support legacy kind 1, chats (9), and threads (11)
          '#h': [groupId],
          limit: MESSAGES_PER_PAGE,
        };

        // Add until parameter for pagination
        if (pageParam) {
          filter.until = pageParam;
        }

        const events = await nostr.query([filter], { signal: querySignal });
        
        // Filter and validate messages
        const validMessages = events.filter(event => validateGroupMessage(event, groupId));
        
        // Sort by created_at descending (newest first)
        validMessages.sort((a, b) => b.created_at - a.created_at);

        return {
          messages: validMessages,
          nextCursor: validMessages.length === MESSAGES_PER_PAGE 
            ? validMessages[validMessages.length - 1].created_at 
            : undefined,
        };
      } catch (error) {
        console.error('Failed to fetch group messages:', error);
        return {
          messages: [],
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