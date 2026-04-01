import {
  IonActionSheet,
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
  IonRouterOutlet,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTabBar,
  IonTabButton,
  IonTabs,
  IonText,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import {
  apps,
  call,
  carSport,
  close,
  documentText,
  idCard,
  logOutOutline,
  mail,
  people,
  personCircle,
  refresh,
  swapHorizontal,
  trash,
} from 'ionicons/icons';
import { useEffect, useRef, useState } from 'react';
import { Redirect, Route, useHistory, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  addKanbanTaskComment,
  createKanbanContact,
  deleteKanbanTask,
  fetchKanbanBoard,
  fetchKanbanTask,
  fetchReservedOverview,
  moveKanbanTask,
  restoreKanbanTask,
  searchKanbanTasks,
} from '../lib/frontpage-api';
import type { KanbanBoardPayload, KanbanTaskDetail, KanbanTaskSummary } from '../types/kanban';
import type { ReservedOverviewPayload } from '../types/reserved';
import './ReservedArea.css';

const ReservedArea: React.FC = () => {
  const history = useHistory();
  const location = useLocation();
  const { logout, token } = useAuth();
  const handledTaskRouteRef = useRef<number | null>(null);
  const [boardData, setBoardData] = useState<KanbanBoardPayload | null>(null);
  const [overviewData, setOverviewData] = useState<ReservedOverviewPayload | null>(null);
  const [selectedStageId, setSelectedStageId] = useState<number | null>(null);
  const [isLoadingBoard, setIsLoadingBoard] = useState(true);
  const [isLoadingOverview, setIsLoadingOverview] = useState(true);
  const [boardError, setBoardError] = useState('');
  const [overviewError, setOverviewError] = useState('');

  const [activeTask, setActiveTask] = useState<KanbanTaskDetail | null>(null);
  const [availableStages, setAvailableStages] = useState<KanbanBoardPayload['stages'][number][]>([]);
  const [restoreStages, setRestoreStages] = useState<KanbanBoardPayload['stages'][number][]>([]);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isCreateContactModalOpen, setIsCreateContactModalOpen] = useState(false);
  const [isLoadingTask, setIsLoadingTask] = useState(false);
  const [taskError, setTaskError] = useState('');
  const [commentBody, setCommentBody] = useState('');
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false);
  const [isMoveSubmitting, setIsMoveSubmitting] = useState<number | null>(null);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [isRestoringTask, setIsRestoringTask] = useState(false);
  const [isDeleteTaskSheetOpen, setIsDeleteTaskSheetOpen] = useState(false);
  const [restoreStageId, setRestoreStageId] = useState<number | null>(null);
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [taskSearchResults, setTaskSearchResults] = useState<KanbanTaskSummary[] | null>(null);
  const [isSearchingTasks, setIsSearchingTasks] = useState(false);
  const [taskSearchError, setTaskSearchError] = useState('');
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [createContactError, setCreateContactError] = useState('');
  const [isCreatingContact, setIsCreatingContact] = useState(false);

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
    } catch (error) {
      setBoardError(error instanceof Error ? error.message : 'Nao foi possivel carregar o kanban.');
    } finally {
      setIsLoadingBoard(false);
    }
  };

  const loadOverview = async () => {
    if (!token) {
      setOverviewError('Sessao invalida.');
      setIsLoadingOverview(false);
      return;
    }

    setIsLoadingOverview(true);
    setOverviewError('');

    try {
      const data = await fetchReservedOverview(token);
      setOverviewData(data);
    } catch (error) {
      setOverviewError(error instanceof Error ? error.message : 'Nao foi possivel carregar a area reservada.');
    } finally {
      setIsLoadingOverview(false);
    }
  };

  const refreshReservedArea = async () => {
    await Promise.all([loadBoard(), loadOverview()]);
  };

  useEffect(() => {
    void refreshReservedArea();
  }, [token]);

  useEffect(() => {
    if (!boardData?.stages.length) {
      setSelectedStageId(null);
      return;
    }

    const currentStageStillExists = selectedStageId !== null
      && boardData.stages.some((stage) => stage.id === selectedStageId);

    if (currentStageStillExists) {
      return;
    }

    const defaultStage = boardData.stages.find((stage) => stage.name.trim().toLowerCase() === 'entrada')
      ?? boardData.stages.find((stage) => stage.is_initial)
      ?? boardData.stages[0];

    setSelectedStageId(defaultStage?.id ?? null);
  }, [boardData, selectedStageId]);

  useEffect(() => {
    if (location.pathname !== '/reserved/tasks') {
      return;
    }

    const searchParams = new URLSearchParams(location.search);
    const taskIdParam = searchParams.get('task');

    if (!taskIdParam) {
      handledTaskRouteRef.current = null;
      return;
    }

    const taskId = Number(taskIdParam);

    if (!Number.isFinite(taskId) || taskId <= 0 || handledTaskRouteRef.current === taskId || !token) {
      return;
    }

    handledTaskRouteRef.current = taskId;

    void openTask(taskId).finally(() => {
      history.replace('/reserved/tasks');
    });
  }, [history, location.pathname, location.search, token]);

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
      setRestoreStages((payload.restore_stages ?? []).map((stage) => ({ ...stage, tasks: [] })));
      setRestoreStageId(payload.task.stage?.id ?? payload.restore_stages?.[0]?.id ?? null);
      setCommentBody('');
    } catch (error) {
      setTaskError(error instanceof Error ? error.message : 'Nao foi possivel carregar a tarefa.');
    } finally {
      setIsLoadingTask(false);
    }
  };

  const closeTaskModal = () => {
    setIsTaskModalOpen(false);
    setIsDeleteTaskSheetOpen(false);
    setIsLoadingTask(false);
    setTaskError('');
    setCommentBody('');
    setActiveTask(null);
    setAvailableStages([]);
    setRestoreStages([]);
    setRestoreStageId(null);
  };

  const openCreateContactModal = () => {
    setCreateContactError('');
    setIsCreateContactModalOpen(true);
  };

  const closeCreateContactModal = () => {
    if (isCreatingContact) {
      return;
    }

    setIsCreateContactModalOpen(false);
    setCreateContactError('');
  };

  const handleCreateContact = async () => {
    if (!token || isCreatingContact) {
      return;
    }

    if (newContactName.trim() === '' || newContactPhone.trim() === '' || newContactEmail.trim() === '') {
      setCreateContactError('Preencha nome, telefone e email.');
      return;
    }

    setIsCreatingContact(true);
    setCreateContactError('');

    try {
      await createKanbanContact(token, {
        name: newContactName.trim(),
        phone: newContactPhone.trim(),
        email: newContactEmail.trim(),
      });

      setNewContactName('');
      setNewContactPhone('');
      setNewContactEmail('');
      setIsCreateContactModalOpen(false);
      await loadBoard();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : ((error as { errors?: Record<string, string[]>; message?: string } | null)?.errors?.name?.[0] ??
            (error as { errors?: Record<string, string[]>; message?: string } | null)?.errors?.phone?.[0] ??
            (error as { errors?: Record<string, string[]>; message?: string } | null)?.errors?.email?.[0] ??
            (error as { message?: string } | null)?.message ??
            'Nao foi possivel criar o contacto.');

      setCreateContactError(message);
    } finally {
      setIsCreatingContact(false);
    }
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
      await loadBoard();
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
      await loadBoard();
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

  const handleDeleteTask = async () => {
    if (!token || !activeTask || isDeletingTask) {
      return;
    }

    setIsDeleteTaskSheetOpen(false);
    setIsDeletingTask(true);
    setTaskError('');

    try {
      await deleteKanbanTask(token, activeTask.id);
      closeTaskModal();
      await loadBoard();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : ((error as { message?: string } | null)?.message ?? 'Nao foi possivel eliminar a tarefa.');
      setTaskError(message);
    } finally {
      setIsDeletingTask(false);
    }
  };

  const handleRestoreTask = async () => {
    if (!token || !activeTask || !restoreStageId || isRestoringTask) {
      return;
    }

    setIsRestoringTask(true);
    setTaskError('');

    try {
      const payload = await restoreKanbanTask(token, activeTask.id, restoreStageId);
      setActiveTask(payload.task);
      setAvailableStages(payload.available_stages.map((stage) => ({ ...stage, tasks: [] })));
      setRestoreStages((payload.restore_stages ?? []).map((stage) => ({ ...stage, tasks: [] })));
      await refreshReservedArea();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : ((error as { errors?: Record<string, string[]>; message?: string } | null)?.errors?.stage_id?.[0] ??
            (error as { message?: string } | null)?.message ??
            'Nao foi possivel restaurar a tarefa.');
      setTaskError(message);
    } finally {
      setIsRestoringTask(false);
    }
  };

  const handleSearchTasks = async () => {
    if (!token || isSearchingTasks) {
      return;
    }

    const query = taskSearchQuery.trim();

    if (query === '') {
      setTaskSearchResults(null);
      setTaskSearchError('');
      return;
    }

    setIsSearchingTasks(true);
    setTaskSearchError('');

    try {
      const payload = await searchKanbanTasks(token, query, boardData?.board_id);
      setTaskSearchResults(payload.results);
    } catch (error) {
      setTaskSearchResults(null);
      setTaskSearchError(error instanceof Error ? error.message : 'Nao foi possivel pesquisar tarefas.');
    } finally {
      setIsSearchingTasks(false);
    }
  };

  const clearTaskSearch = () => {
    setTaskSearchQuery('');
    setTaskSearchResults(null);
    setTaskSearchError('');
  };

  const selectedStage = boardData?.stages.find((stage) => stage.id === selectedStageId) ?? null;

  const renderTasksTab = () => (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar className="zt-toolbar zt-reserved-toolbar">
          <div className="zt-reserved-toolbar__brand">
            <img src="/assets/logo.svg" alt="Zentrum TVDE" className="zt-reserved-toolbar__logo" />
          </div>
          <div className="zt-reserved-toolbar__actions" slot="end">
            <IonButton fill="clear" onClick={() => void refreshReservedArea()}>
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
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="zt-reserved-page">
        <div className="zt-ops-shell zt-ops-shell--tabs">
          <IonCard className="zt-card zt-ops-meta-card">
            <IonCardContent>
              <div className="zt-section-head">
                <IonIcon icon={apps} />
                <strong>Pesquisar tasks</strong>
              </div>
              <div className="zt-reserved-form">
                <IonItem className="zt-reserved-field">
                  <IonLabel position="stacked">Pesquisa global</IonLabel>
                  <IonInput
                    value={taskSearchQuery}
                    placeholder="Nome, telefone, email, comentario, task..."
                    onIonInput={(event) => setTaskSearchQuery(event.detail.value ?? '')}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        void handleSearchTasks();
                      }
                    }}
                  />
                </IonItem>
                <div className="zt-inline-actions">
                  <IonButton expand="block" onClick={() => void handleSearchTasks()} disabled={isSearchingTasks}>
                    {isSearchingTasks ? <IonSpinner name="crescent" /> : 'Pesquisar'}
                  </IonButton>
                  <IonButton expand="block" fill="outline" onClick={clearTaskSearch} disabled={isSearchingTasks && taskSearchQuery.trim() === ''}>
                    Limpar
                  </IonButton>
                </div>
                {taskSearchError ? (
                  <IonText color="danger">
                    <p className="zt-reserved-error">{taskSearchError}</p>
                  </IonText>
                ) : null}
              </div>
            </IonCardContent>
          </IonCard>

          <IonCard className="zt-card zt-ops-meta-card">
            <IonCardContent>
              <div className="zt-section-head">
                <IonIcon icon={documentText} />
                <strong>Criar contacto</strong>
              </div>
              <p className="zt-ops-helper-text">Cria rapidamente um novo lead sem ocupar espaco fixo no ecra.</p>
              <IonButton expand="block" onClick={openCreateContactModal}>
                Novo contacto
              </IonButton>
            </IonCardContent>
          </IonCard>

          <IonCard className="zt-card zt-ops-meta-card">
            <IonCardContent>
              <IonItem className="zt-reserved-field">
                <IonLabel position="stacked">Estado</IonLabel>
                <IonSelect
                  interface="action-sheet"
                  value={selectedStageId ?? undefined}
                  onIonChange={(event) => setSelectedStageId(Number(event.detail.value))}
                >
                  {boardData?.stages.map((stage) => (
                    <IonSelectOption key={stage.id} value={stage.id}>
                      {stage.name}
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
              {taskSearchResults !== null ? (
                <section className="zt-stage-section">
                  <div className="zt-stage-header">
                    <div>
                      <h2>Resultados da pesquisa</h2>
                      <p>{taskSearchResults.length} tarefas</p>
                    </div>
                  </div>

                  {taskSearchResults.length === 0 ? (
                    <IonCard className="zt-card zt-task-empty">
                      <IonCardContent>
                        <p>Sem resultados para esta pesquisa.</p>
                      </IonCardContent>
                    </IonCard>
                  ) : (
                    <div className="zt-task-list">
                      {taskSearchResults.map((task) => (
                        <IonCard key={task.id} className="zt-card zt-task-card" button onClick={() => void openTask(task.id)}>
                          <IonCardContent>
                            <div className="zt-task-topline">
                              <strong>#{task.id} {task.title}</strong>
                              <div className="zt-task-chip-stack">
                                {task.is_deleted ? (
                                  <IonChip className="zt-status-chip zt-status-chip--accident">Eliminada</IonChip>
                                ) : null}
                                <IonChip className={`zt-priority-chip zt-priority-chip--${task.priority}`}>
                                  {task.priority}
                                </IonChip>
                              </div>
                            </div>

                            {task.description ? (
                              <p className="zt-task-desc">{task.description}</p>
                            ) : null}

                            <div className="zt-record-grid">
                              <span>Estado {task.stage?.name ?? '-'}</span>
                              <span>Responsavel {task.assigned_to?.name ?? 'Nao atribuido'}</span>
                              <span>{task.phone || '-'}</span>
                              <span>{task.email || '-'}</span>
                              {task.deleted_at_label ? <span>Eliminada {task.deleted_at_label}</span> : null}
                            </div>
                          </IonCardContent>
                        </IonCard>
                      ))}
                    </div>
                  )}
                </section>
              ) : selectedStage ? (
                <section key={selectedStage.id} className="zt-stage-section">
                  <div className="zt-stage-header">
                    <div>
                      <h2>{selectedStage.name}</h2>
                      <p>{selectedStage.tasks.length} tarefas</p>
                    </div>
                    <div className="zt-stage-flags">
                      {selectedStage.is_initial ? <IonChip color="primary">Inicial</IonChip> : null}
                      {selectedStage.is_final ? <IonChip color="success">Final</IonChip> : null}
                    </div>
                  </div>

                  {selectedStage.tasks.length === 0 ? (
                    <IonCard className="zt-card zt-task-empty">
                      <IonCardContent>
                        <p>Sem tarefas neste estadio.</p>
                      </IonCardContent>
                    </IonCard>
                  ) : (
                    <div className="zt-task-list">
                      {selectedStage.tasks.map((task) => (
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
              ) : null}
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );

  const renderApplicationsTab = () => (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar className="zt-toolbar zt-reserved-toolbar">
          <div className="zt-reserved-toolbar__brand">
            <img src="/assets/logo.svg" alt="Zentrum TVDE" className="zt-reserved-toolbar__logo" />
          </div>
          <div className="zt-reserved-toolbar__actions" slot="end">
            <IonButton fill="clear" onClick={() => void refreshReservedArea()}>
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
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="zt-reserved-page">
        <div className="zt-ops-shell zt-ops-shell--tabs">
          {isLoadingOverview ? (
            <div className="zt-ops-loading">
              <IonSpinner name="crescent" />
            </div>
          ) : overviewError ? (
            <IonCard className="zt-card zt-ops-error-card">
              <IonCardContent>
                <IonText color="danger">
                  <p>{overviewError}</p>
                </IonText>
              </IonCardContent>
            </IonCard>
          ) : (
            <div className="zt-stage-list">
              {overviewData?.candidate_applications.length ? overviewData.candidate_applications.map((application) => (
                <IonCard key={application.id} className="zt-card zt-record-card">
                  <IonCardContent>
                    <div className="zt-task-topline">
                      <strong>#{application.id} {application.full_name}</strong>
                      <IonChip className={`zt-status-chip zt-status-chip--${application.status}`}>
                        {application.status_label}
                      </IonChip>
                    </div>
                    <div className="zt-record-grid">
                      <span>{application.email || '-'}</span>
                      <span>{application.phone || '-'}</span>
                      <span>Passo {application.current_step || '-'}</span>
                      <span>Submetida {application.submitted_at_label || '-'}</span>
                    </div>
                  </IonCardContent>
                </IonCard>
              )) : (
                <IonCard className="zt-card zt-task-empty">
                  <IonCardContent>
                    <p>Sem candidaturas.</p>
                  </IonCardContent>
                </IonCard>
              )}
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );

  const renderDriversTab = () => (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar className="zt-toolbar zt-reserved-toolbar">
          <div className="zt-reserved-toolbar__brand">
            <img src="/assets/logo.svg" alt="Zentrum TVDE" className="zt-reserved-toolbar__logo" />
          </div>
          <div className="zt-reserved-toolbar__actions" slot="end">
            <IonButton fill="clear" onClick={() => void refreshReservedArea()}>
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
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="zt-reserved-page">
        <div className="zt-ops-shell zt-ops-shell--tabs">
          {isLoadingOverview ? (
            <div className="zt-ops-loading">
              <IonSpinner name="crescent" />
            </div>
          ) : overviewError ? (
            <IonCard className="zt-card zt-ops-error-card">
              <IonCardContent>
                <IonText color="danger">
                  <p>{overviewError}</p>
                </IonText>
              </IonCardContent>
            </IonCard>
          ) : (
            <div className="zt-stage-list">
              {overviewData?.drivers.length ? overviewData.drivers.map((driver) => (
                <IonCard key={driver.id} className="zt-card zt-record-card">
                  <IonCardContent>
                    <div className="zt-task-topline">
                      <strong>{driver.name}</strong>
                      <IonChip className={`zt-status-chip ${driver.has_active_billing_profile ? 'zt-status-chip--success' : 'zt-status-chip--gray'}`}>
                        {driver.has_active_billing_profile ? 'Perfil ativo' : 'Sem perfil'}
                      </IonChip>
                    </div>
                    <div className="zt-record-grid">
                      <span>{driver.email || '-'}</span>
                      <span>{driver.phone || '-'}</span>
                      <span>Viatura {driver.current_vehicle_license_plate || '-'}</span>
                      <span>{driver.company_name || 'Sem empresa'}</span>
                      {(driver.bolt_driver_code || driver.uber_driver_code) ? (
                        <span>Bolt {driver.bolt_driver_code || '-'} / Uber {driver.uber_driver_code || '-'}</span>
                      ) : null}
                    </div>
                  </IonCardContent>
                </IonCard>
              )) : (
                <IonCard className="zt-card zt-task-empty">
                  <IonCardContent>
                    <p>Sem motoristas.</p>
                  </IonCardContent>
                </IonCard>
              )}
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );

  const renderVehiclesTab = () => (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar className="zt-toolbar zt-reserved-toolbar">
          <div className="zt-reserved-toolbar__brand">
            <img src="/assets/logo.svg" alt="Zentrum TVDE" className="zt-reserved-toolbar__logo" />
          </div>
          <div className="zt-reserved-toolbar__actions" slot="end">
            <IonButton fill="clear" onClick={() => void refreshReservedArea()}>
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
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="zt-reserved-page">
        <div className="zt-ops-shell zt-ops-shell--tabs">
          {isLoadingOverview ? (
            <div className="zt-ops-loading">
              <IonSpinner name="crescent" />
            </div>
          ) : overviewError ? (
            <IonCard className="zt-card zt-ops-error-card">
              <IonCardContent>
                <IonText color="danger">
                  <p>{overviewError}</p>
                </IonText>
              </IonCardContent>
            </IonCard>
          ) : (
            <div className="zt-stage-list">
              {overviewData?.vehicles.length ? overviewData.vehicles.map((vehicle) => (
                <IonCard key={vehicle.id} className="zt-card zt-record-card">
                  <IonCardContent>
                    <div className="zt-task-topline">
                      <strong>{vehicle.license_plate}</strong>
                      <IonChip className={`zt-status-chip zt-status-chip--${vehicle.status}`}>
                        {vehicle.status_label}
                      </IonChip>
                    </div>
                    <p className="zt-task-desc">{[vehicle.make, vehicle.model].filter(Boolean).join(' ') || 'Sem detalhe de viatura.'}</p>
                    <div className="zt-record-grid">
                      <span>Motorista {vehicle.current_driver_name || '-'}</span>
                      <span>Origem {vehicle.source_label || '-'}</span>
                      <span>Docs expirados {vehicle.expired_documents_count}</span>
                      <span>Docs a expirar {vehicle.expiring_30_documents_count}</span>
                    </div>
                  </IonCardContent>
                </IonCard>
              )) : (
                <IonCard className="zt-card zt-task-empty">
                  <IonCardContent>
                    <p>Sem viaturas.</p>
                  </IonCardContent>
                </IonCard>
              )}
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );

  return (
    <>
      <IonTabs>
        <IonRouterOutlet>
          <Route exact path="/reserved/tasks" render={renderTasksTab} />
          <Route exact path="/reserved/candidaturas" render={renderApplicationsTab} />
          <Route exact path="/reserved/motoristas" render={renderDriversTab} />
          <Route exact path="/reserved/viaturas" render={renderVehiclesTab} />
          <Route exact path="/reserved">
            <Redirect to="/reserved/tasks" />
          </Route>
        </IonRouterOutlet>

        <IonTabBar slot="bottom" className="zt-tabbar zt-reserved-tabbar">
          <IonTabButton tab="tasks" href="/reserved/tasks">
            <IonIcon icon={apps} />
            <IonLabel>Tasks</IonLabel>
          </IonTabButton>
          <IonTabButton tab="candidaturas" href="/reserved/candidaturas">
            <IonIcon icon={idCard} />
            <IonLabel>Candidaturas</IonLabel>
          </IonTabButton>
          <IonTabButton tab="motoristas" href="/reserved/motoristas">
            <IonIcon icon={people} />
            <IonLabel>Motoristas</IonLabel>
          </IonTabButton>
          <IonTabButton tab="viaturas" href="/reserved/viaturas">
            <IonIcon icon={carSport} />
            <IonLabel>Viaturas</IonLabel>
          </IonTabButton>
        </IonTabBar>
      </IonTabs>

      <IonActionSheet
          isOpen={isDeleteTaskSheetOpen}
          header={activeTask ? `Eliminar task #${activeTask.id}` : 'Eliminar task'}
          subHeader="Esta acao remove a task do kanban."
          onDidDismiss={() => setIsDeleteTaskSheetOpen(false)}
          buttons={[
            {
              text: isDeletingTask ? 'A eliminar...' : 'Eliminar task',
              role: 'destructive',
              icon: trash,
              handler: () => {
                void handleDeleteTask();
              },
            },
            {
              text: 'Cancelar',
              role: 'cancel',
            },
          ]}
        />

      <IonModal
          className="zt-task-modal zt-create-contact-modal"
          isOpen={isCreateContactModalOpen}
          onDidDismiss={closeCreateContactModal}
          breakpoints={[0, 0.7]}
          initialBreakpoint={0.7}
        >
          <IonHeader>
            <IonToolbar className="zt-toolbar">
              <IonTitle>Criar contacto</IonTitle>
              <IonButton slot="end" fill="clear" onClick={closeCreateContactModal} disabled={isCreatingContact}>
                <IonIcon icon={close} slot="icon-only" />
              </IonButton>
            </IonToolbar>
          </IonHeader>

          <IonContent className="zt-reserved-page">
            <div className="zt-task-modal-body">
              <IonCard className="zt-card zt-task-detail-card">
                <IonCardContent>
                  <div className="zt-section-head">
                    <IonIcon icon={personCircle} />
                    <strong>Novo lead</strong>
                  </div>

                  <div className="zt-reserved-form">
                    <IonItem className="zt-reserved-field">
                      <IonLabel position="stacked">Nome</IonLabel>
                      <IonInput
                        value={newContactName}
                        onIonInput={(event) => setNewContactName(event.detail.value ?? '')}
                      />
                    </IonItem>

                    <IonItem className="zt-reserved-field">
                      <IonLabel position="stacked">Telefone</IonLabel>
                      <IonInput
                        type="tel"
                        value={newContactPhone}
                        onIonInput={(event) => setNewContactPhone(event.detail.value ?? '')}
                      />
                    </IonItem>

                    <IonItem className="zt-reserved-field">
                      <IonLabel position="stacked">Email</IonLabel>
                      <IonInput
                        type="email"
                        value={newContactEmail}
                        onIonInput={(event) => setNewContactEmail(event.detail.value ?? '')}
                      />
                    </IonItem>

                    {createContactError ? (
                      <IonText color="danger">
                        <p className="zt-reserved-error">{createContactError}</p>
                      </IonText>
                    ) : null}

                    <IonButton expand="block" onClick={handleCreateContact} disabled={isCreatingContact}>
                      {isCreatingContact ? <IonSpinner name="crescent" /> : 'Criar contacto'}
                    </IonButton>
                  </div>
                </IonCardContent>
              </IonCard>
            </div>
          </IonContent>
      </IonModal>

      <IonModal
          className="zt-task-modal"
          isOpen={isTaskModalOpen}
          onDidDismiss={closeTaskModal}
          breakpoints={[0, 0.92]}
          initialBreakpoint={0.92}
        >
          <IonHeader>
            <IonToolbar className="zt-toolbar">
              <IonTitle>{activeTask ? `Task #${activeTask.id}` : 'Detalhe'}</IonTitle>
              <IonButton slot="end" fill="clear" onClick={closeTaskModal} disabled={isDeletingTask}>
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
                        <div className="zt-task-chip-stack">
                          {activeTask.is_deleted ? (
                            <IonChip className="zt-status-chip zt-status-chip--accident">Eliminada</IonChip>
                          ) : null}
                          <IonChip className={`zt-priority-chip zt-priority-chip--${activeTask.priority}`}>
                            {activeTask.priority}
                          </IonChip>
                        </div>
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

                      {activeTask.is_deleted ? (
                        <>
                          <div className="zt-record-grid">
                            <span>Eliminada {activeTask.deleted_at_label ?? '-'}</span>
                          </div>
                          <div className="zt-task-cta-row">
                            <IonItem className="zt-reserved-field">
                              <IonLabel position="stacked">Restaurar para estadio</IonLabel>
                              <IonSelect
                                interface="action-sheet"
                                value={restoreStageId ?? undefined}
                                onIonChange={(event) => setRestoreStageId(Number(event.detail.value))}
                              >
                                {restoreStages.map((stage) => (
                                  <IonSelectOption key={stage.id} value={stage.id}>
                                    {stage.name}
                                  </IonSelectOption>
                                ))}
                              </IonSelect>
                            </IonItem>
                            <IonButton expand="block" onClick={() => void handleRestoreTask()} disabled={isRestoringTask || !restoreStageId}>
                              {isRestoringTask ? <IonSpinner name="crescent" /> : 'Restaurar task'}
                            </IonButton>
                          </div>
                        </>
                      ) : (
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
                          <IonButton
                            color="danger"
                            fill="outline"
                            expand="block"
                            onClick={() => setIsDeleteTaskSheetOpen(true)}
                            disabled={isDeletingTask}
                          >
                            <IonIcon icon={trash} slot="start" />
                            Eliminar task
                          </IonButton>
                        </div>
                      )}
                    </IonCardContent>
                  </IonCard>

                  {!activeTask.is_deleted ? (
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
                  ) : null}

                  {!activeTask.is_deleted ? (
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
                  ) : null}
                </>
              ) : null}
            </div>
          </IonContent>
      </IonModal>
    </>
  );
};

export default ReservedArea;
