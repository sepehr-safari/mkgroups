import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useNostr } from '@nostrify/react';
import { useToast } from '@/hooks/useToast';
import * as nip19 from 'nostr-tools/nip19';

interface SendMessageParams {
  groupId: string;
  content: string;
  messageType?: 'chat' | 'legacy'; // Default to 'chat' for new NIP-C7 messages
  replyTo?: {
    eventId: string;
    relayUrl: string;
    authorPubkey: string;
  };
}

export function useSendMessage() {
  const { mutate: publishEvent } = useNostrPublish();
  const { nostr } = useNostr();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, content, messageType = 'chat', replyTo }: SendMessageParams) => {
      // Get recent events for timeline references
      const recentEvents = await nostr.query(
        [{ kinds: [1, 9, 11, 1111], '#h': [groupId], limit: 50 }],
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
      const eventKind = messageType === 'chat' ? 9 : 1; // Use kind 9 for chat, kind 1 for legacy

      // Add reply reference based on message type
      if (replyTo) {
        if (messageType === 'chat') {
          // NIP-C7 chat reply uses q tag and nevent reference
          tags.push(['q', replyTo.eventId, replyTo.relayUrl, replyTo.authorPubkey]);
          
          // Create nevent reference for the content
          const nevent = nip19.neventEncode({
            id: replyTo.eventId,
            relays: [replyTo.relayUrl],
            author: replyTo.authorPubkey,
          });
          
          finalContent = `nostr:${nevent}\n${content}`;
        } else {
          // Legacy reply uses e tag
          tags.push(['e', replyTo.eventId, replyTo.relayUrl, 'reply']);
        }
      }

      return new Promise<void>((resolve, reject) => {
        publishEvent(
          {
            kind: eventKind,
            content: finalContent,
            tags,
          },
          {
            onSuccess: () => {
              // Invalidate and refetch messages
              queryClient.invalidateQueries({ 
                queryKey: ['group-messages', groupId] 
              });
              // Also invalidate chats if it's a chat message
              if (messageType === 'chat') {
                queryClient.invalidateQueries({ 
                  queryKey: ['group-chats', groupId] 
                });
              }
              resolve();
            },
            onError: (error) => {
              console.error('Failed to send message:', error);
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