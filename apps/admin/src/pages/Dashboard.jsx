import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Users, 
  Heart, 
  MessageSquare, 
  Video, 
  TrendingUp, 
  TrendingDown,
  Activity,
  Clock,
  Globe,
  Smartphone
} from 'lucide-react';

// Mock data
const mockStats = {
  totalUsers: 12847,
  activePairings: 8934,
  messagesThisWeek: 45672,
  callsThisWeek: 2341,
  userGrowth: 12.5,
  engagementRate: 87.3,
  avgSessionTime: '24m 32s',
  onlineNow: 1247
};

const mockUsageData = [
  { name: 'Mon', messages: 4000, calls: 240, users: 2400 },
  { name: 'Tue', messages: 3000, calls: 139, users: 2210 },
  { name: 'Wed', messages: 2000, calls: 980, users: 2290 },
  { name: 'Thu', messages: 2780, calls: 390, users: 2000 },
  { name: 'Fri', messages: 1890, calls: 480, users: 2181 },
  { name: 'Sat', messages: 2390, calls: 380, users: 2500 },
  { name: 'Sun', messages: 3490, calls: 430, users: 2100 },
];

const mockUserTypes = [
  { name: 'Students', value: 6423, color: '#8b5cf6' },
  { name: 'Parents', value: 6424, color: '#ec4899' },
];

const mockTopUniversities = [
  { name: 'Stanford University', users: 1247, growth: 15.2 },
  { name: 'MIT', users: 1156, growth: 12.8 },
  { name: 'Harvard University', users: 1089, growth: 18.5 },
  { name: 'UC Berkeley', users: 987, growth: 9.3 },
  { name: 'Yale University', users: 876, growth: 22.1 },
];

export function Dashboard() {
  const [timeRange, setTimeRange] = useState('7d');
  const [isLoading, setIsLoading] = useState(false);

  const StatCard = ({ title, value, change, icon: Icon, trend }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <p className="text-xs text-muted-foreground flex items-center mt-1">
            {trend === 'up' ? (
              <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
            )}
            <span className={trend === 'up' ? 'text-green-500' : 'text-red-500'}>
              {change}%
            </span>
            <span className="ml-1">from last week</span>
          </p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your AWY deployment
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <Activity className="w-3 h-3 mr-1" />
            System Healthy
          </Badge>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={mockStats.totalUsers.toLocaleString()}
          change={mockStats.userGrowth}
          icon={Users}
          trend="up"
        />
        <StatCard
          title="Active Pairings"
          value={mockStats.activePairings.toLocaleString()}
          change={8.2}
          icon={Heart}
          trend="up"
        />
        <StatCard
          title="Messages This Week"
          value={mockStats.messagesThisWeek.toLocaleString()}
          change={15.3}
          icon={MessageSquare}
          trend="up"
        />
        <StatCard
          title="Calls This Week"
          value={mockStats.callsThisWeek.toLocaleString()}
          change={-2.1}
          icon={Video}
          trend="down"
        />
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Usage Trends */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Usage Trends</CardTitle>
            <CardDescription>
              Daily activity across your platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="messages" className="space-y-4">
              <TabsList>
                <TabsTrigger value="messages">Messages</TabsTrigger>
                <TabsTrigger value="calls">Calls</TabsTrigger>
                <TabsTrigger value="users">Active Users</TabsTrigger>
              </TabsList>
              <TabsContent value="messages" className="space-y-4">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={mockUsageData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="messages" 
                      stroke="#8b5cf6" 
                      fill="#8b5cf6" 
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </TabsContent>
              <TabsContent value="calls" className="space-y-4">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={mockUsageData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="calls" fill="#ec4899" />
                  </BarChart>
                </ResponsiveContainer>
              </TabsContent>
              <TabsContent value="users" className="space-y-4">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={mockUsageData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="users" 
                      stroke="#06b6d4" 
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* User Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>User Distribution</CardTitle>
            <CardDescription>
              Students vs Parents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={mockUserTypes}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {mockUserTypes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center space-x-4 mt-4">
              {mockUserTypes.map((type) => (
                <div key={type.name} className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: type.color }}
                  />
                  <span className="text-sm">{type.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Universities */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top Universities</CardTitle>
            <CardDescription>
              Most active institutions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockTopUniversities.map((university, index) => (
                <div key={university.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{university.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {university.users.toLocaleString()} users
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    +{university.growth}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online Now</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {mockStats.onlineNow.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Active users right now
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Session</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.avgSessionTime}</div>
            <p className="text-xs text-muted-foreground">
              Time spent per session
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.engagementRate}%</div>
            <p className="text-xs text-muted-foreground">
              Daily active rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mobile Users</CardTitle>
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">73%</div>
            <p className="text-xs text-muted-foreground">
              Using mobile devices
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

