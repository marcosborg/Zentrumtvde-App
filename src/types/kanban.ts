export type KanbanUser = {
  id: number;
  name: string;
  email?: string | null;
};

export type KanbanTaskSummary = {
  id: number;
  title: string;
  description?: string | null;
  priority: string;
  board?: {
    id: number;
    name: string;
  } | null;
  stage?: {
    id: number;
    name: string;
    color?: string | null;
    is_initial: boolean;
    is_final: boolean;
  } | null;
  created_at?: string | null;
  created_at_label?: string | null;
  first_interaction_at?: string | null;
  first_interaction_at_label?: string | null;
  deleted_at?: string | null;
  deleted_at_label?: string | null;
  is_deleted?: boolean;
  assigned_to?: KanbanUser | null;
  email?: string | null;
  phone?: string | null;
  contact_name?: string | null;
  source?: string | null;
  meta?: Record<string, unknown> | null;
};

export type KanbanTaskComment = {
  id: number;
  body: string;
  is_internal: boolean;
  created_at?: string | null;
  created_at_label?: string | null;
  user?: KanbanUser | null;
};

export type KanbanStage = {
  id: number;
  name: string;
  color?: string | null;
  is_initial: boolean;
  is_final: boolean;
  tasks: KanbanTaskSummary[];
};

export type KanbanBoardSummary = {
  id: number;
  name: string;
};

export type KanbanTaskDetail = KanbanTaskSummary & {
  comments: KanbanTaskComment[];
};

export type KanbanBoardPayload = {
  boards: KanbanBoardSummary[];
  board_id: number;
  stages: KanbanStage[];
};

export type KanbanTaskPayload = {
  task: KanbanTaskDetail;
  available_stages: Omit<KanbanStage, 'tasks'>[];
  restore_stages?: Omit<KanbanStage, 'tasks'>[];
  message?: string;
};

export type KanbanContactPayload = {
  task: KanbanTaskDetail;
  message?: string;
};

export type KanbanTaskSearchPayload = {
  query: string;
  results: KanbanTaskSummary[];
};
