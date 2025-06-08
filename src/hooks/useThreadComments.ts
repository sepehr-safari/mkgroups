import { useInfiniteQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import type { NostrEvent } from '@nostrify/nostrify';

const COMMENTS_PER_PAGE = 50;

function validateThreadComment(event: NostrEvent, threadId: string, groupId: string): boolean {
  // Check if it's a comment (kind 1111)
  if (event.kind !== 1111) return false;

  // Check for required h tag with correct group ID
  const hTag = event.tags.find(([name]) => name === 'h')?.[1];
  if (hTag !== groupId) return false;

  // Check for required K tag with value "11" (thread kind)
  const kTag = event.tags.find(([name]) => name === 'K')?.[1];
  if (kTag !== '11') return false;

  // Check for required E tag referencing the thread
  const eTag = event.tags.find(([name]) => name === 'E')?.[1];
  if (eTag !== threadId) return false;

  return true;
}

export function useThreadComments(threadId: string, groupId: string) {
  const { nostr } = useNostr();

  return useInfiniteQuery({
    queryKey: ['thread-comments', threadId, groupId],
    queryFn: async ({ pageParam, signal }) => {
      const querySignal = AbortSignal.any([signal, AbortSignal.timeout(5000)]);
      
      try {
        const filter: {
          kinds: number[];
          '#h': string[];
          '#E': string[];
          limit: number;
          until?: number;
        } = {
          kinds: [1111],
          '#h': [groupId],
          '#E': [threadId],
          limit: COMMENTS_PER_PAGE,
        };

        // Add until parameter for pagination
        if (pageParam) {
          filter.until = pageParam;
        }

        const events = await nostr.query([filter], { signal: querySignal });
        
        // Filter and validate comments
        const validComments = events.filter(event => validateThreadComment(event, threadId, groupId));
        
        // Sort by created_at ascending (oldest first for comments)
        validComments.sort((a, b) => a.created_at - b.created_at);

        return {
          comments: validComments,
          nextCursor: validComments.length === COMMENTS_PER_PAGE 
            ? validComments[validComments.length - 1].created_at 
            : undefined,
        };
      } catch (error) {
        console.error('Failed to fetch thread comments:', error);
        return {
          comments: [],
          nextCursor: undefined,
        };
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as number | undefined,
    staleTime: 30000, // 30 seconds
    refetchInterval: 30000, // Refetch every 30 seconds for new comments
  });
}