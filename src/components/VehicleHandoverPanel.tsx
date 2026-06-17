import { App as CapacitorApp } from '@capacitor/app';
import { Camera, CameraResultType, CameraSource, type Photo } from '@capacitor/camera';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonChip,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonModal,
  IonNote,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonText,
  IonTextarea,
} from '@ionic/react';
import { add, camera, carSport, close, documentText, eye, refresh, videocam } from 'ionicons/icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createVehicleHandover,
  createVehicleHandoverExchange,
  fetchVehicleHandover,
  fetchVehicleHandoversBootstrap,
} from '../lib/frontpage-api';
import { optimizeUploadFile, photoToOptimizedFile } from '../lib/upload-file-utils';
import type {
  VehicleHandoverBootstrapPayload,
  VehicleHandoverCreatePayload,
  VehicleHandoverDetail,
  VehicleHandoverDriver,
  VehicleHandoverVehicle,
} from '../types/handover';
import SignaturePad from './SignaturePad';
import VehicleInspectionMap from './VehicleInspectionMap';

type VehicleHandoverPanelProps = {
  token: string | null;
};

type FlowMode = 'delivery' | 'return' | 'exchange';
type ProcedureType = 'delivery' | 'return';
type SelectionMode = 'vehicle' | 'driver';

type DamageDraft = {
  type: string;
  zone: string;
  description: string;
  photo: string | null;
};

type ProcedureDraft = {
  type: ProcedureType;
  selectionMode: SelectionMode;
  vehicleId: number | null;
  driverId: number | null;
  performedAt: string;
  checklistState: Record<string, { checked: boolean; value: string }>;
  damageItems: DamageDraft[];
  generalPhotos: string[];
  guidedPhotoItems: Record<string, string | null>;
  videoItems: {
    exterior: File | null;
    interior: File | null;
  };
  notes: string;
  operatorSignature: string;
  driverSignature: string;
  vehicleQuery: string;
  driverQuery: string;
};

type PersistedProcedureDraft = Omit<ProcedureDraft, 'videoItems'>;

type PersistedCreateState = {
  modalOpen: boolean;
  flowMode: FlowMode;
  returnDraft: PersistedProcedureDraft;
  deliveryDraft: PersistedProcedureDraft;
  pendingGuidedPhoto: { target: ProcedureType; zoneKey: string } | null;
  savedAt: number;
};

const HANDOVER_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
const HANDOVER_IMAGE_MAX_DIMENSION = 1600;
const VIDEO_MAX_BYTES = 15 * 1024 * 1024;
const HANDOVER_TOTAL_MAX_BYTES = 36 * 1024 * 1024;
const VIDEO_MAX_SECONDS = 60;
const DRAFT_STORAGE_KEY = 'zt.vehicle-handover.draft';

async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Nao foi possivel ler o ficheiro.'));
    reader.readAsDataURL(file);
  });
}

function formatMb(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))}MB`;
}

function dataUrlBytes(dataUrl: string | null | undefined): number {
  if (!dataUrl) {
    return 0;
  }

  return Math.ceil(dataUrl.length * 0.75);
}

function getSupportedVideoMimeType(): string {
  if (typeof MediaRecorder === 'undefined') {
    return '';
  }

  const mimeTypes = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ];

  return mimeTypes.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) ?? '';
}

function buildDraft(type: ProcedureType, bootstrap: VehicleHandoverBootstrapPayload | null): ProcedureDraft {
  return {
    type,
    selectionMode: type === 'return' ? 'driver' : 'vehicle',
    vehicleId: null,
    driverId: null,
    performedAt: new Date().toISOString().slice(0, 16),
    checklistState: Object.fromEntries((bootstrap?.checklist_items ?? []).map((item) => [item.key, { checked: false, value: '' }])),
    damageItems: [],
    generalPhotos: [],
    guidedPhotoItems: Object.fromEntries((bootstrap?.guided_photo_zones ?? []).map((zone) => [zone.key, null])),
    videoItems: {
      exterior: null,
      interior: null,
    },
    notes: '',
    operatorSignature: '',
    driverSignature: '',
    vehicleQuery: '',
    driverQuery: '',
  };
}

function toPersistedDraft(draft: ProcedureDraft): PersistedProcedureDraft {
  const { videoItems: _videoItems, ...persistedDraft } = draft;
  return persistedDraft;
}

function fromPersistedDraft(
  persistedDraft: PersistedProcedureDraft,
  bootstrap: VehicleHandoverBootstrapPayload | null,
): ProcedureDraft {
  return {
    ...buildDraft(persistedDraft.type, bootstrap),
    ...persistedDraft,
    checklistState: {
      ...buildDraft(persistedDraft.type, bootstrap).checklistState,
      ...persistedDraft.checklistState,
    },
    guidedPhotoItems: {
      ...buildDraft(persistedDraft.type, bootstrap).guidedPhotoItems,
      ...persistedDraft.guidedPhotoItems,
    },
    videoItems: {
      exterior: null,
      interior: null,
    },
  };
}

function matchesQuery(value: string, query: string): boolean {
  return value.toLowerCase().includes(query.trim().toLowerCase());
}

const VehicleHandoverPanel: React.FC<VehicleHandoverPanelProps> = ({ token }) => {
  const [bootstrap, setBootstrap] = useState<VehicleHandoverBootstrapPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');
  const [detailError, setDetailError] = useState('');
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [activeProcedure, setActiveProcedure] = useState<VehicleHandoverDetail | null>(null);
  const [flowMode, setFlowMode] = useState<FlowMode>('delivery');
  const [returnDraft, setReturnDraft] = useState<ProcedureDraft>(() => buildDraft('return', null));
  const [deliveryDraft, setDeliveryDraft] = useState<ProcedureDraft>(() => buildDraft('delivery', null));
  const [videoCaptureTarget, setVideoCaptureTarget] = useState<{ target: ProcedureType; key: 'exterior' | 'interior' } | null>(null);
  const [videoCaptureError, setVideoCaptureError] = useState('');
  const [videoCaptureSeconds, setVideoCaptureSeconds] = useState(0);
  const [isVideoRecording, setIsVideoRecording] = useState(false);
  const [photoCaptureTarget, setPhotoCaptureTarget] = useState<{ target: ProcedureType; zoneKey: string } | null>(null);
  const [photoCaptureError, setPhotoCaptureError] = useState('');
  const photoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const photoStreamRef = useRef<MediaStream | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const videoRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const videoTimerRef = useRef<number | null>(null);
  const videoCancelRef = useRef(false);
  const nativeCameraOpenRef = useRef(false);
  const pendingGuidedPhotoRef = useRef<{ target: ProcedureType; zoneKey: string } | null>(null);

  const persistCreateState = (override?: Partial<PersistedCreateState>) => {
    try {
      const snapshot: PersistedCreateState = {
        modalOpen: isCreateModalOpen,
        flowMode,
        returnDraft: toPersistedDraft(returnDraft),
        deliveryDraft: toPersistedDraft(deliveryDraft),
        pendingGuidedPhoto: pendingGuidedPhotoRef.current,
        savedAt: Date.now(),
        ...override,
      };

      sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      // Best-effort safety net for Android camera handoff.
    }
  };

  const clearPersistedCreateState = () => {
    try {
      sessionStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // Ignore storage failures.
    }
  };

  const loadBootstrap = async () => {
    if (!token) {
      setError('Sessao invalida.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const payload = await fetchVehicleHandoversBootstrap(token);
      setBootstrap(payload);
      let parsedState: PersistedCreateState | null = null;

      try {
        const storedState = sessionStorage.getItem(DRAFT_STORAGE_KEY);
        parsedState = storedState ? JSON.parse(storedState) as PersistedCreateState : null;
      } catch {
        parsedState = null;
      }

      const shouldRestore = Boolean(parsedState && Date.now() - parsedState.savedAt < 12 * 60 * 60 * 1000);

      if (shouldRestore && parsedState) {
        pendingGuidedPhotoRef.current = parsedState.pendingGuidedPhoto ?? null;
        setFlowMode(parsedState.flowMode);
        setReturnDraft(fromPersistedDraft(parsedState.returnDraft, payload));
        setDeliveryDraft(fromPersistedDraft(parsedState.deliveryDraft, payload));
        setIsCreateModalOpen(parsedState.modalOpen);
      } else {
        clearPersistedCreateState();
        setReturnDraft((current) => ({
          ...buildDraft('return', payload),
          vehicleId: current.vehicleId,
          driverId: current.driverId,
        }));
        setDeliveryDraft((current) => ({
          ...buildDraft('delivery', payload),
          vehicleId: current.vehicleId,
          driverId: current.driverId,
        }));
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Nao foi possivel carregar os procedimentos.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadBootstrap();
  }, [token]);

  useEffect(() => {
    const listenerPromise = CapacitorApp.addListener('appRestoredResult', (event) => {
      if (event.pluginId !== 'Camera' || event.methodName !== 'getPhoto') {
        return;
      }

      let pendingPhoto = pendingGuidedPhotoRef.current;

      if (!pendingPhoto) {
        try {
          const storedState = sessionStorage.getItem(DRAFT_STORAGE_KEY);
          const parsedState = storedState ? JSON.parse(storedState) as PersistedCreateState : null;
          pendingPhoto = parsedState?.pendingGuidedPhoto ?? null;
        } catch {
          pendingPhoto = null;
        }
      }

      if (!pendingPhoto) {
        return;
      }

      const restoredPhoto = event.data as Photo | undefined;

      if (!restoredPhoto) {
        return;
      }

      pendingGuidedPhotoRef.current = null;
      nativeCameraOpenRef.current = false;
      setIsCreateModalOpen(true);
      void applyGuidedPhoto(pendingPhoto.target, pendingPhoto.zoneKey, restoredPhoto);
    });

    return () => {
      void listenerPromise.then((listener) => listener.remove());
    };
  }, [returnDraft, deliveryDraft]);

  const stopVideoStream = () => {
    if (videoTimerRef.current !== null) {
      window.clearInterval(videoTimerRef.current);
      videoTimerRef.current = null;
    }

    videoStreamRef.current?.getTracks().forEach((track) => track.stop());
    videoStreamRef.current = null;

    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }
  };

  const stopPhotoStream = () => {
    photoStreamRef.current?.getTracks().forEach((track) => track.stop());
    photoStreamRef.current = null;

    if (photoPreviewRef.current) {
      photoPreviewRef.current.srcObject = null;
    }
  };

  useEffect(() => () => {
    stopVideoStream();
    stopPhotoStream();
  }, []);

  const selectedReturnVehicle = useMemo(
    () => bootstrap?.vehicles.find((vehicle) => vehicle.id === returnDraft.vehicleId) ?? null,
    [bootstrap?.vehicles, returnDraft.vehicleId],
  );
  const selectedReturnDriver = useMemo(
    () => bootstrap?.drivers.find((driver) => driver.id === returnDraft.driverId) ?? null,
    [bootstrap?.drivers, returnDraft.driverId],
  );
  const selectedDeliveryVehicle = useMemo(
    () => bootstrap?.vehicles.find((vehicle) => vehicle.id === deliveryDraft.vehicleId) ?? null,
    [bootstrap?.vehicles, deliveryDraft.vehicleId],
  );
  const selectedDeliveryDriver = useMemo(
    () => bootstrap?.drivers.find((driver) => driver.id === deliveryDraft.driverId) ?? null,
    [bootstrap?.drivers, deliveryDraft.driverId],
  );

  const resetCreateState = (mode: FlowMode = 'delivery') => {
    setFlowMode(mode);
    setReturnDraft(buildDraft('return', bootstrap));
    setDeliveryDraft(buildDraft('delivery', bootstrap));
    setCreateError('');
    clearPersistedCreateState();
  };

  const openCreateModal = () => {
    resetCreateState('delivery');
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    if (nativeCameraOpenRef.current) {
      setIsCreateModalOpen(true);
      return;
    }

    setIsCreateModalOpen(false);
    clearPersistedCreateState();
  };

  const openProcedure = async (procedureId: number) => {
    if (!token) {
      return;
    }

    setIsDetailModalOpen(true);
    setIsLoadingDetail(true);
    setDetailError('');

    try {
      const procedure = await fetchVehicleHandover(token, procedureId);
      setActiveProcedure(procedure);
    } catch (loadError) {
      setDetailError(loadError instanceof Error ? loadError.message : 'Nao foi possivel carregar o documento.');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const patchDraft = (target: ProcedureType, patch: Partial<ProcedureDraft>) => {
    const setter = target === 'return' ? setReturnDraft : setDeliveryDraft;
    setter((current) => ({ ...current, ...patch }));
  };

  const updateChecklist = (target: ProcedureType, key: string, patch: Partial<{ checked: boolean; value: string }>) => {
    const draft = target === 'return' ? returnDraft : deliveryDraft;
    patchDraft(target, {
      checklistState: {
        ...draft.checklistState,
        [key]: {
          checked: draft.checklistState[key]?.checked ?? false,
          value: draft.checklistState[key]?.value ?? '',
          ...patch,
        },
      },
    });
  };

  const setDamageField = (target: ProcedureType, index: number, patch: Partial<DamageDraft>) => {
    const draft = target === 'return' ? returnDraft : deliveryDraft;
    patchDraft(target, {
      damageItems: draft.damageItems.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    });
  };

  const syncPhotoChecklist = (target: ProcedureType, draft: ProcedureDraft) => {
    if (!bootstrap?.guided_photo_zones.length) {
      return;
    }

    const complete = bootstrap.guided_photo_zones
      .filter((zone) => zone.required)
      .every((zone) => Boolean(draft.guidedPhotoItems[zone.key]));

    if ((draft.checklistState.photos_inside_outside?.checked ?? false) !== complete) {
      patchDraft(target, {
        checklistState: {
          ...draft.checklistState,
          photos_inside_outside: {
            checked: complete,
            value: draft.checklistState.photos_inside_outside?.value ?? '',
          },
        },
      });
    }
  };

  useEffect(() => syncPhotoChecklist('return', returnDraft), [bootstrap?.guided_photo_zones, returnDraft.guidedPhotoItems]);
  useEffect(() => syncPhotoChecklist('delivery', deliveryDraft), [bootstrap?.guided_photo_zones, deliveryDraft.guidedPhotoItems]);

  const autoFillFromSelection = (target: ProcedureType, draft: ProcedureDraft, vehicle: VehicleHandoverVehicle | null, driver: VehicleHandoverDriver | null) => {
    if (draft.selectionMode === 'vehicle' && vehicle?.current_driver_id && draft.driverId !== vehicle.current_driver_id) {
      patchDraft(target, { driverId: vehicle.current_driver_id });
    }

    if (draft.selectionMode === 'driver' && driver?.current_vehicle_id && draft.vehicleId !== driver.current_vehicle_id) {
      patchDraft(target, { vehicleId: driver.current_vehicle_id });
    }
  };

  useEffect(() => autoFillFromSelection('return', returnDraft, selectedReturnVehicle, selectedReturnDriver), [returnDraft.selectionMode, selectedReturnVehicle?.current_driver_id, selectedReturnDriver?.current_vehicle_id]);
  useEffect(() => autoFillFromSelection('delivery', deliveryDraft, selectedDeliveryVehicle, selectedDeliveryDriver), [deliveryDraft.selectionMode, selectedDeliveryVehicle?.current_driver_id, selectedDeliveryDriver?.current_vehicle_id]);
  useEffect(() => {
    if (flowMode === 'exchange' && returnDraft.driverId && !deliveryDraft.driverId) {
      patchDraft('delivery', { driverId: returnDraft.driverId });
    }
  }, [flowMode, returnDraft.driverId, deliveryDraft.driverId]);

  const handleGeneralPhotos = async (target: ProcedureType, event: Event) => {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    try {
      const optimizedFiles = await Promise.all(
        files.map((file) => optimizeUploadFile(file, HANDOVER_IMAGE_MAX_BYTES, HANDOVER_IMAGE_MAX_DIMENSION)),
      );
      const urls = await Promise.all(optimizedFiles.map((file) => fileToDataUrl(file)));
      patchDraft(target, { generalPhotos: urls });
      setCreateError('');
    } catch (caughtError) {
      setCreateError(caughtError instanceof Error ? caughtError.message : 'Nao foi possivel processar as fotos.');
    } finally {
      input.value = '';
    }
  };

  const handleDamagePhoto = async (target: ProcedureType, index: number, event: Event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    try {
      const optimizedFile = await optimizeUploadFile(file, HANDOVER_IMAGE_MAX_BYTES, HANDOVER_IMAGE_MAX_DIMENSION);
      const dataUrl = await fileToDataUrl(optimizedFile);
      setDamageField(target, index, { photo: dataUrl });
      setCreateError('');
    } catch (caughtError) {
      setCreateError(caughtError instanceof Error ? caughtError.message : 'Nao foi possivel processar a foto.');
    } finally {
      input.value = '';
    }
  };

  const setGuidedPhotoDataUrl = (target: ProcedureType, zoneKey: string, dataUrl: string) => {
    const draft = target === 'return' ? returnDraft : deliveryDraft;

    patchDraft(target, {
      guidedPhotoItems: {
        ...draft.guidedPhotoItems,
        [zoneKey]: dataUrl,
      },
    });
    setCreateError('');
    persistCreateState({
      modalOpen: true,
      pendingGuidedPhoto: null,
    });
  };

  const applyGuidedPhoto = async (target: ProcedureType, zoneKey: string, photo: Photo) => {
    const file = await photoToOptimizedFile(photo, zoneKey, HANDOVER_IMAGE_MAX_BYTES, HANDOVER_IMAGE_MAX_DIMENSION);
    const dataUrl = await fileToDataUrl(file);
    setGuidedPhotoDataUrl(target, zoneKey, dataUrl);
  };

  const handleGuidedPhotoCapture = async (target: ProcedureType, zoneKey: string) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCreateError('Este dispositivo nao suporta captura de foto dentro da app.');
      return;
    }

    stopPhotoStream();
    pendingGuidedPhotoRef.current = { target, zoneKey };
    setPhotoCaptureTarget({ target, zoneKey });
    setPhotoCaptureError('');
    persistCreateState({
      modalOpen: true,
      pendingGuidedPhoto: pendingGuidedPhotoRef.current,
    });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1600 },
          height: { ideal: 1200 },
        },
      });

      photoStreamRef.current = stream;

      if (photoPreviewRef.current) {
        photoPreviewRef.current.srcObject = stream;
        await photoPreviewRef.current.play().catch(() => undefined);
      }
    } catch (caughtError) {
      setPhotoCaptureTarget(null);
      pendingGuidedPhotoRef.current = null;
      setCreateError(caughtError instanceof Error ? caughtError.message : 'Nao foi possivel abrir a camera.');
      stopPhotoStream();
    }
  };

  const captureGuidedPhoto = async () => {
    const captureTarget = photoCaptureTarget;
    const video = photoPreviewRef.current;

    if (!captureTarget || !video || !video.videoWidth || !video.videoHeight) {
      setPhotoCaptureError('A camera ainda nao esta pronta.');
      return;
    }

    try {
      const scale = Math.min(1, HANDOVER_IMAGE_MAX_DIMENSION / Math.max(video.videoWidth, video.videoHeight));
      const width = Math.max(1, Math.round(video.videoWidth * scale));
      const height = Math.max(1, Math.round(video.videoHeight * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')?.drawImage(video, 0, 0, width, height);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((nextBlob) => {
          if (nextBlob) {
            resolve(nextBlob);
          } else {
            reject(new Error('Nao foi possivel capturar a foto.'));
          }
        }, 'image/jpeg', 0.82);
      });

      const file = new File([blob], `${captureTarget.zoneKey}-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const optimizedFile = await optimizeUploadFile(file, HANDOVER_IMAGE_MAX_BYTES, HANDOVER_IMAGE_MAX_DIMENSION);
      const dataUrl = await fileToDataUrl(optimizedFile);
      setGuidedPhotoDataUrl(captureTarget.target, captureTarget.zoneKey, dataUrl);
      setPhotoCaptureTarget(null);
      pendingGuidedPhotoRef.current = null;
      stopPhotoStream();
    } catch (caughtError) {
      setPhotoCaptureError(caughtError instanceof Error ? caughtError.message : 'Nao foi possivel capturar a foto.');
    }
  };

  const cancelGuidedPhotoCapture = () => {
    setPhotoCaptureTarget(null);
    setPhotoCaptureError('');
    pendingGuidedPhotoRef.current = null;
    persistCreateState({
      modalOpen: true,
      pendingGuidedPhoto: null,
    });
    stopPhotoStream();
  };

  const startVideoCapture = async (target: ProcedureType, key: 'exterior' | 'interior') => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setCreateError('Este dispositivo nao suporta gravacao de video dentro da app.');
      return;
    }

    stopVideoStream();
    setVideoCaptureTarget({ target, key });
    setVideoCaptureError('');
    setVideoCaptureSeconds(0);
    setIsVideoRecording(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      videoStreamRef.current = stream;

      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        await videoPreviewRef.current.play().catch(() => undefined);
      }
    } catch (caughtError) {
      setVideoCaptureError(caughtError instanceof Error ? caughtError.message : 'Nao foi possivel abrir a camera de video.');
      stopVideoStream();
    }
  };

  const beginVideoRecording = () => {
    const stream = videoStreamRef.current;

    if (!stream || !videoCaptureTarget) {
      setVideoCaptureError('A camera ainda nao esta pronta.');
      return;
    }

    const captureTarget = videoCaptureTarget;
    const mimeType = getSupportedVideoMimeType();

    try {
      videoChunksRef.current = [];
      videoCancelRef.current = false;
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      videoRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          videoChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        if (videoTimerRef.current !== null) {
          window.clearInterval(videoTimerRef.current);
          videoTimerRef.current = null;
        }

        if (videoCancelRef.current) {
          videoCancelRef.current = false;
          videoChunksRef.current = [];
          return;
        }

        const blob = new Blob(videoChunksRef.current, { type: recorder.mimeType || mimeType || 'video/webm' });
        const extension = blob.type.includes('mp4') ? 'mp4' : 'webm';
        const file = new File(
          [blob],
          `${captureTarget.target}-${captureTarget.key}-${Date.now()}.${extension}`,
          { type: blob.type || 'video/webm' },
        );

        if (file.size > VIDEO_MAX_BYTES) {
          setVideoCaptureError(`Video demasiado grande (${formatMb(file.size)}). Grava um video mais curto, ate ${formatMb(VIDEO_MAX_BYTES)}.`);
          setIsVideoRecording(false);
          return;
        }

        const draft = captureTarget.target === 'return' ? returnDraft : deliveryDraft;

        patchDraft(captureTarget.target, {
          videoItems: {
            ...draft.videoItems,
            [captureTarget.key]: file,
          },
        });
        setCreateError('');
        setIsVideoRecording(false);
        setVideoCaptureTarget(null);
        stopVideoStream();
      };

      recorder.start(1000);
      setVideoCaptureSeconds(0);
      setVideoCaptureError('');
      setIsVideoRecording(true);
      videoTimerRef.current = window.setInterval(() => {
        setVideoCaptureSeconds((seconds) => {
          const nextSeconds = seconds + 1;

          if (nextSeconds >= VIDEO_MAX_SECONDS && videoRecorderRef.current?.state === 'recording') {
            videoRecorderRef.current.stop();
          }

          return nextSeconds;
        });
      }, 1000);
    } catch (caughtError) {
      setVideoCaptureError(caughtError instanceof Error ? caughtError.message : 'Nao foi possivel gravar o video.');
    }
  };

  const stopVideoRecording = () => {
    if (videoRecorderRef.current?.state === 'recording') {
      videoRecorderRef.current.stop();
    }
  };

  const cancelVideoCapture = () => {
    if (videoRecorderRef.current?.state === 'recording') {
      videoCancelRef.current = true;
      videoRecorderRef.current.stop();
    }

    setVideoCaptureTarget(null);
    setVideoCaptureError('');
    setIsVideoRecording(false);
    stopVideoStream();
  };

  const removeVideo = (target: ProcedureType, key: 'exterior' | 'interior') => {
    const draft = target === 'return' ? returnDraft : deliveryDraft;

    patchDraft(target, {
      videoItems: {
        ...draft.videoItems,
        [key]: null,
      },
    });
  };

  const estimateDraftUploadBytes = (draft: ProcedureDraft): number => {
    const photoBytes = [
      ...Object.values(draft.guidedPhotoItems),
      ...draft.generalPhotos,
      ...draft.damageItems.map((item) => item.photo),
      draft.operatorSignature,
      draft.driverSignature,
    ].reduce((total, value) => total + dataUrlBytes(value), 0);

    return photoBytes + (draft.videoItems.exterior?.size ?? 0) + (draft.videoItems.interior?.size ?? 0);
  };

  const validateDraft = (draft: ProcedureDraft, title: string): boolean => {
    if (!draft.vehicleId || !draft.driverId) {
      setCreateError(`${title}: seleciona a viatura e o motorista.`);
      return false;
    }

    if (!draft.operatorSignature || !draft.driverSignature) {
      setCreateError(`${title}: as duas assinaturas sao obrigatorias.`);
      return false;
    }

    const estimatedBytes = estimateDraftUploadBytes(draft);

    if (estimatedBytes > HANDOVER_TOTAL_MAX_BYTES) {
      setCreateError(`${title}: o envio esta demasiado pesado (${formatMb(estimatedBytes)}). Reduz videos/fotos antes de guardar.`);
      return false;
    }

    return true;
  };

  const toPayload = (draft: ProcedureDraft): VehicleHandoverCreatePayload => ({
    type: draft.type,
    vehicle_id: draft.vehicleId ?? 0,
    driver_id: draft.driverId ?? 0,
    performed_at: draft.performedAt,
    checklist_payload: Object.fromEntries(
      Object.entries(draft.checklistState).map(([key, value]) => [key, { checked: value.checked, value: value.value || null }]),
    ),
    damage_items: draft.damageItems
      .filter((item) => item.type && item.zone)
      .map((item) => ({
        type: item.type,
        zone: item.zone,
        description: item.description,
        photo: item.photo,
      })),
    guided_photo_items: Object.fromEntries(
      Object.entries(draft.guidedPhotoItems).map(([key, value]) => [key, { photo: value }]),
    ),
    general_photos: draft.generalPhotos,
    video_items: draft.videoItems,
    notes: draft.notes,
    operator_signature_data_url: draft.operatorSignature,
    driver_signature_data_url: draft.driverSignature,
  });

  const submit = async () => {
    if (!token || !bootstrap) {
      setCreateError('Sessao invalida.');
      return;
    }

    const activeReturn = flowMode === 'return' || flowMode === 'exchange';
    const activeDelivery = flowMode === 'delivery' || flowMode === 'exchange';

    if (activeReturn && !validateDraft(returnDraft, 'Recolha')) {
      return;
    }

    if (activeDelivery && !validateDraft(deliveryDraft, 'Entrega')) {
      return;
    }

    setIsSubmitting(true);
    setCreateError('');

    try {
      if (flowMode === 'exchange') {
        const result = await createVehicleHandoverExchange(token, {
          return_procedure: toPayload(returnDraft),
          delivery_procedure: toPayload(deliveryDraft),
        });

        clearPersistedCreateState();
        setIsCreateModalOpen(false);
        await loadBootstrap();
        setActiveProcedure(result.delivery);
        setIsDetailModalOpen(true);
        return;
      }

      const procedure = await createVehicleHandover(token, toPayload(flowMode === 'return' ? returnDraft : deliveryDraft));

      clearPersistedCreateState();
      setIsCreateModalOpen(false);
      await loadBootstrap();
      setActiveProcedure(procedure);
      setIsDetailModalOpen(true);
    } catch (submitError: unknown) {
      if (submitError && typeof submitError === 'object' && 'message' in submitError) {
        const apiError = submitError as { message?: string; errors?: Record<string, string[]> };
        const firstValidationMessage = apiError.errors
          ? Object.values(apiError.errors).flat()[0]
          : undefined;
        setCreateError(firstValidationMessage || apiError.message || 'Nao foi possivel guardar o procedimento.');
      } else {
        setCreateError(submitError instanceof Error ? submitError.message : 'Nao foi possivel guardar o procedimento.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderPicker = (target: ProcedureType, draft: ProcedureDraft, vehicle: VehicleHandoverVehicle | null, driver: VehicleHandoverDriver | null) => {
    const filteredVehicles = (bootstrap?.vehicles ?? [])
      .filter((item) => matchesQuery(`${item.display_name} ${item.current_driver_name ?? ''}`, draft.vehicleQuery))
      .slice(0, 20);
    const filteredDrivers = (bootstrap?.drivers ?? [])
      .filter((item) => matchesQuery(`${item.display_name} ${item.current_vehicle_license_plate ?? ''}`, draft.driverQuery))
      .slice(0, 20);

    return (
      <>
        <IonItem lines="full">
          <IonLabel position="stacked">Comecar por</IonLabel>
          <IonSelect
            value={draft.selectionMode}
            onIonChange={(event) => patchDraft(target, {
              selectionMode: event.detail.value,
              driverQuery: event.detail.value === 'driver' ? draft.driverQuery : '',
              vehicleQuery: event.detail.value === 'vehicle' ? draft.vehicleQuery : '',
            })}
            interface="popover"
          >
            <IonSelectOption value="driver">Motorista</IonSelectOption>
            <IonSelectOption value="vehicle">Matricula</IonSelectOption>
          </IonSelect>
        </IonItem>

        <div className="zt-handover-search-grid zt-handover-search-grid--single">
          {draft.selectionMode === 'driver' ? (
          <div>
            <IonSearchbar value={draft.driverQuery} placeholder="Pesquisar motorista" debounce={150} onIonInput={(event) => patchDraft(target, { driverQuery: event.detail.value || '' })} />
            <div className="zt-handover-choice-list">
              {filteredDrivers.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`zt-handover-choice ${draft.driverId === item.id ? 'is-active' : ''}`}
                  onClick={() => patchDraft(target, { driverId: item.id, vehicleId: draft.selectionMode === 'driver' && item.current_vehicle_id ? item.current_vehicle_id : draft.vehicleId })}
                >
                  <strong>{item.name}</strong>
                  <span>{item.current_vehicle_license_plate ? `Atual: ${item.current_vehicle_license_plate}` : item.phone || 'Sem viatura atual'}</span>
                </button>
              ))}
            </div>
          </div>
          ) : null}

          {draft.selectionMode === 'vehicle' ? (
          <div>
            <IonSearchbar value={draft.vehicleQuery} placeholder="Pesquisar matricula" debounce={150} onIonInput={(event) => patchDraft(target, { vehicleQuery: event.detail.value || '' })} />
            <div className="zt-handover-choice-list">
              {filteredVehicles.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`zt-handover-choice ${draft.vehicleId === item.id ? 'is-active' : ''}`}
                  onClick={() => patchDraft(target, { vehicleId: item.id, driverId: draft.selectionMode === 'vehicle' && item.current_driver_id ? item.current_driver_id : draft.driverId })}
                >
                  <strong>{item.license_plate}</strong>
                  <span>{item.current_driver_name ? `Atual: ${item.current_driver_name}` : item.status_label}</span>
                </button>
              ))}
            </div>
          </div>
          ) : null}
        </div>

        {!!vehicle && (
          <IonNote className="zt-handover-note">
            Estado da viatura: {vehicle.status_label}
            {vehicle.current_driver_name ? ` · Motorista atual ${vehicle.current_driver_name}` : ''}
          </IonNote>
        )}

        {!!driver?.current_vehicle_license_plate && (
          <IonNote className="zt-handover-note">
            Viatura atual do motorista: {driver.current_vehicle_license_plate}
          </IonNote>
        )}
      </>
    );
  };

  const renderProcedureForm = (target: ProcedureType, title: string) => {
    const draft = target === 'return' ? returnDraft : deliveryDraft;
    const vehicle = target === 'return' ? selectedReturnVehicle : selectedDeliveryVehicle;
    const driver = target === 'return' ? selectedReturnDriver : selectedDeliveryDriver;

    return (
      <div className="zt-handover-procedure">
        <div className="zt-handover-section__header">
          <h3>{title}</h3>
          <IonChip className={`zt-status-chip ${target === 'delivery' ? 'zt-status-chip--success' : 'zt-status-chip--warning'}`}>
            {target === 'delivery' ? 'Entrega' : 'Recolha'}
          </IonChip>
        </div>

        {renderPicker(target, draft, vehicle, driver)}

        <IonItem lines="full">
          <IonLabel position="stacked">Data e hora</IonLabel>
          <IonInput type="datetime-local" value={draft.performedAt} onIonInput={(event) => patchDraft(target, { performedAt: String(event.detail.value || '') })} />
        </IonItem>

        <div className="zt-handover-section">
          <h3>Checklist</h3>
          {bootstrap?.checklist_items.filter((item) => item.key !== 'photos_inside_outside').map((item) => (
            <div key={item.key} className="zt-handover-checklist-row">
              <label className="zt-handover-checklist-row__label">
                <input
                  type="checkbox"
                  checked={draft.checklistState[item.key]?.checked ?? false}
                  onChange={(event) => updateChecklist(target, item.key, { checked: event.target.checked })}
                />
                <span>{item.label}</span>
              </label>
              {item.requires_value ? (
                <IonInput
                  value={draft.checklistState[item.key]?.value ?? ''}
                  placeholder={item.value_label || 'Valor'}
                  onIonInput={(event) => updateChecklist(target, item.key, { value: String(event.detail.value || '') })}
                />
              ) : null}
            </div>
          ))}
        </div>

        <div className="zt-handover-section">
          <div className="zt-handover-section__header">
            <h3>Mapa fotografico</h3>
            <IonChip className={`zt-status-chip ${draft.checklistState.photos_inside_outside?.checked ? 'zt-status-chip--success' : 'zt-status-chip--warning'}`}>
              {draft.checklistState.photos_inside_outside?.checked ? 'Completo' : 'Em falta'}
            </IonChip>
          </div>
          {bootstrap?.guided_photo_zones.length ? (
            <VehicleInspectionMap
              zones={bootstrap.guided_photo_zones}
              photosByZone={draft.guidedPhotoItems}
              onCapture={(zoneKey) => void handleGuidedPhotoCapture(target, zoneKey)}
            />
          ) : null}
        </div>

        <div className="zt-handover-section">
          <h3>Videos</h3>
          <div className="zt-handover-video-grid">
            {(['exterior', 'interior'] as const).map((key) => (
              <div key={key} className="zt-handover-upload zt-handover-video-card">
                <IonIcon icon={videocam} />
                <span>{draft.videoItems[key] ? `${key === 'exterior' ? 'Exterior' : 'Interior'} pronto (${formatMb(draft.videoItems[key]?.size ?? 0)})` : `Gravar video ${key === 'exterior' ? 'exterior' : 'interior'} ate ${formatMb(VIDEO_MAX_BYTES)} (opcional)`}</span>
                <div className="zt-handover-video-actions">
                  <IonButton size="small" fill="outline" onClick={() => void startVideoCapture(target, key)}>
                    <IonIcon icon={videocam} slot="start" />
                    {draft.videoItems[key] ? 'Regravar' : 'Gravar'}
                  </IonButton>
                  {draft.videoItems[key] ? (
                    <IonButton size="small" fill="clear" color="danger" onClick={() => removeVideo(target, key)}>
                      Remover
                    </IonButton>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="zt-handover-section">
          <div className="zt-handover-section__header">
            <h3>Danos</h3>
            <IonButton fill="outline" size="small" onClick={() => patchDraft(target, { damageItems: [...draft.damageItems, { type: '', zone: '', description: '', photo: null }] })}>
              <IonIcon icon={add} slot="start" />
              Adicionar
            </IonButton>
          </div>

          {draft.damageItems.length ? draft.damageItems.map((item, index) => (
            <div key={`${target}-damage-${index}`} className="zt-handover-damage-card">
              <IonItem lines="full">
                <IonLabel position="stacked">Tipo</IonLabel>
                <IonSelect value={item.type} onIonChange={(event) => setDamageField(target, index, { type: event.detail.value })} interface="popover">
                  {bootstrap?.damage_types.map((option) => (
                    <IonSelectOption key={option.value} value={option.value}>{option.label}</IonSelectOption>
                  ))}
                </IonSelect>
              </IonItem>
              <IonItem lines="full">
                <IonLabel position="stacked">Zona</IonLabel>
                <IonSelect value={item.zone} onIonChange={(event) => setDamageField(target, index, { zone: event.detail.value })} interface="popover">
                  {bootstrap?.vehicle_zones.map((option) => (
                    <IonSelectOption key={option.value} value={option.value}>{option.label}</IonSelectOption>
                  ))}
                </IonSelect>
              </IonItem>
              <IonItem lines="full">
                <IonLabel position="stacked">Descricao</IonLabel>
                <IonTextarea value={item.description} onIonInput={(event) => setDamageField(target, index, { description: String(event.detail.value || '') })} />
              </IonItem>
              <label className="zt-handover-upload">
                <IonIcon icon={documentText} />
                <span>{item.photo ? 'Foto anexada' : 'Adicionar foto opcional do dano'}</span>
                <input type="file" accept="image/*" capture="environment" onChange={(event) => void handleDamagePhoto(target, index, event.nativeEvent)} />
              </label>
              <IonButton fill="clear" color="danger" size="small" onClick={() => patchDraft(target, { damageItems: draft.damageItems.filter((_, itemIndex) => itemIndex !== index) })}>
                Remover dano
              </IonButton>
            </div>
          )) : (
            <p className="zt-task-desc">Sem danos registados.</p>
          )}
        </div>

        <div className="zt-handover-section">
          <h3>Fotos gerais</h3>
          <label className="zt-handover-upload">
            <IonIcon icon={carSport} />
            <span>{draft.generalPhotos.length ? `${draft.generalPhotos.length} foto(s) pronta(s)` : 'Adicionar fotos opcionais da viatura'}</span>
            <input type="file" accept="image/*" multiple capture="environment" onChange={(event) => void handleGeneralPhotos(target, event.nativeEvent)} />
          </label>
        </div>

        <IonItem lines="full">
          <IonLabel position="stacked">Observacoes</IonLabel>
          <IonTextarea value={draft.notes} onIonInput={(event) => patchDraft(target, { notes: String(event.detail.value || '') })} />
        </IonItem>

        <div className="zt-handover-signatures">
          <SignaturePad label="Assinatura do operador" value={draft.operatorSignature} onChange={(value) => patchDraft(target, { operatorSignature: value })} />
          <SignaturePad label="Assinatura do motorista" value={draft.driverSignature} onChange={(value) => patchDraft(target, { driverSignature: value })} />
        </div>
      </div>
    );
  };

  return (
    <>
      <IonCard className="zt-card zt-handover-card">
        <IonCardContent>
          <div className="zt-handover-card__header">
            <div>
              <strong>Entregas, recolhas &amp; trocas</strong>
              <p>Autos completos com motorista, matricula, evidencias, PDF e email.</p>
            </div>
            <div className="zt-handover-card__actions">
              <IonButton fill="clear" onClick={() => void loadBootstrap()}>
                <IonIcon icon={refresh} slot="icon-only" />
              </IonButton>
              <IonButton onClick={openCreateModal}>
                <IonIcon icon={add} slot="start" />
                Novo auto
              </IonButton>
            </div>
          </div>

          {isLoading ? (
            <div className="zt-ops-loading">
              <IonSpinner name="crescent" />
            </div>
          ) : error ? (
            <IonText color="danger">
              <p>{error}</p>
            </IonText>
          ) : bootstrap?.recent_procedures.length ? (
            <div className="zt-handover-list">
              {bootstrap.recent_procedures.map((procedure) => (
                <div key={procedure.id} className="zt-handover-list__item">
                  <div>
                    <div className="zt-task-topline">
                      <strong>{procedure.type_label} #{procedure.id}</strong>
                      <IonChip className={`zt-status-chip ${procedure.type === 'delivery' ? 'zt-status-chip--success' : 'zt-status-chip--warning'}`}>
                        {procedure.vehicle.license_plate || '-'}
                      </IonChip>
                    </div>
                    <p className="zt-task-desc">
                      {procedure.driver.name || 'Sem motorista'} · {procedure.performed_at_label || '-'}
                    </p>
                  </div>
                  <IonButton fill="outline" size="small" onClick={() => void openProcedure(procedure.id)}>
                    <IonIcon icon={eye} slot="start" />
                    Ver auto
                  </IonButton>
                </div>
              ))}
            </div>
          ) : (
            <p className="zt-task-desc">Sem procedimentos registados.</p>
          )}
        </IonCardContent>
      </IonCard>

      <IonModal isOpen={isCreateModalOpen} onDidDismiss={closeCreateModal} className="zt-task-modal zt-handover-modal">
        <div className="zt-task-modal__panel">
          <div className="zt-task-modal__header">
            <div>
              <h2>Novo auto</h2>
              <p>Escolhe o procedimento e regista as evidencias disponiveis.</p>
            </div>
            <IonButton fill="clear" onClick={closeCreateModal}>
              <IonIcon icon={close} slot="icon-only" />
            </IonButton>
          </div>

          <div className="zt-handover-form">
            <IonItem lines="full">
              <IonLabel position="stacked">Procedimento</IonLabel>
              <IonSelect value={flowMode} onIonChange={(event) => resetCreateState(event.detail.value)} interface="popover">
                <IonSelectOption value="delivery">Entrega</IonSelectOption>
                <IonSelectOption value="return">Recolha / devolucao</IonSelectOption>
                <IonSelectOption value="exchange">Troca de viatura</IonSelectOption>
              </IonSelect>
            </IonItem>

            {(flowMode === 'return' || flowMode === 'exchange') ? renderProcedureForm('return', flowMode === 'exchange' ? '1. Recolha da viatura atual' : 'Recolha da viatura') : null}
            {(flowMode === 'delivery' || flowMode === 'exchange') ? renderProcedureForm('delivery', flowMode === 'exchange' ? '2. Entrega da nova viatura' : 'Entrega da viatura') : null}

            {createError ? (
              <IonText color="danger">
                <p>{createError}</p>
              </IonText>
            ) : null}

            <IonButton expand="block" onClick={() => void submit()} disabled={isSubmitting}>
              {isSubmitting ? <IonSpinner name="crescent" /> : flowMode === 'exchange' ? 'Guardar troca completa' : 'Guardar procedimento'}
            </IonButton>
          </div>
        </div>
      </IonModal>

      <IonModal isOpen={Boolean(photoCaptureTarget)} onDidDismiss={cancelGuidedPhotoCapture} className="zt-task-modal zt-photo-recorder-modal">
        <div className="zt-task-modal__panel zt-photo-recorder">
          <div className="zt-task-modal__header">
            <div>
              <h2>Capturar foto</h2>
              <p>Mapa fotografico da viatura</p>
            </div>
            <IonButton fill="clear" onClick={cancelGuidedPhotoCapture}>
              <IonIcon icon={close} slot="icon-only" />
            </IonButton>
          </div>

          <video ref={photoPreviewRef} className="zt-photo-recorder__preview" muted playsInline autoPlay />

          {photoCaptureError ? (
            <IonText color="danger">
              <p>{photoCaptureError}</p>
            </IonText>
          ) : null}

          <div className="zt-photo-recorder__actions">
            <IonButton expand="block" onClick={() => void captureGuidedPhoto()}>
              <IonIcon icon={camera} slot="start" />
              Capturar foto
            </IonButton>
            <IonButton expand="block" fill="clear" onClick={cancelGuidedPhotoCapture}>
              Cancelar
            </IonButton>
          </div>
        </div>
      </IonModal>

      <IonModal isOpen={Boolean(videoCaptureTarget)} onDidDismiss={cancelVideoCapture} className="zt-task-modal zt-video-recorder-modal">
        <div className="zt-task-modal__panel zt-video-recorder">
          <div className="zt-task-modal__header">
            <div>
              <h2>Gravar video</h2>
              <p>
                {videoCaptureTarget?.key === 'interior' ? 'Interior' : 'Exterior'} · {videoCaptureSeconds}s / {VIDEO_MAX_SECONDS}s
              </p>
            </div>
            <IonButton fill="clear" onClick={cancelVideoCapture}>
              <IonIcon icon={close} slot="icon-only" />
            </IonButton>
          </div>

          <video ref={videoPreviewRef} className="zt-video-recorder__preview" muted playsInline autoPlay />

          {videoCaptureError ? (
            <IonText color="danger">
              <p>{videoCaptureError}</p>
            </IonText>
          ) : null}

          <div className="zt-video-recorder__actions">
            {isVideoRecording ? (
              <IonButton expand="block" color="danger" onClick={stopVideoRecording}>
                Parar e guardar
              </IonButton>
            ) : (
              <IonButton expand="block" onClick={beginVideoRecording}>
                <IonIcon icon={videocam} slot="start" />
                Comecar gravacao
              </IonButton>
            )}
            <IonButton expand="block" fill="clear" onClick={cancelVideoCapture}>
              Cancelar
            </IonButton>
          </div>
        </div>
      </IonModal>

      <IonModal isOpen={isDetailModalOpen} onDidDismiss={() => setIsDetailModalOpen(false)} className="zt-task-modal zt-handover-modal">
        <div className="zt-task-modal__panel">
          <div className="zt-task-modal__header">
            <div>
              <h2>Auto</h2>
              <p>{activeProcedure ? `${activeProcedure.type_label} #${activeProcedure.id}` : 'Documento do procedimento'}</p>
            </div>
            <IonButton fill="clear" onClick={() => setIsDetailModalOpen(false)}>
              <IonIcon icon={close} slot="icon-only" />
            </IonButton>
          </div>

          {isLoadingDetail ? (
            <div className="zt-ops-loading">
              <IonSpinner name="crescent" />
            </div>
          ) : detailError ? (
            <IonText color="danger">
              <p>{detailError}</p>
            </IonText>
          ) : activeProcedure ? (
            <div className="zt-handover-detail">
              {activeProcedure.pdf_url ? (
                <IonButton fill="outline" onClick={() => window.open(activeProcedure.pdf_url || '', '_blank', 'noopener,noreferrer')}>
                  <IonIcon icon={documentText} slot="start" />
                  Abrir PDF
                </IonButton>
              ) : null}
              <div
                className="zt-handover-html"
                dangerouslySetInnerHTML={{ __html: activeProcedure.html_snapshot || '<p>Sem documento HTML.</p>' }}
              />
            </div>
          ) : null}
        </div>
      </IonModal>
    </>
  );
};

export default VehicleHandoverPanel;
