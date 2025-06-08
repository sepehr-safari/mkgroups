import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import type { NostrEvent } from '@nostrify/nostrify';

function validateZapReceipt(event: NostrEvent): boolean {
  // Check if it's a zap receipt
  if (event.kind !== 9735) return false;

  // Check for required tags
  const bolt11Tag = event.tags.find(([name]) => name === 'bolt11')?.[1];
  const descriptionTag = event.tags.find(([name]) => name === 'description')?.[1];
  
  if (!bolt11Tag || !descriptionTag) return false;

  try {
    // Validate that description is valid JSON
    JSON.parse(descriptionTag);
    return true;
  } catch {
    return false;
  }
}

export function useZapReceipts(eventId: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['zap-receipts', eventId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      
      try {
        const events = await nostr.query(
          [{ kinds: [9735], '#e': [eventId], limit: 100 }],
          { signal }
        );

        // Filter and validate zap receipts
        const validReceipts = events.filter(validateZapReceipt);
        
        // Sort by created_at descending
        validReceipts.sort((a, b) => b.created_at - a.created_at);

        return validReceipts;
      } catch (error) {
        console.error('Failed to fetch zap receipts:', error);
        return [];
      }
    },
    staleTime: 60000, // 1 minute
  });
}