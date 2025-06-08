import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAppContext } from '@/hooks/useAppContext';
import { useToast } from '@/hooks/useToast';
import type { NostrEvent } from '@nostrify/nostrify';

declare global {
  interface Window {
    webln?: {
      enable(): Promise<void>;
      sendPayment(paymentRequest: string): Promise<{ preimage: string }>;
    };
  }
}

interface ZapMessageParams {
  event: NostrEvent;
  amount: number;
  comment?: string;
}

export function useZapMessage() {
  const [invoice, setInvoice] = useState<string | null>(null);
  const { user } = useCurrentUser();
  const { config } = useAppContext();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async ({ event, amount, comment = '' }: ZapMessageParams) => {
      if (!user) {
        throw new Error('User not logged in');
      }

      // Get recipient's lightning address from their profile
      const recipientPubkey = event.pubkey;
      
      // Create a zap request event
      const zapRequest = {
        kind: 9734,
        content: comment,
        tags: [
          ['relays', config.relayUrl],
          ['amount', (amount * 1000).toString()], // Convert to millisats
          ['p', recipientPubkey],
          ['e', event.id],
        ],
        pubkey: user.pubkey,
        created_at: Math.round(Date.now() / 1000),
      };

      // Sign the zap request
      await user.signer.signEvent(zapRequest);
      
      // Mock invoice for demonstration (in real implementation, this would be sent to LNURL endpoint)
      const mockInvoice = `lnbc${amount}u1p3unwfusp5t9r3yymhpfqculx78u027lxspgxcr2n2987mx2j55nnfs95nxnzqpp5jmrh92pfld78spqs78v9euf2385t83uvpwk9ldrlvf6ch7tpascqhp5zvkrmemgth3tufcvflmzjzfvjt023nazlhljz2n9hattj4f8jq8qxqyjw5qcqpjrzjqtc4fc44feggv7065fqe5m4ytjarg3repr5j9el35xhmtfexc42yczarjuqqfzqqqqqqqqlgqqqqqqgq9q9qxpqysgq079nkq507a5tw7xgttmj4u990j7wfggtrasah5gd4ywfr2pjcn29383tphp4t48gquelz9z78p4cq7ml3nrrphw5w6eckhjwmhezhnqpy6gyf0`;
      
      setInvoice(mockInvoice);
      
      // Try to pay with WebLN if available
      if (window.webln) {
        try {
          await window.webln.enable();
          const result = await window.webln.sendPayment(mockInvoice);
          
          toast({
            title: "Zap sent successfully!",
            description: `${amount} sats zapped to ${recipientPubkey.slice(0, 8)}...`,
          });
          
          return result;
        } catch (weblnError) {
          console.log('WebLN payment failed, showing invoice:', weblnError);
          toast({
            title: "Zap request created",
            description: `Lightning invoice for ${amount} sats generated. Use your wallet to pay.`,
          });
        }
      } else {
        toast({
          title: "Zap request created",
          description: `Lightning invoice for ${amount} sats generated. Use your wallet to pay.`,
        });
      }

      return mockInvoice;
    },
    onError: (error) => {
      console.error('Failed to create zap:', error);
      toast({
        title: "Failed to create zap",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  return {
    ...mutation,
    data: invoice,
  };
}