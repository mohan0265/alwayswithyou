import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Search, MoreHorizontal, Users, Settings } from 'lucide-react';

const mockOrganizations = [
  {
    id: '1',
    name: 'Stanford University',
    domain: 'stanford.edu',
    users: 1247,
    pairings: 623,
    status: 'active',
    plan: 'enterprise',
    createdAt: '2024-01-15'
  },
  {
    id: '2',
    name: 'MIT',
    domain: 'mit.edu',
    users: 1156,
    pairings: 578,
    status: 'active',
    plan: 'enterprise',
    createdAt: '2024-01-20'
  },
  {
    id: '3',
    name: 'Harvard University',
    domain: 'harvard.edu',
    users: 1089,
    pairings: 544,
    status: 'active',
    plan: 'enterprise',
    createdAt: '2024-02-01'
  }
];

export function Organizations() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOrgs = mockOrganizations.filter(org =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.domain.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
          <p className="text-muted-foreground">
            Manage university organizations and their settings
          </p>
        </div>
        <Button className="bg-gradient-to-r from-pink-500 to-purple-600">
          <Plus className="w-4 h-4 mr-2" />
          Add Organization
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Organizations</CardTitle>
          <CardDescription>
            {filteredOrgs.length} organizations registered
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search organizations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Pairings</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrgs.map((org) => (
                <TableRow key={org.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{org.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Created {new Date(org.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{org.domain}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-1 text-muted-foreground" />
                      {org.users.toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell>{org.pairings.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {org.plan}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={org.status === 'active' ? 'default' : 'secondary'}
                      className={org.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : ''}
                    >
                      {org.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm">
                        <Settings className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

