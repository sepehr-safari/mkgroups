import { useInfiniteQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import type { NostrEvent } from '@nostrify/nostrify';

const THREADS_PER_PAGE = 20;

function validateGroupThread(event: NostrEvent, groupId: string): boolean {
  // Check if it's a thread post (kind 11)
  if (event.kind !== 11) return false;

  // Check for required h tag with correct group ID
  const hTag = event.tags.find(([name]) => name === 'h')?.[1];
  if (hTag !== groupId) return false;

  // Check for required title tag
  const titleTag = event.tags.find(([name]) => name === 'title')?.[1];
  if (!titleTag) return false;

  return true;
}

export function useGroupThreads(groupId: string) {
  const { nostr } = useNostr();

  return useInfiniteQuery({
    queryKey: ['group-threads', groupId],
    queryFn: async ({ pageParam, signal }) => {
      const querySignal = AbortSignal.any([signal, AbortSignal.timeout(5000)]);
      
      try {
        const filter: {
          kinds: number[];
          '#h': string[];
          limit: number;
          until?: number;
        } = {
          kinds: [11],
          '#h': [groupId],
          limit: THREADS_PER_PAGE,
        };

        // Add until parameter for pagination
        if (pageParam) {
          filter.until = pageParam;
        }

        const events = await nostr.query([filter], { signal: querySignal });
        
        // Filter and validate thread posts
        const validThreads = events.filter(event => validateGroupThread(event, groupId));
        
        // Sort by created_at descending (newest first)
        validThreads.sort((a, b) => b.created_at - a.created_at);

        return {
          threads: validThreads,
          nextCursor: validThreads.length === THREADS_PER_PAGE 
            ? validThreads[validThreads.length - 1].created_at 
            : undefined,
        };
      } catch (error) {
        console.error('Failed to fetch group threads:', error);
        return {
          threads: [],
          nextCursor: undefined,
        };
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as number | undefined,
    staleTime: 60000, // 1 minute
    refetchInterval: 60000, // Refetch every minute for new threads
  });
}