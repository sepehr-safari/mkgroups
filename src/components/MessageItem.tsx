import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { NoteContent } from '@/components/NoteContent';
import { useAuthor } from '@/hooks/useAuthor';
import { useZapReceipts } from '@/hooks/useZapReceipts';
import { genUserName } from '@/lib/genUserName';
import { formatDistanceToNow } from 'date-fns';
import { Zap, Reply, MoreHorizontal, MessageSquare, FileText } from 'lucide-react';
import type { NostrEvent, NostrMetadata } from '@nostrify/nostrify';

interface MessageItemProps {
  event: NostrEvent;
  onZap: () => void;
  onReply?: () => void;
  onViewThread?: () => void;
  showDateSeparator?: boolean;
}

export function MessageItem({ event, onZap, onReply, onViewThread, showDateSeparator }: MessageItemProps) {
  const [showActions, setShowActions] = useState(false);
  const author = useAuthor(event.pubkey);
  const { data: zapReceipts } = useZapReceipts(event.id);
  
  const metadata: NostrMetadata | undefined = author.data?.metadata;
  const displayName = metadata?.name ?? genUserName(event.pubkey);
  const profileImage = metadata?.picture;
  const messageDate = new Date(event.created_at * 1000);
  
  // Calculate total zap amount
  const totalZaps = zapReceipts?.reduce((sum, receipt) => {
    const bolt11Tag = receipt.tags.find(([name]) => name === 'bolt11')?.[1];
    if (bolt11Tag) {
      // Extract amount from bolt11 invoice (simplified)
      const match = bolt11Tag.match(/lnbc(\d+)([munp]?)/);
      if (match) {
        const amount = parseInt(match[1]);
        const unit = match[2];
        let sats = amount;
        if (unit === 'm') sats = amount / 1000;
        else if (unit === 'u') sats = amount / 1000000;
        else if (unit === 'n') sats = amount / 1000000000;
        else if (unit === 'p') sats = amount / 1000000000000;
        return sum + sats;
      }
    }
    return sum;
  }, 0) || 0;

  // Check message type and reply status
  const isThread = event.kind === 11;
  const isChat = event.kind === 9;
  const isLegacy = event.kind === 1;
  
  // Check if this is a reply based on message type
  let isReply = false;
  if (isChat) {
    // NIP-C7 chat replies use q tag
    const qTag = event.tags.find(([name]) => name === 'q');
    isReply = !!qTag;
  } else if (isLegacy) {
    // Legacy replies use e tag with reply marker
    const replyTag = event.tags.find(([name, , , marker]) => name === 'e' && marker === 'reply');
    isReply = !!replyTag;
  }
  
  // Get thread title for thread posts
  const threadTitle = isThread ? event.tags.find(([name]) => name === 'title')?.[1] : null;

  return (
    <div className="group">
      {/* Date Separator */}
      {showDateSeparator && (
        <div className="flex items-center my-4">
          <Separator className="flex-1" />
          <Badge variant="outline" className="mx-3 text-xs">
            {messageDate.toLocaleDateString()}
          </Badge>
          <Separator className="flex-1" />
        </div>
      )}

      {/* Message */}
      <div
        className="flex space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {/* Avatar */}
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage src={profileImage} alt={displayName} />
          <AvatarFallback className="text-xs">
            {displayName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        {/* Message Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-semibold text-sm truncate">
              {displayName}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(messageDate, { addSuffix: true })}
            </span>
            
            {/* Message type badges */}
            {isThread && (
              <Badge variant="outline" className="text-xs">
                <FileText className="w-3 h-3 mr-1" />
                Thread
              </Badge>
            )}
            {isChat && (
              <Badge variant="outline" className="text-xs">
                <MessageSquare className="w-3 h-3 mr-1" />
                Chat
              </Badge>
            )}
            {isLegacy && (
              <Badge variant="secondary" className="text-xs">
                Legacy
              </Badge>
            )}
            {isReply && (
              <Badge variant="outline" className="text-xs">
                <Reply className="w-3 h-3 mr-1" />
                Reply
              </Badge>
            )}
          </div>

          {/* Thread Title */}
          {isThread && threadTitle && (
            <div className="font-medium text-base mb-2 cursor-pointer hover:text-primary" onClick={onViewThread}>
              {threadTitle}
            </div>
          )}

          {/* Content */}
          <div className={`text-sm ${isThread ? 'text-muted-foreground' : ''}`}>
            <NoteContent event={event} />
          </div>

          {/* Zap Count */}
          {totalZaps > 0 && (
            <div className="flex items-center space-x-1 mt-2">
              <Zap className="w-3 h-3 text-yellow-500 fill-current" />
              <span className="text-xs text-muted-foreground">
                {Math.round(totalZaps)} sats
              </span>
              <span className="text-xs text-muted-foreground">
                ({zapReceipts?.length} zaps)
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className={`flex items-start space-x-1 transition-opacity ${
          showActions ? 'opacity-100' : 'opacity-0'
        }`}>
          {onReply && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReply}
              className="h-6 w-6 p-0"
              title="Reply"
            >
              <Reply className="w-3 h-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onZap}
            className="h-6 w-6 p-0"
            title="Zap"
          >
            <Zap className="w-3 h-3" />
          </Button>
          {onViewThread && isThread && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onViewThread}
              className="h-6 w-6 p-0"
              title="View Thread"
            >
              <MessageSquare className="w-3 h-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
          >
            <MoreHorizontal className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}