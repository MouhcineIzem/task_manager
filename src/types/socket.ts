import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { UserPayload } from "./index";


export interface ServerToClientEvents {
    // événements envoyés s au client
    'task:created': (data: TaskEventData) => void;
    'task:updated': (data: TaskEventData) => void;
    'task:deleted': (data: { taskId: string; projectId: string }) => void;
    'task:moved': (data: TaskMovedEventData) => void;
    'comment:created': (data: CommentEventData) => void;
    'comment:updated': (data: CommentEventData) => void;
    'comment:deleted': (data: { commentId: string; taskId: string }) => void;
    'member:joined': (data: MemberEventData) => void;
    'member:left': (data: { userId: string; projectId: string }) => void;
    'user-typing': (data: { userId: string; userName: string; taskId: string }) => void;
    'user-online': (data: { userId: string; userName: string }) => void;
    'user:offline': (data: { userId: string }) => void;
}

export interface ClientToServerEvents {
    // Evenements reçus du client
    'project:join': (projectId: string) => void;
    'project:leave': (projectId: string) => void;
    'typing:start': (data: { taskId: string }) => void;
    'typing:stop': (data: { taskId: string }) => void;
}

export interface InterServerEvents {
    ping: () => void;
}

export interface SocketData {
    user: UserPayload;
    currentProject?: string;
}

export interface TaskEventData {
    task: any;
    projectId: string;
    userId: string;
}

export interface TaskMovedEventData {
    taskId: string;
    oldColumnId: string;
    newColumnsId: string;
    newOrder: number;
    projectId: string;
    userId: string;
}

export interface CommentEventData {
    comment: any;
    taskId: string;
    projectId: string;
    userId: string;
}

export interface MemberEventData {
    member: any;
    projectId: string;
}

export type TypedServer = SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
>;

export type TypedSocket = Parameters<
    Parameters<TypedServer['on']>[1]
>[0];

