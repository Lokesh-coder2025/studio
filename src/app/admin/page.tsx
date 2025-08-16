
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck } from 'lucide-react';

// Mock data - in a real app, this would come from your backend
const mockUsers = [
    { id: 'usr_001', name: 'Lokesh D', email: 'lokesh@example.com', institution: 'Seshadripuram College', allotments: 5, lastActive: '2 hours ago' },
    { id: 'usr_002', name: 'Jane Smith', email: 'jane@example.com', institution: 'Global Tech Institute', allotments: 12, lastActive: '1 day ago' },
    { id: 'usr_003', name: 'Admin User', email: 'admin@dutyflow.com', institution: 'DutyFlow HQ', allotments: 0, lastActive: '5 minutes ago' },
];

export default function AdminPage() {
  return (
    <>
        <div className="sticky top-[70px] bg-background/95 backdrop-blur-sm z-30 border-b shadow-sm">
            <div className="flex h-[52px] items-center justify-center">
                <header className="text-center">
                    <div>
                        <h1 className="text-xl font-bold text-primary flex items-center gap-2"><ShieldCheck/> Admin Panel</h1>
                        <p className="text-xs text-muted-foreground mt-1">Manage users and view their activity</p>
                    </div>
                </header>
            </div>
        </div>
        <div className="p-4 sm:p-6 md:p-8">
            <div className="max-w-7xl mx-auto">
                <Card>
                    <CardHeader>
                        <CardTitle>Registered Users</CardTitle>
                        <CardDescription>A list of all users who have signed up for DutyFlow.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User</TableHead>
                                        <TableHead>Institution</TableHead>
                                        <TableHead className="text-center">Allotments Created</TableHead>
                                        <TableHead>Last Active</TableHead>
                                        <TableHead className="text-right">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {mockUsers.map(user => (
                                        <TableRow key={user.id}>
                                            <TableCell>
                                                <div className="font-medium">{user.name}</div>
                                                <div className="text-sm text-muted-foreground">{user.email}</div>
                                            </TableCell>
                                            <TableCell>{user.institution}</TableCell>
                                            <TableCell className="text-center">{user.allotments}</TableCell>
                                            <TableCell>{user.lastActive}</TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant="secondary">Active</Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    </>
  );
}
