'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { api, Issue, User, Label as LabelType } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function IssueDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const [id, setId] = useState<string | null>(null);
    const [issue, setIssue] = useState<Issue | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [labels, setLabels] = useState<LabelType[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState('');
    const [priority, setPriority] = useState('');
    const [assigneeId, setAssigneeId] = useState<string>('unassigned');
    const [selectedLabels, setSelectedLabels] = useState<string[]>([]);

    useEffect(() => {
        params.then(p => setId(p.id));
    }, [params]);

    useEffect(() => {
        if (!id) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const [fetchedIssue, fetchedUsers, fetchedLabels] = await Promise.all([
                    fetch(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api' + `/issues/${id}`, { headers: { 'X-API-Key': 'secret' } }).then(res => res.json()),
                    api.getUsers(),
                    api.getLabels(),
                ]);

                if (fetchedIssue) {
                    setIssue(fetchedIssue);
                    setTitle(fetchedIssue.title);
                    setDescription(fetchedIssue.description || '');
                    setStatus(fetchedIssue.status);
                    setPriority(fetchedIssue.priority);
                    setAssigneeId(fetchedIssue.assignee_id ? fetchedIssue.assignee_id.toString() : 'unassigned');
                    setSelectedLabels(fetchedIssue.labels?.map((l: any) => l.id.toString()) || []);
                }
                setUsers(fetchedUsers);
                setLabels(fetchedLabels);
            } catch (error) {
                console.error('Failed to fetch issue details:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const handleSave = async () => {
        if (!id) return;
        setSaving(true);
        try {
            await api.updateIssue(Number(id), {
                title,
                description,
                status: status as any,
                priority: priority as any,
                assignee_id: assigneeId === 'unassigned' ? undefined : Number(assigneeId),
                label_ids: selectedLabels.map(Number),
            });
            router.push('/issues');
        } catch (error) {
            console.error('Failed to update issue:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!id) return;

        try {
            await api.deleteIssue(Number(id));
            router.push('/issues');
        } catch (error) {
            console.error('Failed to delete issue:', error);
        }
    };

    if (loading) return <div className="p-4">Loading...</div>;
    if (!issue) return <div className="p-4">Issue not found</div>;

    return (
        <div className="max-w-2xl mx-auto p-4">
            <div className="flex justify-between items-center mb-6">
                <Button variant="outline" onClick={() => router.push('/issues')}>
                    &larr; Back to Board
                </Button>
                <div className="flex gap-2">
                    <Button variant="destructive" onClick={handleDelete}>
                        Delete
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </div>

            <div className="grid gap-6">
                <div className="grid gap-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="text-lg font-semibold"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="status">Status</Label>
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Backlog">Backlog</SelectItem>
                                <SelectItem value="Todo">Todo</SelectItem>
                                <SelectItem value="InProgress">In Progress</SelectItem>
                                <SelectItem value="Done">Done</SelectItem>
                                <SelectItem value="Canceled">Canceled</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="priority">Priority</Label>
                        <Select value={priority} onValueChange={setPriority}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Low">Low</SelectItem>
                                <SelectItem value="Med">Medium</SelectItem>
                                <SelectItem value="High">High</SelectItem>
                                <SelectItem value="Critical">Critical</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="assignee">Assignee</Label>
                    <Select value={assigneeId} onValueChange={setAssigneeId}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {users.map((user) => (
                                <SelectItem key={user.id} value={user.id.toString()}>
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-5 w-5">
                                            <AvatarImage src={user.avatar_url} />
                                            <AvatarFallback>{user.name.slice(0, 2)}</AvatarFallback>
                                        </Avatar>
                                        {user.name}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid gap-2">
                    <Label>Labels</Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {selectedLabels.map(id => {
                            const label = labels.find(l => l.id.toString() === id);
                            return (
                                <span
                                    key={id}
                                    className="text-xs px-2 py-1 rounded-full bg-secondary flex items-center gap-1"
                                >
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: label?.color }}></span>
                                    {label?.name}
                                    <button
                                        className="ml-1 text-muted-foreground hover:text-foreground"
                                        onClick={() => setSelectedLabels(selectedLabels.filter(l => l !== id))}
                                    >
                                        &times;
                                    </button>
                                </span>
                            );
                        })}
                    </div>
                    <Select onValueChange={(val) => {
                        if (!selectedLabels.includes(val)) {
                            setSelectedLabels([...selectedLabels, val]);
                        }
                    }}>
                        <SelectTrigger>
                            <SelectValue placeholder="Add label..." />
                        </SelectTrigger>
                        <SelectContent>
                            {labels.map((label) => (
                                <SelectItem key={label.id} value={label.id.toString()}>
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: label.color }}></span>
                                        {label.name}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="min-h-[150px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    />
                </div>
            </div>
        </div>
    );
}
