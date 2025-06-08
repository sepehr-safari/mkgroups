import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useNostr } from '@nostrify/react';
import { useToast } from '@/hooks/useToast';

interface CreateThreadParams {
  groupId: string;
  title: string;
  content: string;
}

export function useCreateThread() {
  const { mutate: publishEvent } = useNostrPublish();
  const { nostr } = useNostr();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, title, content }: CreateThreadParams) => {
      // Get recent events for timeline references
      const recentEvents = await nostr.query(
        [{ kinds: [9, 11, 1111], '#h': [groupId], limit: 50 }],
        { signal: AbortSignal.timeout(3000) }
      );

      // Create timeline references (first 8 chars of recent event IDs)
      const previousRefs = recentEvents
        .slice(0, 10) // Take up to 10 recent events
        .map(event => event.id.substring(0, 8));

      const tags: string[][] = [
        ['h', groupId],
        ['title', title],
      ];

      // Add timeline references
      if (previousRefs.length > 0) {
        tags.push(['previous', ...previousRefs]);
      }

      return new Promise<void>((resolve, reject) => {
        publishEvent(
          {
            kind: 11,
            content,
            tags,
          },
          {
            onSuccess: () => {
              // Invalidate and refetch threads
              queryClient.invalidateQueries({ 
                queryKey: ['group-threads', groupId] 
              });
              toast({
                title: "Thread created",
                description: "Your thread has been posted successfully.",
              });
              resolve();
            },
            onError: (error) => {
              console.error('Failed to create thread:', error);
              toast({
                title: "Failed to create thread",
                description: "Please try again.",
                variant: "destructive",
              });
              reject(error);
            },
          }
        );
      });
    },
  });
}