const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api';
const API_KEY = 'secret';

export type User = {
    id: number;
    name: string;
    avatar_url: string;
};

export type Label = {
    id: number;
    name: string;
    color: string;
};

export type Issue = {
    id: number;
    title: string;
    description: string;
    status: 'Backlog' | 'Todo' | 'InProgress' | 'Done' | 'Canceled';
    priority: 'Low' | 'Med' | 'High' | 'Critical';
    assignee_id?: number;
    assignee?: User;
    order_index: number;
    labels?: Label[];
    created_at: string;
    updated_at: string;
};

const headers = {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
};

export const api = {
    getIssues: async (filters?: Record<string, string | string[] | undefined>) => {
        const params = new URLSearchParams();
        if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== 'undefined') {
                    if (Array.isArray(value)) {
                        value.forEach(v => params.append(key, v));
                    } else {
                        params.append(key, value);
                    }
                }
            });
        }
        const res = await fetch(`${API_URL}/issues?${params}`, { headers });
        if (!res.ok) throw new Error('Failed to fetch issues');
        return res.json() as Promise<Issue[]>;
    },

    createIssue: async (data: Partial<Issue> & { label_ids?: number[] }) => {
        const res = await fetch(`${API_URL}/issues`, {
            method: 'POST',
            headers,
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to create issue');
        return res.json() as Promise<Issue>;
    },

    updateIssue: async (id: number, data: Partial<Issue> & { label_ids?: number[] }) => {
        const res = await fetch(`${API_URL}/issues/${id}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to update issue');
        return res.json() as Promise<Issue>;
    },

    moveIssue: async (id: number, status: string, orderIndex: number) => {
        const res = await fetch(`${API_URL}/issues/${id}/move`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ status, order_index: orderIndex }),
        });
        if (!res.ok) throw new Error('Failed to move issue');
        return res.json();
    },

    deleteIssue: async (id: number) => {
        const res = await fetch(`${API_URL}/issues/${id}`, {
            method: 'DELETE',
            headers,
        });
        if (!res.ok) throw new Error('Failed to delete issue');
    },

    getUsers: async () => {
        const res = await fetch(`${API_URL}/users`, { headers });
        if (!res.ok) throw new Error('Failed to fetch users');
        return res.json() as Promise<User[]>;
    },

    getLabels: async () => {
        const res = await fetch(`${API_URL}/labels`, { headers });
        if (!res.ok) throw new Error('Failed to fetch labels');
        return res.json() as Promise<Label[]>;
    },
};
