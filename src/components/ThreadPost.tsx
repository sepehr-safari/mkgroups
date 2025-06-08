import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { NoteContent } from '@/components/NoteContent';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import { MessageSquare, Zap, MoreHorizontal } from 'lucide-react';
import type { NostrEvent, NostrMetadata } from '@nostrify/nostrify';

interface ThreadPostProps {
  event: NostrEvent;
  commentCount?: number;
  onZap?: (event: NostrEvent) => void;
  onViewThread?: (event: NostrEvent) => void;
  className?: string;
}

export function ThreadPost({ event, commentCount = 0, onZap, onViewThread, className }: ThreadPostProps) {
  const [showActions, setShowActions] = useState(false);
  const author = useAuthor(event.pubkey);
  const metadata: NostrMetadata | undefined = author.data?.metadata;

  const displayName = metadata?.display_name || metadata?.name || genUserName(event.pubkey);
  const profileImage = metadata?.picture;
  const timeAgo = formatDistanceToNow(new Date(event.created_at * 1000), { addSuffix: true });

  // Get thread title from tags
  const titleTag = event.tags.find(([name]) => name === 'title')?.[1];
  const title = titleTag || 'Untitled Thread';

  return (
    <Card 
      className={`transition-colors hover:bg-muted/50 cursor-pointer ${className}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onClick={() => onViewThread?.(event)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src={profileImage} alt={displayName} />
              <AvatarFallback className="text-xs">
                {displayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-medium text-sm">{displayName}</span>
                <Badge variant="outline" className="text-xs">
                  Thread
                </Badge>
                <span className="text-xs text-muted-foreground">{timeAgo}</span>
              </div>
            </div>
          </div>
        </div>
        <CardTitle className="text-base mt-2">{title}</CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0">
        {event.content && (
          <div className="text-sm text-muted-foreground mb-3">
            <NoteContent event={event} className="break-words line-clamp-3" />
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
            <div className="flex items-center space-x-1">
              <MessageSquare className="w-3 h-3" />
              <span>{commentCount} {commentCount === 1 ? 'comment' : 'comments'}</span>
            </div>
          </div>
          
          {showActions && (
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onZap?.(event);
                }}
                className="h-7 px-2 text-xs"
              >
                <Zap className="w-3 h-3 mr-1" />
                Zap
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => e.stopPropagation()}
                className="h-7 px-2"
              >
                <MoreHorizontal className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}