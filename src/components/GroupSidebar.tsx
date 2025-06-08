import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import { Users } from 'lucide-react';
import type { NostrMetadata } from '@nostrify/nostrify';

interface GroupSidebarProps {
  groupId: string;
  members?: string[];
  isLoading: boolean;
  metadata?: {
    name?: string;
    about?: string;
    picture?: string;
    public?: boolean;
    open?: boolean;
  };
}

function MemberItem({ pubkey }: { pubkey: string }) {
  const author = useAuthor(pubkey);
  const metadata: NostrMetadata | undefined = author.data?.metadata;
  const displayName = metadata?.name ?? genUserName(pubkey);
  const profileImage = metadata?.picture;

  return (
    <div className="flex items-center space-x-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
      <Avatar className="w-6 h-6">
        <AvatarImage src={profileImage} alt={displayName} />
        <AvatarFallback className="text-xs">
          {displayName.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className="text-sm truncate flex-1">{displayName}</span>
    </div>
  );
}

export function GroupSidebar({ groupId, members, isLoading, metadata }: GroupSidebarProps) {
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-5 w-20" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-2">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const memberCount = members?.length || 0;

  return (
    <Card className="h-full flex flex-col">
      {/* Group Info */}
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-base">
          <Users className="w-4 h-4" />
          <span>Members</span>
          <Badge variant="secondary" className="text-xs">
            {memberCount}
          </Badge>
        </CardTitle>
        
        {metadata?.about && (
          <p className="text-sm text-muted-foreground">
            {metadata.about}
          </p>
        )}

        <div className="flex space-x-2">
          <Badge variant={metadata?.public !== false ? "default" : "secondary"} className="text-xs">
            {metadata?.public !== false ? "Public" : "Private"}
          </Badge>
          <Badge variant={metadata?.open !== false ? "outline" : "secondary"} className="text-xs">
            {metadata?.open !== false ? "Open" : "Closed"}
          </Badge>
        </div>
      </CardHeader>

      <Separator />

      {/* Members List */}
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full p-4">
          {memberCount > 0 ? (
            <div className="space-y-1">
              {members?.map((pubkey) => (
                <MemberItem key={pubkey} pubkey={pubkey} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No member list available
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                This group may be unmanaged
              </p>
            </div>
          )}
        </ScrollArea>
      </CardContent>

      {/* Group Actions */}
      <Separator />
      <CardContent className="p-4">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Group ID: <code className="bg-muted px-1 rounded">{groupId}</code>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}