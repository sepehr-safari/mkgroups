import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuthor } from '@/hooks/useAuthor';
import { useZapMessage } from '@/hooks/useZapMessage';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { genUserName } from '@/lib/genUserName';
import { Zap, Loader2, ExternalLink } from 'lucide-react';
import type { NostrEvent, NostrMetadata } from '@nostrify/nostrify';

interface ZapModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: NostrEvent | null;
}

const PRESET_AMOUNTS = [21, 100, 500, 1000, 5000];

export function ZapModal({ open, onOpenChange, event }: ZapModalProps) {
  const [amount, setAmount] = useState(21);
  const [comment, setComment] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [useCustomAmount, setUseCustomAmount] = useState(false);
  
  const { user } = useCurrentUser();
  const author = useAuthor(event?.pubkey || '');
  const { mutate: zapMessage, isPending, data: invoice } = useZapMessage();

  const metadata: NostrMetadata | undefined = author.data?.metadata;
  const displayName = metadata?.name ?? genUserName(event?.pubkey || '');
  const profileImage = metadata?.picture;
  const lud16 = metadata?.lud16;
  const lud06 = metadata?.lud06;

  const hasLightningAddress = !!(lud16 || lud06);
  const finalAmount = useCustomAmount ? parseInt(customAmount) || 0 : amount;

  const handleZap = () => {
    if (!event || !user || finalAmount <= 0) return;

    zapMessage({
      event,
      amount: finalAmount,
      comment: comment.trim(),
    });
  };

  const handleAmountSelect = (selectedAmount: number) => {
    setAmount(selectedAmount);
    setUseCustomAmount(false);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    setUseCustomAmount(true);
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset form
    setAmount(21);
    setComment('');
    setCustomAmount('');
    setUseCustomAmount(false);
  };

  if (!event) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            <span>Send Lightning Zap</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recipient */}
          <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
            <Avatar className="w-10 h-10">
              <AvatarImage src={profileImage} alt={displayName} />
              <AvatarFallback>
                {displayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{displayName}</p>
              <p className="text-sm text-muted-foreground truncate">
                {lud16 || lud06 || 'No lightning address'}
              </p>
            </div>
            {hasLightningAddress && (
              <Badge variant="outline" className="text-xs">
                <Zap className="w-3 h-3 mr-1" />
                Zappable
              </Badge>
            )}
          </div>

          {!hasLightningAddress ? (
            <div className="text-center py-6">
              <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                This user hasn't set up a lightning address yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                They need to add a lud16 or lud06 field to their profile
              </p>
            </div>
          ) : !user ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">
                Please log in to send zaps
              </p>
            </div>
          ) : invoice ? (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  Lightning invoice generated
                </p>
                <Badge variant="outline" className="text-xs">
                  {finalAmount} sats
                </Badge>
              </div>
              
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs font-mono break-all">
                  {invoice}
                </p>
              </div>

              <div className="flex space-x-2">
                <Button
                  onClick={() => navigator.clipboard.writeText(invoice)}
                  variant="outline"
                  className="flex-1"
                >
                  Copy Invoice
                </Button>
                {window.webln ? (
                  <Button
                    onClick={async () => {
                      try {
                        await window.webln!.enable();
                        await window.webln!.sendPayment(invoice);
                        handleClose();
                      } catch (error) {
                        console.error('WebLN payment failed:', error);
                      }
                    }}
                    className="flex-1"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Pay with WebLN
                  </Button>
                ) : (
                  <Button
                    onClick={() => window.open(`lightning:${invoice}`, '_blank')}
                    className="flex-1"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Pay
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Amount Selection */}
              <div className="space-y-3">
                <Label>Amount (sats)</Label>
                <div className="grid grid-cols-5 gap-2">
                  {PRESET_AMOUNTS.map((presetAmount) => (
                    <Button
                      key={presetAmount}
                      variant={amount === presetAmount && !useCustomAmount ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleAmountSelect(presetAmount)}
                      className="text-xs"
                    >
                      {presetAmount}
                    </Button>
                  ))}
                </div>
                <Input
                  type="number"
                  placeholder="Custom amount"
                  value={customAmount}
                  onChange={(e) => handleCustomAmountChange(e.target.value)}
                  min="1"
                />
              </div>

              <Separator />

              {/* Comment */}
              <div className="space-y-2">
                <Label>Comment (optional)</Label>
                <Textarea
                  placeholder="Add a comment to your zap..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  maxLength={280}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {comment.length}/280
                </p>
              </div>

              <Separator />

              {/* Summary */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm">Total</span>
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  <span className="font-semibold">{finalAmount} sats</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleZap}
                  disabled={isPending || finalAmount <= 0}
                  className="flex-1"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Zap {finalAmount} sats
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}