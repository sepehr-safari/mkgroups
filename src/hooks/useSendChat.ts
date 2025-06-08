import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useNostr } from '@nostrify/react';
import { useToast } from '@/hooks/useToast';
import * as nip19 from 'nostr-tools/nip19';

interface SendChatParams {
  groupId: string;
  content: string;
  replyTo?: {
    eventId: string;
    relayUrl: string;
    authorPubkey: string;
  };
}

export function useSendChat() {
  const { mutate: publishEvent } = useNostrPublish();
  const { nostr } = useNostr();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, content, replyTo }: SendChatParams) => {
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
      ];

      // Add timeline references
      if (previousRefs.length > 0) {
        tags.push(['previous', ...previousRefs]);
      }

      let finalContent = content;

      // Add reply reference if replying to a message
      if (replyTo) {
        tags.push(['q', replyTo.eventId, replyTo.relayUrl, replyTo.authorPubkey]);
        
        // Create nevent reference for the content
        const nevent = nip19.neventEncode({
          id: replyTo.eventId,
          relays: [replyTo.relayUrl],
          author: replyTo.authorPubkey,
        });
        
        finalContent = `nostr:${nevent}\n${content}`;
      }

      return new Promise<void>((resolve, reject) => {
        publishEvent(
          {
            kind: 9,
            content: finalContent,
            tags,
          },
          {
            onSuccess: () => {
              // Invalidate and refetch chats
              queryClient.invalidateQueries({ 
                queryKey: ['group-chats', groupId] 
              });
              resolve();
            },
            onError: (error) => {
              console.error('Failed to send chat message:', error);
              toast({
                title: "Failed to send message",
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