import { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageItem } from '@/components/MessageItem';
import { Loader2, ArrowUp } from 'lucide-react';
import type { NostrEvent } from '@nostrify/nostrify';

interface MessageListProps {
  messages: {
    pages: Array<{
      messages: NostrEvent[];
      nextCursor?: number;
    }>;
  } | undefined;
  isLoading: boolean;
  hasNextPage?: boolean;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;
  onZapMessage: (event: NostrEvent) => void;
  onReplyToMessage?: (event: NostrEvent) => void;
  onViewThread?: (event: NostrEvent) => void;
}

export function MessageList({
  messages,
  isLoading,
  hasNextPage,
  fetchNextPage,
  isFetchingNextPage,
  onZapMessage,
  onReplyToMessage,
  onViewThread,
}: MessageListProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const firstPageMessages = messages?.pages?.[0]?.messages;
    if (firstPageMessages && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages?.pages]);

  if (isLoading) {
    return (
      <ScrollArea className="h-full p-4">
        <div className="space-y-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex space-x-3">
              <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="flex items-center space-x-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    );
  }

  const allMessages = messages?.pages?.flatMap(page => page.messages) || [];

  if (allMessages.length === 0) {
    return (
      <ScrollArea className="h-full">
        <div className="flex items-center justify-center h-full text-center p-8">
          <div className="space-y-2">
            <p className="text-muted-foreground">No messages yet</p>
            <p className="text-sm text-muted-foreground">
              Be the first to start the conversation!
            </p>
          </div>
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="h-full" ref={scrollAreaRef}>
      <div className="p-4 space-y-4">
        {/* Load More Button */}
        {hasNextPage && (
          <div className="text-center">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchNextPage}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <ArrowUp className="w-4 h-4 mr-2" />
                  Load older messages
                </>
              )}
            </Button>
          </div>
        )}

        {/* Messages (reversed to show oldest first) */}
        {allMessages.slice().reverse().map((message, index) => (
          <MessageItem
            key={message.id}
            event={message}
            onZap={() => onZapMessage(message)}
            onReply={onReplyToMessage ? () => onReplyToMessage(message) : undefined}
            onViewThread={onViewThread && message.kind === 11 ? () => onViewThread(message) : undefined}
            showDateSeparator={
              index === 0 || 
              new Date(message.created_at * 1000).toDateString() !== 
              new Date(allMessages[allMessages.length - index].created_at * 1000).toDateString()
            }
          />
        ))}

        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}