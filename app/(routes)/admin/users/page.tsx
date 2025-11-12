'use client';

import React, { useState } from 'react';
import { PluginProvider } from '@/hooks/use-plugin';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Download,
  Edit,
  Trash2,
  Shield,
  Mail,
  CheckCircle,
  XCircle,
  Clock,
  MoreHorizontal,
  Key,
  Eye,
  EyeOff,
  RefreshCw
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function UsersContent() {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Mock user data
  const mockUsers = [
    {
      id: '1',
      name: 'John Smith',
      email: 'john.smith@example.com',
      role: 'admin',
      status: 'active',
      avatar: '/avatars/admin1.jpg',
      lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      twoFactorEnabled: true,
      permissions: ['read', 'write', 'delete', 'admin'],
      loginCount: 234,
      emailVerified: true
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      email: 'sarah.j@example.com',
      role: 'manager',
      status: 'active',
      avatar: '/avatars/manager1.jpg',
      lastLogin: new Date(Date.now() - 6 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
      twoFactorEnabled: true,
      permissions: ['read', 'write', 'delete'],
      loginCount: 156,
      emailVerified: true
    },
    {
      id: '3',
      name: 'Mike Davis',
      email: 'mike.d@example.com',
      role: 'staff',
      status: 'active',
      avatar: '/avatars/staff1.jpg',
      lastLogin: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      twoFactorEnabled: false,
      permissions: ['read', 'write'],
      loginCount: 89,
      emailVerified: true
    },
    {
      id: '4',
      name: 'Emily Wilson',
      email: 'emily.w@example.com',
      role: 'staff',
      status: 'inactive',
      avatar: '/avatars/staff2.jpg',
      lastLogin: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      twoFactorEnabled: false,
      permissions: ['read'],
      loginCount: 45,
      emailVerified: false
    },
    {
      id: '5',
      name: 'Alex Thompson',
      email: 'alex.t@example.com',
      role: 'viewer',
      status: 'pending',
      avatar: '/avatars/viewer1.jpg',
      lastLogin: null,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      twoFactorEnabled: false,
      permissions: ['read'],
      loginCount: 0,
      emailVerified: false
    }
  ];

  const mockUserStats = {
    totalUsers: mockUsers.length,
    activeUsers: mockUsers.filter(u => u.status === 'active').length,
    adminUsers: mockUsers.filter(u => u.role === 'admin').length,
    managerUsers: mockUsers.filter(u => u.role === 'manager').length,
    staffUsers: mockUsers.filter(u => u.role === 'staff').length,
    pendingUsers: mockUsers.filter(u => u.status === 'pending').length,
    twoFactorEnabled: mockUsers.filter(u => u.twoFactorEnabled).length
  };

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'staff',
    permissions: ['read'],
    sendInvite: true
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-red-100 text-red-800">Admin</Badge>;
      case 'manager':
        return <Badge className="bg-blue-100 text-blue-800">Manager</Badge>;
      case 'staff':
        return <Badge className="bg-green-100 text-green-800">Staff</Badge>;
      case 'viewer':
        return <Badge className="bg-gray-100 text-gray-800">Viewer</Badge>;
      default:
        return <Badge variant="secondary">{role}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'suspended':
        return <Badge variant="destructive">Suspended</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPermissionsBadges = (permissions: string[]) => {
    return permissions.map(permission => (
      <Badge key={permission} variant="outline" className="text-xs">
        {permission}
      </Badge>
    ));
  };

  const handleCreateUser = () => {
    console.log('Creating user:', newUser);
    // Reset form
    setNewUser({
      name: '',
      email: '',
      role: 'staff',
      permissions: ['read'],
      sendInvite: true
    });
    setShowCreateUser(false);
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user);
  };

  const handleDeleteUser = (userId: string) => {
    console.log('Deleting user:', userId);
  };

  const handleToggleStatus = (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    console.log('Toggling user status:', userId, newStatus);
  };

  const handleResendInvite = (user: any) => {
    console.log('Resending invite to:', user.email);
  };

  const handleResetPassword = (user: any) => {
    console.log('Resetting password for:', user.email);
  };

  const filteredUsers = mockUsers.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage users, roles, and permissions</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Users
          </Button>
          <Button onClick={() => setShowCreateUser(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* User Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockUserStats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {mockUserStats.activeUsers} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admin Users</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockUserStats.adminUsers}</div>
            <p className="text-xs text-muted-foreground">
              {mockUserStats.managerUsers} managers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Staff Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockUserStats.staffUsers}</div>
            <p className="text-xs text-muted-foreground">
              {mockUserStats.pendingUsers} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">2FA Enabled</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockUserStats.twoFactorEnabled}</div>
            <p className="text-xs text-muted-foreground">
              {((mockUserStats.twoFactorEnabled / mockUserStats.totalUsers) * 100).toFixed(1)}% adoption
            </p>
          </CardContent>
        </Card>
      </div>

      {/* User Management Tabs */}
      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          {/* Create User Modal */}
          {showCreateUser && (
            <Card>
              <CardHeader>
                <CardTitle>Create New User</CardTitle>
                <CardDescription>
                  Add a new user to the system
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="userName">Name</Label>
                    <Input
                      id="userName"
                      value={newUser.name}
                      onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter user name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="userEmail">Email</Label>
                    <Input
                      id="userEmail"
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter email address"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="userRole">Role</Label>
                    <Select value={newUser.role} onValueChange={(value) => setNewUser(prev => ({ ...prev, role: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="userPermissions">Default Permissions</Label>
                    <Select value={newUser.permissions[0]} onValueChange={(value) => setNewUser(prev => ({ ...prev, permissions: [value] }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="read">Read Only</SelectItem>
                        <SelectItem value="write">Read & Write</SelectItem>
                        <SelectItem value="delete">Full Access</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="sendInvite"
                    checked={newUser.sendInvite}
                    onCheckedChange={(checked) => setNewUser(prev => ({ ...prev, sendInvite: checked }))}
                  />
                  <Label htmlFor="sendInvite">Send invitation email</Label>
                </div>
                <div className="flex items-center space-x-3">
                  <Button onClick={handleCreateUser}>Create User</Button>
                  <Button variant="outline" onClick={() => setShowCreateUser(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* User List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>User List</CardTitle>
                  <CardDescription>
                    Manage system users and their access
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      type="text"
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="all">All Roles</option>
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="staff">Staff</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>2FA</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarImage src={user.avatar} alt={user.name} />
                            <AvatarFallback>
                              {user.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-gray-500 flex items-center space-x-1">
                              <Mail className="w-3 h-3" />
                              <span>{user.email}</span>
                              {user.emailVerified && <CheckCircle className="w-3 h-3 text-green-500" />}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getRoleBadge(user.role)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(user.status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {getPermissionsBadges(user.permissions)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {user.lastLogin ? (
                            <>
                              <div>{user.lastLogin.toLocaleDateString()}</div>
                              <div className="text-gray-500">{user.lastLogin.toLocaleTimeString()}</div>
                            </>
                          ) : (
                            <span className="text-gray-500">Never</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.twoFactorEnabled ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-gray-400" />
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditUser(user)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit User
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleStatus(user.id, user.status)}>
                              {user.status === 'active' ? (
                                <>
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleResetPassword(user)}>
                              <Key className="mr-2 h-4 w-4" />
                              Reset Password
                            </DropdownMenuItem>
                            {user.status === 'pending' && (
                              <DropdownMenuItem onClick={() => handleResendInvite(user)}>
                                <Mail className="mr-2 h-4 w-4" />
                                Resend Invite
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Role Definitions</CardTitle>
                <CardDescription>
                  Predefined roles and their default permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { role: 'Admin', description: 'Full system access', permissions: ['Read', 'Write', 'Delete', 'User Management', 'System Settings'] },
                    { role: 'Manager', description: 'Manage business operations', permissions: ['Read', 'Write', 'Delete', 'Reports', 'Team Management'] },
                    { role: 'Staff', description: 'Day-to-day operations', permissions: ['Read', 'Write', 'Limited Delete'] },
                    { role: 'Viewer', description: 'Read-only access', permissions: ['Read Only'] }
                  ].map((roleDef) => (
                    <div key={roleDef.role} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">{roleDef.role}</h3>
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{roleDef.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {roleDef.permissions.map((permission) => (
                          <Badge key={permission} variant="outline" className="text-xs">
                            {permission}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Permission Matrix</CardTitle>
                <CardDescription>
                  Detailed permission breakdown by role
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Feature</TableHead>
                      <TableHead>Admin</TableHead>
                      <TableHead>Manager</TableHead>
                      <TableHead>Staff</TableHead>
                      <TableHead>Viewer</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { feature: 'Dashboard Access', admin: true, manager: true, staff: true, viewer: true },
                      { feature: 'User Management', admin: true, manager: false, staff: false, viewer: false },
                      { feature: 'Product Management', admin: true, manager: true, staff: true, viewer: false },
                      { feature: 'Order Processing', admin: true, manager: true, staff: true, viewer: false },
                      { feature: 'Analytics Reports', admin: true, manager: true, staff: false, viewer: false },
                      { feature: 'System Settings', admin: true, manager: false, staff: false, viewer: false },
                      { feature: 'Financial Data', admin: true, manager: true, staff: false, viewer: false },
                      { feature: 'Customer Data', admin: true, manager: true, staff: true, viewer: true }
                    ].map((row, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{row.feature}</TableCell>
                        <TableCell>
                          {row.admin ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-gray-300" />}
                        </TableCell>
                        <TableCell>
                          {row.manager ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-gray-300" />}
                        </TableCell>
                        <TableCell>
                          {row.staff ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-gray-300" />}
                        </TableCell>
                        <TableCell>
                          {row.viewer ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-gray-300" />}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Activity Log</CardTitle>
              <CardDescription>
                Recent user activities and system events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { user: 'John Smith', action: 'Logged in', time: new Date(Date.now() - 30 * 60 * 1000), ip: '192.168.1.1' },
                  { user: 'Sarah Johnson', action: 'Created new user', time: new Date(Date.now() - 2 * 60 * 60 * 1000), ip: '192.168.1.2' },
                  { user: 'Mike Davis', action: 'Updated product', time: new Date(Date.now() - 4 * 60 * 60 * 1000), ip: '192.168.1.3' },
                  { user: 'Emily Wilson', action: 'Failed login attempt', time: new Date(Date.now() - 6 * 60 * 60 * 1000), ip: '192.168.1.4' },
                  { user: 'System', action: 'Backup completed', time: new Date(Date.now() - 8 * 60 * 60 * 1000), ip: 'System' }
                ].map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback>
                          {activity.user.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{activity.user}</div>
                        <div className="text-sm text-gray-500">{activity.action}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">{activity.time.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">IP: {activity.ip}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function UsersPage() {
  return (
    <PluginProvider>
      <UsersContent />
    </PluginProvider>
  );
}