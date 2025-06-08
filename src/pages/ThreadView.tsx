import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { LoginArea } from '@/components/auth/LoginArea';
import { ThreadComment } from '@/components/ThreadComment';
import { NoteContent } from '@/components/NoteContent';
import { ZapModal } from '@/components/ZapModal';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useThreadComments } from '@/hooks/useThreadComments';
import { useSendThreadComment } from '@/hooks/useSendThreadComment';
import { useAuthor } from '@/hooks/useAuthor';
import { useAppContext } from '@/hooks/useAppContext';
import { genUserName } from '@/lib/genUserName';
import { formatDistanceToNow } from 'date-fns';
import { ArrowLeft, Send, MessageSquare, Zap } from 'lucide-react';
import * as nip19 from 'nostr-tools/nip19';
import type { NostrEvent, NostrMetadata } from '@nostrify/nostrify';

export default function ThreadView() {
  const { nip19Id } = useParams<{ nip19Id: string }>();
  const navigate = useNavigate();
  const [comment, setComment] = useState('');
  const [replyTo, setReplyTo] = useState<NostrEvent | null>(null);
  const [zapModalOpen, setZapModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<NostrEvent | null>(null);
  
  const { user, metadata: userMetadata } = useCurrentUser();
  const { config } = useAppContext();
  const { mutate: sendComment, isPending: sendingComment } = useSendThreadComment();

  // Decode the NIP-19 identifier
  let threadEvent: NostrEvent | null = null;
  let groupId = '';
  
  try {
    if (nip19Id) {
      const decoded = nip19.decode(nip19Id);
      if (decoded.type === 'nevent') {
        // For now, we'll need to fetch the event to get the thread details
        // This is a simplified implementation
        console.log('Thread event ID:', decoded.data.id);
      }
    }
  } catch (error) {
    console.error('Failed to decode NIP-19 identifier:', error);
  }

  // For demo purposes, let's assume we have the thread event and group ID
  const mockThreadEvent: NostrEvent = {
    id: 'mock-thread-id',
    pubkey: 'mock-pubkey',
    created_at: Math.floor(Date.now() / 1000) - 3600,
    kind: 11,
    tags: [
      ['h', 'pizza-lovers'],
      ['title', 'What\'s your favorite pizza topping?'],
    ],
    content: 'I\'m curious to know what everyone\'s favorite pizza topping is. Let\'s discuss!',
    sig: 'mock-sig',
  };

  threadEvent = mockThreadEvent;
  groupId = 'pizza-lovers';

  const author = useAuthor(threadEvent.pubkey);
  const metadata: NostrMetadata | undefined = author.data?.metadata;
  const { data: commentsData, isLoading: commentsLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useThreadComments(threadEvent.id, groupId);

  const displayName = metadata?.display_name || metadata?.name || genUserName(threadEvent.pubkey);
  const profileImage = metadata?.picture;
  const timeAgo = formatDistanceToNow(new Date(threadEvent.created_at * 1000), { addSuffix: true });
  const title = threadEvent.tags.find(([name]) => name === 'title')?.[1] || 'Untitled Thread';

  const allComments = commentsData?.pages.flatMap(page => page.comments) || [];

  const handleSendComment = () => {
    if (!comment.trim() || !user) return;
    
    sendComment({
      groupId,
      threadId: threadEvent.id,
      threadAuthorPubkey: threadEvent.pubkey,
      relayUrl: config.relayUrl,
      content: comment.trim(),
      replyTo: replyTo ? {
        eventId: replyTo.id,
        authorPubkey: replyTo.pubkey,
        kind: replyTo.kind,
      } : undefined,
    });
    
    setComment('');
    setReplyTo(null);
  };

  const handleReply = (event: NostrEvent) => {
    setReplyTo(event);
    setComment(`@${genUserName(event.pubkey)} `);
  };

  const handleZap = (event: NostrEvent) => {
    setSelectedEvent(event);
    setZapModalOpen(true);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSendComment();
    }
  };

  if (!threadEvent) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-4">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Thread not found</p>
            <Button onClick={() => navigate(-1)} className="mt-4">
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 max-w-4xl">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Badge variant="outline">
            Group: {groupId}
          </Badge>
        </div>

        {/* Thread Post */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={profileImage} alt={displayName} />
                  <AvatarFallback>
                    {displayName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{displayName}</span>
                    <Badge variant="outline" className="text-xs">
                      Thread
                    </Badge>
                    <span className="text-sm text-muted-foreground">{timeAgo}</span>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleZap(threadEvent)}
              >
                <Zap className="w-4 h-4 mr-2" />
                Zap
              </Button>
            </div>
            <CardTitle className="text-xl mt-4">{title}</CardTitle>
          </CardHeader>
          
          {threadEvent.content && (
            <CardContent>
              <div className="text-sm">
                <NoteContent event={threadEvent} className="break-words" />
              </div>
            </CardContent>
          )}
        </Card>

        <Separator className="mb-6" />

        {/* Comments Section */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5" />
            <h3 className="text-lg font-semibold">
              {allComments.length} {allComments.length === 1 ? 'Comment' : 'Comments'}
            </h3>
          </div>

          {/* Comment Input */}
          {user ? (
            <Card>
              <CardContent className="p-4">
                {replyTo && (
                  <div className="mb-3 p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">
                      Replying to {genUserName(replyTo.pubkey)}
                    </p>
                    <p className="text-sm line-clamp-2">{replyTo.content}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setReplyTo(null)}
                      className="mt-2 h-6 px-2 text-xs"
                    >
                      Cancel Reply
                    </Button>
                  </div>
                )}
                <div className="flex space-x-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={userMetadata?.picture} alt={userMetadata?.name || 'You'} />
                    <AvatarFallback>
                      {(userMetadata?.name || 'You').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-3">
                    <Textarea
                      placeholder="Write a comment..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={sendingComment}
                      rows={3}
                    />
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-muted-foreground">
                        Press Ctrl+Enter to send
                      </p>
                      <Button
                        onClick={handleSendComment}
                        disabled={!comment.trim() || sendingComment}
                        size="sm"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {sendingComment ? 'Sending...' : 'Comment'}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground mb-4">
                  Please log in to comment on this thread
                </p>
                <LoginArea className="max-w-60 mx-auto" />
              </CardContent>
            </Card>
          )}

          {/* Comments List */}
          {commentsLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex space-x-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : allComments.length > 0 ? (
            <div className="space-y-4">
              {allComments.map((commentEvent) => (
                <ThreadComment
                  key={commentEvent.id}
                  event={commentEvent}
                  onZap={handleZap}
                  onReply={handleReply}
                />
              ))}
              
              {hasNextPage && (
                <div className="text-center">
                  <Button
                    variant="outline"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage ? 'Loading...' : 'Load More Comments'}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No comments yet. Be the first to comment!
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Zap Modal */}
      <ZapModal
        open={zapModalOpen}
        onOpenChange={setZapModalOpen}
        event={selectedEvent}
      />
    </div>
  );
}