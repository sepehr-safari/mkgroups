import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { NoteContent } from '@/components/NoteContent';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import { Zap, Reply, MoreHorizontal } from 'lucide-react';
import type { NostrEvent, NostrMetadata } from '@nostrify/nostrify';

interface ChatMessageProps {
  event: NostrEvent;
  onZap?: (event: NostrEvent) => void;
  onReply?: (event: NostrEvent) => void;
  className?: string;
}

export function ChatMessage({ event, onZap, onReply, className }: ChatMessageProps) {
  const [showActions, setShowActions] = useState(false);
  const author = useAuthor(event.pubkey);
  const metadata: NostrMetadata | undefined = author.data?.metadata;

  const displayName = metadata?.display_name || metadata?.name || genUserName(event.pubkey);
  const profileImage = metadata?.picture;
  const timeAgo = formatDistanceToNow(new Date(event.created_at * 1000), { addSuffix: true });

  // Check if this is a reply (has q tag)
  const qTag = event.tags.find(([name]) => name === 'q');
  const isReply = !!qTag;

  return (
    <Card 
      className={`transition-colors hover:bg-muted/50 ${className}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <CardContent className="p-4">
        <div className="flex space-x-3">
          <Avatar className="w-8 h-8">
            <AvatarImage src={profileImage} alt={displayName} />
            <AvatarFallback className="text-xs">
              {displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <span className="font-medium text-sm">{displayName}</span>
              <Badge variant="outline" className="text-xs">
                Chat
              </Badge>
              {isReply && (
                <Badge variant="secondary" className="text-xs">
                  Reply
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">{timeAgo}</span>
            </div>
            
            <div className="text-sm">
              <NoteContent event={event} className="break-words" />
            </div>
            
            {showActions && (
              <div className="flex items-center space-x-1 mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onReply?.(event)}
                  className="h-7 px-2 text-xs"
                >
                  <Reply className="w-3 h-3 mr-1" />
                  Reply
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onZap?.(event)}
                  className="h-7 px-2 text-xs"
                >
                  <Zap className="w-3 h-3 mr-1" />
                  Zap
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                >
                  <MoreHorizontal className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}