import {
  IonButton,
  IonCard,
  IonCardContent,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonModal,
  IonNote,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonText,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import {
  call,
  close,
  documentText,
  logOutOutline,
  mail,
  personCircle,
  refresh,
  swapHorizontal,
} from 'ionicons/icons';
import { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  addKanbanTaskComment,
  fetchKanbanBoard,
  fetchKanbanTask,
  moveKanbanTask,
} from '../lib/frontpage-api';
import type { KanbanBoardPayload, KanbanTaskDetail } from '../types/kanban';
import './ReservedArea.css';

const ReservedArea: React.FC = () => {
  const history = useHistory();
  const { logout, user, token } = useAuth();
  const [boardData, setBoardData] = useState<KanbanBoardPayload | null>(null);
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(null);
  const [isLoadingBoard, setIsLoadingBoard] = useState(true);
  const [boardError, setBoardError] = useState('');

  const [activeTask, setActiveTask] = useState<KanbanTaskDetail | null>(null);
  const [availableStages, setAvailableStages] = useState<KanbanBoardPayload['stages'][number][]>([]);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isLoadingTask, setIsLoadingTask] = useState(false);
  const [taskError, setTaskError] = useState('');
  const [commentBody, setCommentBody] = useState('');
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false);
  const [isMoveSubmitting, setIsMoveSubmitting] = useState<number | null>(null);

  const loadBoard = async (boardId?: number) => {
    if (!token) {
      setBoardError('Sessao invalida.');
      setIsLoadingBoard(false);
      return;
    }

    setIsLoadingBoard(true);
    setBoardError('');

    try {
      const data = await fetchKanbanBoard(token, boardId);
      setBoardData(data);
      setSelectedBoardId(data.board_id);
    } catch (error) {
      setBoardError(error instanceof Error ? error.message : 'Nao foi possivel carregar o kanban.');
    } finally {
      setIsLoadingBoard(false);
    }
  };

  useEffect(() => {
    void loadBoard();
  }, [token]);

  const openTask = async (taskId: number) => {
    if (!token) {
      return;
    }

    setIsTaskModalOpen(true);
    setIsLoadingTask(true);
    setTaskError('');

    try {
      const payload = await fetchKanbanTask(token, taskId);
      setActiveTask(payload.task);
      setAvailableStages(payload.available_stages.map((stage) => ({ ...stage, tasks: [] })));
      setCommentBody('');
    } catch (error) {
      setTaskError(error instanceof Error ? error.message : 'Nao foi possivel carregar a tarefa.');
    } finally {
      setIsLoadingTask(false);
    }
  };

  const closeTaskModal = () => {
    setIsTaskModalOpen(false);
    setIsLoadingTask(false);
    setTaskError('');
    setCommentBody('');
    setActiveTask(null);
    setAvailableStages([]);
  };

  const handleBoardChange = async (value: number) => {
    setSelectedBoardId(value);
    await loadBoard(value);
  };

  const handleAddComment = async () => {
    if (!token || !activeTask || commentBody.trim() === '' || isCommentSubmitting) {
      return;
    }

    setIsCommentSubmitting(true);
    setTaskError('');

    try {
      const payload = await addKanbanTaskComment(token, activeTask.id, commentBody.trim(), true);
      setActiveTask(payload.task);
      setCommentBody('');
      await loadBoard(selectedBoardId ?? undefined);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : ((error as { errors?: Record<string, string[]>; message?: string } | null)?.errors?.body?.[0] ??
            (error as { message?: string } | null)?.message ??
            'Nao foi possivel guardar a observacao.');
      setTaskError(message);
    } finally {
      setIsCommentSubmitting(false);
    }
  };

  const handleMoveTask = async (stageId: number) => {
    if (!token || !activeTask || isMoveSubmitting) {
      return;
    }

    setIsMoveSubmitting(stageId);
    setTaskError('');

    try {
      const payload = await moveKanbanTask(token, activeTask.id, stageId);
      setActiveTask(payload.task);
      setAvailableStages((current) => current.filter((stage) => stage.id !== stageId).concat(
        activeTask.stage
          ? [{
              ...activeTask.stage,
              tasks: [],
            }]
          : [],
      ));
      await loadBoard(selectedBoardId ?? undefined);
      const refreshed = await fetchKanbanTask(token, activeTask.id);
      setActiveTask(refreshed.task);
      setAvailableStages(refreshed.available_stages.map((stage) => ({ ...stage, tasks: [] })));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : ((error as { errors?: Record<string, string[]>; message?: string } | null)?.errors?.stage_id?.[0] ??
            (error as { message?: string } | null)?.message ??
            'Nao foi possivel mover a tarefa.');
      setTaskError(message);
    } finally {
      setIsMoveSubmitting(null);
    }
  };

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar className="zt-toolbar">
          <IonTitle>Area reservada</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="zt-reserved-page">
        <div className="zt-ops-shell">
          <div className="zt-ops-topbar">
            <div>
              <img src="/assets/logo.svg" alt="Zentrum TVDE" className="zt-ops-logo" />
              <p className="zt-ops-subtitle">Kanban operacional mobile</p>
            </div>
            <div className="zt-ops-actions">
              <IonButton fill="clear" onClick={() => void loadBoard(selectedBoardId ?? undefined)}>
                <IonIcon icon={refresh} slot="icon-only" />
              </IonButton>
              <IonButton
                fill="clear"
                onClick={() => {
                  logout();
                  history.replace('/auth/login');
                }}
              >
                <IonIcon icon={logOutOutline} slot="icon-only" />
              </IonButton>
            </div>
          </div>

          <IonCard className="zt-card zt-ops-meta-card">
            <IonCardContent>
              <div className="zt-ops-user">
                <IonIcon icon={personCircle} />
                <div>
                  <strong>{user?.name ?? 'Utilizador'}</strong>
                  <p>{user?.email}</p>
                </div>
              </div>

              <IonItem className="zt-reserved-field">
                <IonLabel position="stacked">Board</IonLabel>
                <IonSelect
                  interface="action-sheet"
                  value={selectedBoardId ?? undefined}
                  onIonChange={(event) => {
                    const value = Number(event.detail.value);
                    if (!Number.isNaN(value)) {
                      void handleBoardChange(value);
                    }
                  }}
                >
                  {boardData?.boards.map((board) => (
                    <IonSelectOption key={board.id} value={board.id}>
                      {board.name}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </IonItem>
            </IonCardContent>
          </IonCard>

          {isLoadingBoard ? (
            <div className="zt-ops-loading">
              <IonSpinner name="crescent" />
            </div>
          ) : boardError ? (
            <IonCard className="zt-card zt-ops-error-card">
              <IonCardContent>
                <IonText color="danger">
                  <p>{boardError}</p>
                </IonText>
              </IonCardContent>
            </IonCard>
          ) : (
            <div className="zt-stage-list">
              {boardData?.stages.map((stage) => (
                <section key={stage.id} className="zt-stage-section">
                  <div className="zt-stage-header">
                    <div>
                      <h2>{stage.name}</h2>
                      <p>{stage.tasks.length} tarefas</p>
                    </div>
                    <div className="zt-stage-flags">
                      {stage.is_initial ? <IonChip color="primary">Inicial</IonChip> : null}
                      {stage.is_final ? <IonChip color="success">Final</IonChip> : null}
                    </div>
                  </div>

                  {stage.tasks.length === 0 ? (
                    <IonCard className="zt-card zt-task-empty">
                      <IonCardContent>
                        <p>Sem tarefas neste estadio.</p>
                      </IonCardContent>
                    </IonCard>
                  ) : (
                    <div className="zt-task-list">
                      {stage.tasks.map((task) => (
                        <IonCard key={task.id} className="zt-card zt-task-card" button onClick={() => void openTask(task.id)}>
                          <IonCardContent>
                            <div className="zt-task-topline">
                              <strong>#{task.id} {task.title}</strong>
                              <IonChip className={`zt-priority-chip zt-priority-chip--${task.priority}`}>
                                {task.priority}
                              </IonChip>
                            </div>

                            {task.description ? (
                              <p className="zt-task-desc">{task.description}</p>
                            ) : null}

                            <div className="zt-task-contact-row">
                              {task.phone ? <IonNote>{task.phone}</IonNote> : null}
                              {task.email ? <IonNote>{task.email}</IonNote> : null}
                            </div>

                            <div className="zt-task-meta-row">
                              <span>Entrada {task.created_at_label ?? '-'}</span>
                              <span>{task.first_interaction_at_label ? `1a resposta ${task.first_interaction_at_label}` : 'Sem resposta'}</span>
                            </div>
                          </IonCardContent>
                        </IonCard>
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </div>
          )}
        </div>

        <IonModal isOpen={isTaskModalOpen} onDidDismiss={closeTaskModal} breakpoints={[0, 0.92]} initialBreakpoint={0.92}>
          <IonHeader translucent>
            <IonToolbar className="zt-toolbar">
              <IonTitle>{activeTask ? `Task #${activeTask.id}` : 'Detalhe'}</IonTitle>
              <IonButton slot="end" fill="clear" onClick={closeTaskModal}>
                <IonIcon icon={close} slot="icon-only" />
              </IonButton>
            </IonToolbar>
          </IonHeader>

          <IonContent className="zt-reserved-page">
            <div className="zt-task-modal-body">
              {isLoadingTask ? (
                <div className="zt-ops-loading">
                  <IonSpinner name="crescent" />
                </div>
              ) : taskError && !activeTask ? (
                <IonText color="danger">
                  <p>{taskError}</p>
                </IonText>
              ) : activeTask ? (
                <>
                  <IonCard className="zt-card zt-task-detail-card">
                    <IonCardContent>
                      <div className="zt-task-topline">
                        <strong>{activeTask.title}</strong>
                        <IonChip className={`zt-priority-chip zt-priority-chip--${activeTask.priority}`}>
                          {activeTask.priority}
                        </IonChip>
                      </div>
                      <p className="zt-task-desc">{activeTask.description || 'Sem resumo adicional.'}</p>
                      <div className="zt-task-detail-grid">
                        <div>
                          <span className="zt-task-detail-label">Estadio</span>
                          <strong>{activeTask.stage?.name ?? '-'}</strong>
                        </div>
                        <div>
                          <span className="zt-task-detail-label">Responsavel</span>
                          <strong>{activeTask.assigned_to?.name ?? 'Nao atribuido'}</strong>
                        </div>
                        <div>
                          <span className="zt-task-detail-label">Entrada</span>
                          <strong>{activeTask.created_at_label ?? '-'}</strong>
                        </div>
                      </div>

                      <div className="zt-task-cta-row">
                        <IonButton expand="block" href={activeTask.phone ? `tel:${activeTask.phone}` : undefined} disabled={!activeTask.phone}>
                          <IonIcon icon={call} slot="start" />
                          Ligar
                        </IonButton>
                        <IonButton
                          expand="block"
                          fill="outline"
                          href={activeTask.email ? `mailto:${activeTask.email}?subject=${encodeURIComponent(activeTask.title)}` : undefined}
                          disabled={!activeTask.email}
                        >
                          <IonIcon icon={mail} slot="start" />
                          Email
                        </IonButton>
                      </div>
                    </IonCardContent>
                  </IonCard>

                  <IonCard className="zt-card">
                    <IonCardContent>
                      <div className="zt-section-head">
                        <IonIcon icon={swapHorizontal} />
                        <strong>Mover para estadio</strong>
                      </div>
                      <div className="zt-stage-button-list">
                        {availableStages.map((stage) => (
                          <IonButton
                            key={stage.id}
                            fill="outline"
                            onClick={() => void handleMoveTask(stage.id)}
                            disabled={isMoveSubmitting !== null}
                          >
                            {isMoveSubmitting === stage.id ? <IonSpinner name="crescent" /> : stage.name}
                          </IonButton>
                        ))}
                      </div>
                    </IonCardContent>
                  </IonCard>

                  <IonCard className="zt-card">
                    <IonCardContent>
                      <div className="zt-section-head">
                        <IonIcon icon={documentText} />
                        <strong>Observacoes</strong>
                      </div>

                      {taskError ? (
                        <IonText color="danger">
                          <p className="zt-reserved-error">{taskError}</p>
                        </IonText>
                      ) : null}

                      <IonItem className="zt-reserved-field">
                        <IonLabel position="stacked">Nova observacao</IonLabel>
                        <IonTextarea
                          autoGrow
                          rows={4}
                          value={commentBody}
                          onIonInput={(event) => setCommentBody(event.detail.value ?? '')}
                          placeholder="Escreve a observacao interna..."
                        />
                      </IonItem>

                      <IonButton expand="block" onClick={handleAddComment} disabled={isCommentSubmitting}>
                        {isCommentSubmitting ? <IonSpinner name="crescent" /> : 'Guardar observacao'}
                      </IonButton>

                      <div className="zt-comment-list">
                        {activeTask.comments.length === 0 ? (
                          <p className="zt-task-empty-text">Sem observacoes ainda.</p>
                        ) : (
                          activeTask.comments.map((comment) => (
                            <div key={comment.id} className="zt-comment-card">
                              <div className="zt-comment-head">
                                <strong>{comment.user?.name ?? 'Sistema'}</strong>
                                <span>{comment.created_at_label ?? '-'}</span>
                              </div>
                              <p>{comment.body}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </IonCardContent>
                  </IonCard>
                </>
              ) : null}
            </div>
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default ReservedArea;
