import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useNostr } from '@nostrify/react';
import { useToast } from '@/hooks/useToast';

interface SendThreadCommentParams {
  groupId: string;
  threadId: string;
  threadAuthorPubkey: string;
  relayUrl: string;
  content: string;
  replyTo?: {
    eventId: string;
    authorPubkey: string;
    kind: number;
  };
}

export function useSendThreadComment() {
  const { mutate: publishEvent } = useNostrPublish();
  const { nostr } = useNostr();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      groupId, 
      threadId, 
      threadAuthorPubkey, 
      relayUrl, 
      content, 
      replyTo 
    }: SendThreadCommentParams) => {
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
        // Root scope tags (uppercase)
        ['K', '11'], // Root kind is thread (11)
        ['E', threadId, relayUrl, threadAuthorPubkey], // Root thread event
        ['P', threadAuthorPubkey, relayUrl], // Root thread author
        // Parent scope tags (lowercase) - for top-level comments, same as root
        ['e', replyTo?.eventId || threadId, relayUrl, replyTo?.authorPubkey || threadAuthorPubkey],
        ['k', replyTo ? replyTo.kind.toString() : '11'], // Parent kind
        ['p', replyTo?.authorPubkey || threadAuthorPubkey, relayUrl], // Parent author
      ];

      // Add timeline references
      if (previousRefs.length > 0) {
        tags.push(['previous', ...previousRefs]);
      }

      return new Promise<void>((resolve, reject) => {
        publishEvent(
          {
            kind: 1111,
            content,
            tags,
          },
          {
            onSuccess: () => {
              // Invalidate and refetch thread comments
              queryClient.invalidateQueries({ 
                queryKey: ['thread-comments', threadId, groupId] 
              });
              resolve();
            },
            onError: (error) => {
              console.error('Failed to send thread comment:', error);
              toast({
                title: "Failed to send comment",
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