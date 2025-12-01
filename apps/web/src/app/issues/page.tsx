'use client';

import {
    KanbanBoard,
    KanbanCard,
    KanbanCards,
    KanbanHeader,
    KanbanProvider,
} from '@/components/ui/shadcn-io/kanban';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useEffect, useState } from 'react';
import { api, Issue, User, Label } from '@/lib/api';
import { CreateIssueDialog } from '@/components/create-issue-dialog';
import {
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const columns = [
    { id: 'Backlog', name: 'Backlog', color: '#6B7280' },
    { id: 'Todo', name: 'Todo', color: '#3B82F6' },
    { id: 'InProgress', name: 'In Progress', color: '#F59E0B' },
    { id: 'Done', name: 'Done', color: '#10B981' },
    { id: 'Canceled', name: 'Canceled', color: '#EF4444' },
];

import { arrayMove } from '@dnd-kit/sortable';
import { useRouter, useSearchParams } from 'next/navigation';


import { MultiSelectFilter } from '@/components/multi-select-filter';

import { Suspense } from 'react';

function IssuesBoard() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [issues, setIssues] = useState<Issue[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [labels, setLabels] = useState<Label[]>([]);
    const [loading, setLoading] = useState(true);

    const statusFilter = searchParams.getAll('status');
    const priorityFilter = searchParams.getAll('priority');
    const assigneeFilter = searchParams.getAll('assignee_id');

    const updateFilter = (key: string, values: string[]) => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete(key);
        values.forEach(v => params.append(key, v));
        router.push(`?${params.toString()}`);
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const [fetchedIssues, fetchedUsers, fetchedLabels] = await Promise.all([
                api.getIssues({
                    status: statusFilter.length > 0 ? statusFilter : undefined,
                    priority: priorityFilter.length > 0 ? priorityFilter : undefined,
                    assignee_id: assigneeFilter.length > 0 ? assigneeFilter : undefined,
                }),
                api.getUsers(),
                api.getLabels(),
            ]);
            setIssues(fetchedIssues);
            setUsers(fetchedUsers);
            setLabels(fetchedLabels);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [searchParams]);

    const handleDragEnd = async (event: any) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        const activeIssueIndex = issues.findIndex(i => i.id.toString() === activeId);
        const overIssueIndex = issues.findIndex(i => i.id.toString() === overId);

        if (activeIssueIndex === -1) return;

        let newStatus = issues[activeIssueIndex].status;
        let newOrder = issues[activeIssueIndex].order_index;

        const isColumn = columns.some(col => col.id === overId);
        if (isColumn) {
            newStatus = overId;
            const columnIssues = issues.filter(i => i.status === newStatus && i.id.toString() !== activeId);
            if (columnIssues.length > 0) {
                const lastItem = columnIssues[columnIssues.length - 1];
                newOrder = lastItem.order_index + 1000;
            } else {
                newOrder = 1000;
            }
        } else if (overIssueIndex !== -1) {
            const overIssue = issues[overIssueIndex];
            newStatus = overIssue.status;

            const reorderedIssues = arrayMove(issues, activeIssueIndex, overIssueIndex);
            const movedItem = reorderedIssues[overIssueIndex];

            const columnIssues = reorderedIssues.filter(i => i.status === newStatus);
            const movedItemIndexInColumn = columnIssues.findIndex(i => i.id === movedItem.id);

            const prevItem = columnIssues[movedItemIndexInColumn - 1];
            const nextItem = columnIssues[movedItemIndexInColumn + 1];

            if (!prevItem && !nextItem) {
                newOrder = 1000;
            } else if (!prevItem) {
                newOrder = nextItem.order_index / 2;
            } else if (!nextItem) {
                newOrder = prevItem.order_index + 1000;
            } else {
                newOrder = (prevItem.order_index + nextItem.order_index) / 2;
            }
        }

        if (newStatus !== issues[activeIssueIndex].status || Math.abs(newOrder - issues[activeIssueIndex].order_index) > 0.001) {
            setIssues(prev => prev.map(i => {
                if (i.id.toString() === activeId) {
                    return { ...i, status: newStatus as any, order_index: newOrder };
                }
                return i;
            }));

            try {
                await api.moveIssue(Number(activeId), newStatus, newOrder);
            } catch (error) {
                console.error('Failed to move issue:', error);
                fetchData();
            }
        }
    };

    const kanbanData = issues.map(issue => ({
        ...issue,
        id: issue.id.toString(),
        column: issue.status,
        name: issue.title,
    }));

    if (loading && issues.length === 0) return <div className="p-4">Loading...</div>;

    return (
        <div className="h-full flex flex-col p-4 gap-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-2xl font-bold">Issues</h1>
                <div className="flex flex-wrap gap-2 items-center">
                    <MultiSelectFilter
                        title="Status"
                        options={columns.map(c => ({ label: c.name, value: c.id }))}
                        selectedValues={statusFilter}
                        onChange={(vals) => updateFilter('status', vals)}
                    />
                    <MultiSelectFilter
                        title="Priority"
                        options={['Low', 'Med', 'High', 'Critical'].map(p => ({ label: p, value: p }))}
                        selectedValues={priorityFilter}
                        onChange={(vals) => updateFilter('priority', vals)}
                    />
                    <MultiSelectFilter
                        title="Assignee"
                        options={users.map(u => ({ label: u.name, value: u.id.toString() }))}
                        selectedValues={assigneeFilter}
                        onChange={(vals) => updateFilter('assignee_id', vals)}
                    />

                    <CreateIssueDialog
                        users={users}
                        labels={labels}
                        onIssueCreated={fetchData}
                    />
                </div>
            </div>

            <KanbanProvider
                columns={columns}
                data={kanbanData}
                onDataChange={(newData) => {
                    const updatedIssues = newData.map(item => ({
                        ...issues.find(i => i.id.toString() === item.id)!,
                        status: item.column as any,
                    }));
                    setIssues(updatedIssues);
                }}
                onDragEnd={handleDragEnd}
            >
                {(column) => (
                    <KanbanBoard id={column.id} key={column.id}>
                        <KanbanHeader>
                            <div className="flex items-center gap-2">
                                <div
                                    className="h-2 w-2 rounded-full"
                                    style={{ backgroundColor: column.color }}
                                />
                                <span>{column.name}</span>
                                <span className="text-muted-foreground text-xs ml-auto">
                                    {kanbanData.filter(i => i.column === column.id).length}
                                </span>
                            </div>
                        </KanbanHeader>
                        <KanbanCards id={column.id}>
                            {(item) => {
                                const issue = issues.find(i => i.id.toString() === item.id);
                                if (!issue) return null;
                                return (
                                    <KanbanCard
                                        column={column.id}
                                        id={item.id}
                                        key={item.id}
                                        name={item.name}
                                        className="bg-card hover:ring-2 hover:ring-primary/50 transition-all"
                                    >
                                        <div
                                            className="flex flex-col gap-2 cursor-pointer"
                                            onClick={() => router.push(`/issues/${issue.id}`)}
                                        >
                                            <div className="flex justify-between items-start gap-2">
                                                <span className="font-medium text-sm line-clamp-2">
                                                    {issue.title}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between mt-2">
                                                <div className="flex gap-1 flex-wrap">
                                                    {issue.priority && (
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${issue.priority === 'Critical' ? 'border-red-500 text-red-500' :
                                                            issue.priority === 'High' ? 'border-orange-500 text-orange-500' :
                                                                issue.priority === 'Med' ? 'border-yellow-500 text-yellow-500' :
                                                                    'border-green-500 text-green-500'
                                                            }`}>
                                                            {issue.priority}
                                                        </span>
                                                    )}
                                                    {issue.labels?.map(label => (
                                                        <span
                                                            key={label.id}
                                                            className="text-[10px] px-1.5 py-0.5 rounded-full text-white"
                                                            style={{ backgroundColor: label.color }}
                                                        >
                                                            {label.name}
                                                        </span>
                                                    ))}
                                                </div>
                                                {issue.assignee && (
                                                    <Avatar className="h-5 w-5 shrink-0">
                                                        <AvatarImage src={issue.assignee.avatar_url} />
                                                        <AvatarFallback>
                                                            {issue.assignee.name.slice(0, 2)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                )}
                                            </div>
                                        </div>
                                    </KanbanCard>
                                );
                            }}
                        </KanbanCards>
                        {kanbanData.filter(i => i.column === column.id).length === 0 && (
                            <div className="flex flex-col items-center justify-center p-4 text-muted-foreground text-xs h-24 border-dashed border-2 rounded-md m-2">
                                <span className="opacity-50">No issues</span>
                            </div>
                        )}
                    </KanbanBoard>
                )}
            </KanbanProvider>
        </div>
    );
}

export default function IssuesPage() {
    return (
        <Suspense fallback={<div className="p-4">Loading board...</div>}>
            <IssuesBoard />
        </Suspense>
    );
}
