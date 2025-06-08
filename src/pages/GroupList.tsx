import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { LoginArea } from '@/components/auth/LoginArea';
import { RelaySelector } from '@/components/RelaySelector';
import { useGroups } from '@/hooks/useGroups';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Hash, Users, Search, MessageCircle } from 'lucide-react';

export default function GroupList() {
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useCurrentUser();
  const { data: groups, isLoading, error } = useGroups();

  const filteredGroups = groups?.filter(group =>
    group.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.about?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.id.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6 max-w-4xl">
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <Skeleton className="h-8 w-48 mx-auto" />
              <Skeleton className="h-4 w-64 mx-auto" />
            </div>
            
            <div className="flex justify-center">
              <Skeleton className="h-10 w-80" />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <Skeleton className="h-10 w-10 rounded-lg" />
                      <div className="space-y-1">
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6 max-w-4xl">
          <div className="text-center space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Nostr Group Chat</h1>
              <p className="text-muted-foreground mt-2">
                Connect with communities on the decentralized web
              </p>
            </div>

            <Card className="border-dashed">
              <CardContent className="py-12 px-8 text-center">
                <div className="max-w-sm mx-auto space-y-6">
                  <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto" />
                  <div>
                    <h3 className="text-lg font-semibold mb-2">No groups found</h3>
                    <p className="text-muted-foreground">
                      Unable to load groups from this relay. Try switching to a different relay.
                    </p>
                  </div>
                  <RelaySelector className="w-full" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Nostr Group Chat</h1>
            <p className="text-muted-foreground">
              Connect with communities on the decentralized web
            </p>
          </div>

          {/* Search */}
          <div className="flex justify-center">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Login Area */}
          {!user && (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <div className="max-w-sm mx-auto space-y-4">
                  <p className="text-muted-foreground">
                    Log in to join groups and participate in conversations
                  </p>
                  <LoginArea className="w-full" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Groups Grid */}
          {filteredGroups.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredGroups.map((group) => (
                <Link key={group.id} to={`/group/${group.id}`}>
                  <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader>
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-lg">
                          <Hash className="w-5 h-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-lg truncate">
                            {group.name || `Group ${group.id}`}
                          </CardTitle>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant={group.public !== false ? "default" : "secondary"} className="text-xs">
                              {group.public !== false ? "Public" : "Private"}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {group.open !== false ? "Open" : "Closed"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {group.about || 'A Nostr group chat community'}
                      </p>
                      {group.memberCount !== undefined && (
                        <div className="flex items-center space-x-1 mt-3 text-xs text-muted-foreground">
                          <Users className="w-3 h-3" />
                          <span>{group.memberCount} members</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-12 px-8 text-center">
                <div className="max-w-sm mx-auto space-y-6">
                  <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto" />
                  <div>
                    <h3 className="text-lg font-semibold mb-2">
                      {searchQuery ? 'No matching groups' : 'No groups found'}
                    </h3>
                    <p className="text-muted-foreground">
                      {searchQuery 
                        ? 'Try adjusting your search terms or browse all groups.'
                        : 'No groups are available on this relay. Try switching relays.'
                      }
                    </p>
                  </div>
                  {!searchQuery && <RelaySelector className="w-full" />}
                  {searchQuery && (
                    <Button variant="outline" onClick={() => setSearchQuery('')}>
                      Clear search
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Relay Selector */}
          <div className="flex justify-center">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">Connected to relay:</p>
              <RelaySelector />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}