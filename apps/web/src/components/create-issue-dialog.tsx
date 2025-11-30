'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { api, User, Label as LabelType } from '@/lib/api';

interface CreateIssueDialogProps {
    users: User[];
    labels: LabelType[];
    onIssueCreated: () => void;
}

export function CreateIssueDialog({ users, labels, onIssueCreated }: CreateIssueDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState('Backlog');
    const [priority, setPriority] = useState('Low');
    const [assigneeId, setAssigneeId] = useState<string>('unassigned');
    const [selectedLabels, setSelectedLabels] = useState<string[]>([]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.createIssue({
                title,
                description,
                status: status as any,
                priority: priority as any,
                assignee_id: assigneeId === 'unassigned' ? undefined : Number(assigneeId),
                label_ids: selectedLabels.map(Number),
            });
            setOpen(false);
            onIssueCreated();
            // Reset form
            setTitle('');
            setDescription('');
            setStatus('Backlog');
            setPriority('Low');
            setAssigneeId('unassigned');
            setSelectedLabels([]);
        } catch (error) {
            console.error('Failed to create issue:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>Create Issue</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create Issue</DialogTitle>
                    <DialogDescription>
                        Add a new issue to the board.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="title" className="text-right">
                            Title
                        </Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="col-span-3"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="description" className="text-right">
                            Description
                        </Label>
                        <Input
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="status" className="text-right">
                            Status
                        </Label>
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select status" />
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
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="priority" className="text-right">
                            Priority
                        </Label>
                        <Select value={priority} onValueChange={setPriority}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Low">Low</SelectItem>
                                <SelectItem value="Med">Medium</SelectItem>
                                <SelectItem value="High">High</SelectItem>
                                <SelectItem value="Critical">Critical</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="assignee" className="text-right">
                            Assignee
                        </Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    className="col-span-3 justify-between"
                                >
                                    {assigneeId !== 'unassigned'
                                        ? users.find((user) => user.id.toString() === assigneeId)?.name
                                        : "Select assignee..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[200px] p-0">
                                <Command>
                                    <CommandInput placeholder="Search user..." />
                                    <CommandList>
                                        <CommandEmpty>No user found.</CommandEmpty>
                                        <CommandGroup>
                                            <CommandItem
                                                value="unassigned"
                                                onSelect={() => {
                                                    setAssigneeId('unassigned');
                                                }}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        assigneeId === 'unassigned' ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                                Unassigned
                                            </CommandItem>
                                            {users.map((user) => (
                                                <CommandItem
                                                    key={user.id}
                                                    value={user.name}
                                                    onSelect={() => {
                                                        setAssigneeId(user.id.toString());
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            assigneeId === user.id.toString() ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    {user.name}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="labels" className="text-right">
                            Labels
                        </Label>
                        <div className="col-span-3 flex flex-wrap gap-2">
                            <Select onValueChange={(val) => {
                                if (!selectedLabels.includes(val)) {
                                    setSelectedLabels([...selectedLabels, val]);
                                }
                            }}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Add label" />
                                </SelectTrigger>
                                <SelectContent>
                                    {labels.map((label) => (
                                        <SelectItem key={label.id} value={label.id.toString()}>
                                            {label.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <div className="flex flex-wrap gap-1 mt-2">
                                {selectedLabels.map(id => {
                                    const label = labels.find(l => l.id.toString() === id);
                                    return (
                                        <span
                                            key={id}
                                            className="text-xs px-2 py-1 rounded-full bg-secondary cursor-pointer"
                                            onClick={() => setSelectedLabels(selectedLabels.filter(l => l !== id))}
                                        >
                                            {label?.name} &times;
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </form>
                <DialogFooter>
                    <Button type="submit" onClick={handleSubmit} disabled={loading}>
                        {loading ? 'Creating...' : 'Create'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
