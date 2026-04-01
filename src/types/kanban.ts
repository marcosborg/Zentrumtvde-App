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
  created_at?: string | null;
  created_at_label?: string | null;
  first_interaction_at?: string | null;
  first_interaction_at_label?: string | null;
  assigned_to?: KanbanUser | null;
  email?: string | null;
  phone?: string | null;
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
  stage?: Omit<KanbanStage, 'tasks'> | null;
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
  message?: string;
};
