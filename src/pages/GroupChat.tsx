import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

import { LoginArea } from '@/components/auth/LoginArea';
import { ChatMessage } from '@/components/ChatMessage';
import { ThreadPost } from '@/components/ThreadPost';
import { CreateThreadDialog } from '@/components/CreateThreadDialog';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useGroupMessages } from '@/hooks/useGroupMessages';
import { useGroupChats } from '@/hooks/useGroupChats';
import { useGroupThreads } from '@/hooks/useGroupThreads';
import { useGroupMetadata } from '@/hooks/useGroupMetadata';
import { useGroupMembers } from '@/hooks/useGroupMembers';
import { useSendMessage } from '@/hooks/useSendMessage';
import { useSendChat } from '@/hooks/useSendChat';
import { MessageList } from '@/components/MessageList';
import { GroupSidebar } from '@/components/GroupSidebar';
import { ZapModal } from '@/components/ZapModal';
import { useAppContext } from '@/hooks/useAppContext';
import { Send, Users, Hash, MessageSquare, FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import * as nip19 from 'nostr-tools/nip19';
import type { NostrEvent } from '@nostrify/nostrify';

export default function GroupChat() {
  const { groupId = '_' } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [showSidebar, setShowSidebar] = useState(false);
  const [zapModalOpen, setZapModalOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<NostrEvent | null>(null);
  const [replyTo, setReplyTo] = useState<NostrEvent | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  
  const { user } = useCurrentUser();
  const { config } = useAppContext();
  const { data: messages, isLoading: messagesLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useGroupMessages(groupId);
  const { data: chats, isLoading: chatsLoading, hasNextPage: hasNextChatPage, fetchNextPage: fetchNextChatPage, isFetchingNextPage: isFetchingNextChatPage } = useGroupChats(groupId);
  const { data: threads, isLoading: threadsLoading, hasNextPage: hasNextThreadPage, fetchNextPage: fetchNextThreadPage, isFetchingNextPage: isFetchingNextThreadPage } = useGroupThreads(groupId);
  const { data: metadata, isLoading: metadataLoading } = useGroupMetadata(groupId);
  const { data: members, isLoading: membersLoading } = useGroupMembers(groupId);
  const { mutate: sendMessage, isPending: sendingMessage } = useSendMessage();
  const { mutate: sendChat, isPending: sendingChat } = useSendChat();

  const handleSendMessage = () => {
    if (!message.trim() || !user) return;
    
    if (activeTab === 'chats') {
      // Send as NIP-C7 chat message (kind 9)
      sendChat({
        groupId,
        content: message.trim(),
        replyTo: replyTo ? {
          eventId: replyTo.id,
          relayUrl: config.relayUrl,
          authorPubkey: replyTo.pubkey,
        } : undefined,
      });
    } else {
      // Send as legacy message (kind 1) for backward compatibility
      sendMessage({
        groupId,
        content: message.trim(),
        messageType: 'legacy',
        replyTo: replyTo ? {
          eventId: replyTo.id,
          relayUrl: config.relayUrl,
          authorPubkey: replyTo.pubkey,
        } : undefined,
      });
    }
    
    setMessage('');
    setReplyTo(null);
  };

  const handleZapMessage = (messageEvent: NostrEvent) => {
    setSelectedMessage(messageEvent);
    setZapModalOpen(true);
  };

  const handleReplyToMessage = (messageEvent: NostrEvent) => {
    setReplyTo(messageEvent);
    setMessage(''); // Clear current message when starting a reply
  };

  const handleViewThread = (threadEvent: NostrEvent) => {
    // Create nevent for the thread
    const nevent = nip19.neventEncode({
      id: threadEvent.id,
      relays: [config.relayUrl],
      author: threadEvent.pubkey,
    });
    navigate(`/thread/${nevent}`);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (metadataLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-4">
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-3">
                <Skeleton className="h-8 w-8 rounded" />
                <div className="space-y-1">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex space-x-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const groupName = metadata?.name || `Group ${groupId}`;
  const groupDescription = metadata?.about || 'A Nostr group chat';
  const isPublic = metadata?.public !== false;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-2rem)]">
          {/* Main Chat Area */}
          <div className="lg:col-span-3">
            <Card className="h-full flex flex-col">
              {/* Header */}
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-lg">
                      <Hash className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{groupName}</CardTitle>
                      <p className="text-sm text-muted-foreground">{groupDescription}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={isPublic ? "default" : "secondary"}>
                      {isPublic ? "Public" : "Private"}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSidebar(!showSidebar)}
                      className="lg:hidden"
                    >
                      <Users className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <Separator />

              {/* Messages */}
              <CardContent className="flex-1 p-0 overflow-hidden">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                  <div className="px-4 pt-4">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="all" className="flex items-center space-x-2">
                        <Hash className="w-4 h-4" />
                        <span>All</span>
                      </TabsTrigger>
                      <TabsTrigger value="chats" className="flex items-center space-x-2">
                        <MessageSquare className="w-4 h-4" />
                        <span>Chats</span>
                      </TabsTrigger>
                      <TabsTrigger value="threads" className="flex items-center space-x-2">
                        <FileText className="w-4 h-4" />
                        <span>Threads</span>
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="all" className="flex-1 mt-0 overflow-hidden">
                    <MessageList
                      messages={messages}
                      isLoading={messagesLoading}
                      hasNextPage={hasNextPage}
                      fetchNextPage={fetchNextPage}
                      isFetchingNextPage={isFetchingNextPage}
                      onZapMessage={handleZapMessage}
                      onReplyToMessage={handleReplyToMessage}
                      onViewThread={handleViewThread}
                    />
                  </TabsContent>

                  <TabsContent value="chats" className="flex-1 mt-0 overflow-hidden">
                    <div className="h-full overflow-y-auto p-4 space-y-4">
                      {chatsLoading ? (
                        <div className="space-y-4">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex space-x-3">
                              <Skeleton className="h-8 w-8 rounded-full" />
                              <div className="space-y-2 flex-1">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-4 w-full" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : chats?.pages.flatMap(page => page.chats).length ? (
                        <>
                          {chats.pages.flatMap(page => page.chats).map((chat) => (
                            <ChatMessage
                              key={chat.id}
                              event={chat}
                              onZap={handleZapMessage}
                              onReply={handleReplyToMessage}
                            />
                          ))}
                          {hasNextChatPage && (
                            <div className="text-center">
                              <Button
                                variant="outline"
                                onClick={() => fetchNextChatPage()}
                                disabled={isFetchingNextChatPage}
                              >
                                {isFetchingNextChatPage ? 'Loading...' : 'Load More'}
                              </Button>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-12">
                          <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                          <p className="text-muted-foreground">No chat messages yet</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="threads" className="flex-1 mt-0 overflow-hidden">
                    <div className="h-full overflow-y-auto p-4 space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">Discussion Threads</h3>
                        <CreateThreadDialog groupId={groupId} />
                      </div>
                      
                      {threadsLoading ? (
                        <div className="space-y-4">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <Card key={i}>
                              <CardHeader>
                                <div className="flex items-center space-x-3">
                                  <Skeleton className="h-8 w-8 rounded-full" />
                                  <div className="space-y-1">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-6 w-48" />
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent>
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-3/4 mt-2" />
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : threads?.pages.flatMap(page => page.threads).length ? (
                        <>
                          {threads.pages.flatMap(page => page.threads).map((thread) => (
                            <ThreadPost
                              key={thread.id}
                              event={thread}
                              onZap={handleZapMessage}
                              onViewThread={handleViewThread}
                            />
                          ))}
                          {hasNextThreadPage && (
                            <div className="text-center">
                              <Button
                                variant="outline"
                                onClick={() => fetchNextThreadPage()}
                                disabled={isFetchingNextThreadPage}
                              >
                                {isFetchingNextThreadPage ? 'Loading...' : 'Load More'}
                              </Button>
                            </div>
                          )}
                        </>
                      ) : (
                        <Card className="border-dashed">
                          <CardContent className="py-12 text-center">
                            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground mb-4">
                              No threads yet. Start a discussion!
                            </p>
                            <CreateThreadDialog groupId={groupId} />
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>

              <Separator />

              {/* Message Input */}
              <CardContent className="p-4">
                {user ? (
                  <div className="space-y-3">
                    {replyTo && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">
                          Replying to {replyTo.pubkey.slice(0, 8)}...
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
                    <div className="flex space-x-2">
                      <Input
                        placeholder={
                          activeTab === 'chats' 
                            ? `Chat in ${groupName}...` 
                            : activeTab === 'threads'
                            ? 'Use "New Thread" button to create threads'
                            : `Message ${groupName}...`
                        }
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={sendingMessage || sendingChat || activeTab === 'threads'}
                        className="flex-1"
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={!message.trim() || sendingMessage || sendingChat || activeTab === 'threads'}
                        size="sm"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                    {activeTab === 'threads' && (
                      <p className="text-xs text-muted-foreground text-center">
                        Use the "New Thread" button above to create discussion threads
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground mb-4">
                      Please log in to participate in the chat
                    </p>
                    <LoginArea className="max-w-60 mx-auto" />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className={`lg:block ${showSidebar ? 'block' : 'hidden'}`}>
            <GroupSidebar
              groupId={groupId}
              members={members}
              isLoading={membersLoading}
              metadata={metadata}
            />
          </div>
        </div>
      </div>

      {/* Zap Modal */}
      <ZapModal
        open={zapModalOpen}
        onOpenChange={setZapModalOpen}
        event={selectedMessage}
      />
    </div>
  );
}