import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Heart, MessageSquare, Video, Clock } from 'lucide-react';

const mockPairings = [
  {
    id: '1',
    student: { name: 'Alice Johnson', email: 'alice.johnson@stanford.edu' },
    parent: { name: 'Maria Johnson', email: 'maria.johnson@gmail.com' },
    organization: 'Stanford University',
    createdAt: '2024-01-15',
    lastInteraction: '2025-01-08T10:30:00Z',
    messagesThisWeek: 47,
    callsThisWeek: 3,
    status: 'active'
  },
  {
    id: '2',
    student: { name: 'Bob Chen', email: 'bob.chen@mit.edu' },
    parent: { name: 'Linda Chen', email: 'linda.chen@gmail.com' },
    organization: 'MIT',
    createdAt: '2024-02-01',
    lastInteraction: '2025-01-07T16:45:00Z',
    messagesThisWeek: 23,
    callsThisWeek: 1,
    status: 'active'
  }
];

export function Pairings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pairings</h1>
        <p className="text-muted-foreground">
          Student-parent connections and their activity
        </p>
      </div>

      <div className="grid gap-6">
        {mockPairings.map((pairing) => (
          <Card key={pairing.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Heart className="w-5 h-5 text-red-500 fill-current" />
                  <span>Pairing #{pairing.id}</span>
                </CardTitle>
                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  {pairing.status}
                </Badge>
              </div>
              <CardDescription>
                Created {new Date(pairing.createdAt).toLocaleDateString()} • {pairing.organization}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                {/* Student */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">STUDENT</h4>
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                        {pairing.student.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{pairing.student.name}</div>
                      <div className="text-sm text-muted-foreground">{pairing.student.email}</div>
                    </div>
                  </div>
                </div>

                {/* Parent */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">PARENT</h4>
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gradient-to-br from-pink-500 to-purple-600 text-white">
                        {pairing.parent.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{pairing.parent.name}</div>
                      <div className="text-sm text-muted-foreground">{pairing.parent.email}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Activity Stats */}
              <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <MessageSquare className="w-4 h-4 text-blue-500 mr-1" />
                    <span className="text-2xl font-bold">{pairing.messagesThisWeek}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Messages this week</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Video className="w-4 h-4 text-green-500 mr-1" />
                    <span className="text-2xl font-bold">{pairing.callsThisWeek}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Calls this week</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Clock className="w-4 h-4 text-purple-500 mr-1" />
                    <span className="text-2xl font-bold">
                      {Math.floor((Date.now() - new Date(pairing.lastInteraction).getTime()) / (1000 * 60 * 60))}h
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">Last interaction</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

