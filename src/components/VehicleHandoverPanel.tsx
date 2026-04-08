import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
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
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonText,
  IonTextarea,
} from '@ionic/react';
import { add, carSport, close, documentText, eye, refresh } from 'ionicons/icons';
import { useEffect, useMemo, useState } from 'react';
import {
  createVehicleHandover,
  fetchVehicleHandover,
  fetchVehicleHandoversBootstrap,
} from '../lib/frontpage-api';
import { photoToOptimizedFile } from '../lib/upload-file-utils';
import type {
  VehicleHandoverBootstrapPayload,
  VehicleHandoverCreatePayload,
  VehicleHandoverDetail,
} from '../types/handover';
import SignaturePad from './SignaturePad';
import VehicleInspectionMap from './VehicleInspectionMap';

type VehicleHandoverPanelProps = {
  token: string | null;
};

type DamageDraft = {
  type: string;
  zone: string;
  description: string;
  photo: string | null;
};

async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Nao foi possivel ler o ficheiro.'));
    reader.readAsDataURL(file);
  });
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

  const [type, setType] = useState<'delivery' | 'return'>('delivery');
  const [selectionMode, setSelectionMode] = useState<'vehicle' | 'driver'>('vehicle');
  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [driverId, setDriverId] = useState<number | null>(null);
  const [performedAt, setPerformedAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [checklistState, setChecklistState] = useState<Record<string, { checked: boolean; value: string }>>({});
  const [damageItems, setDamageItems] = useState<DamageDraft[]>([]);
  const [generalPhotos, setGeneralPhotos] = useState<string[]>([]);
  const [guidedPhotoItems, setGuidedPhotoItems] = useState<Record<string, string | null>>({});
  const [notes, setNotes] = useState('');
  const [operatorSignature, setOperatorSignature] = useState('');
  const [driverSignature, setDriverSignature] = useState('');

  const selectedVehicle = useMemo(
    () => bootstrap?.vehicles.find((vehicle) => vehicle.id === vehicleId) ?? null,
    [bootstrap?.vehicles, vehicleId],
  );

  const selectedDriver = useMemo(
    () => bootstrap?.drivers.find((driver) => driver.id === driverId) ?? null,
    [bootstrap?.drivers, driverId],
  );

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
      setChecklistState(
        Object.fromEntries(
          payload.checklist_items.map((item) => [item.key, { checked: false, value: '' }]),
        ),
      );
      setGuidedPhotoItems(
        Object.fromEntries(
          payload.guided_photo_zones.map((zone) => [zone.key, null]),
        ),
      );
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
    if (!bootstrap) {
      return;
    }

    if (selectionMode === 'vehicle' && selectedVehicle?.current_driver_id) {
      setDriverId(selectedVehicle.current_driver_id);
    }

    if (selectionMode === 'driver' && selectedDriver?.current_vehicle_id) {
      setVehicleId(selectedDriver.current_vehicle_id);
    }
  }, [bootstrap, selectedDriver?.current_vehicle_id, selectedVehicle?.current_driver_id, selectionMode]);

  const resetCreateState = () => {
    setType('delivery');
    setSelectionMode('vehicle');
    setVehicleId(null);
    setDriverId(null);
    setPerformedAt(new Date().toISOString().slice(0, 16));
    setChecklistState(
      Object.fromEntries(
        (bootstrap?.checklist_items ?? []).map((item) => [item.key, { checked: false, value: '' }]),
      ),
    );
    setDamageItems([]);
    setGeneralPhotos([]);
    setGuidedPhotoItems(
      Object.fromEntries(
        (bootstrap?.guided_photo_zones ?? []).map((zone) => [zone.key, null]),
      ),
    );
    setNotes('');
    setOperatorSignature('');
    setDriverSignature('');
    setCreateError('');
  };

  const openCreateModal = () => {
    resetCreateState();
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
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

  const updateChecklist = (key: string, patch: Partial<{ checked: boolean; value: string }>) => {
    setChecklistState((current) => ({
      ...current,
      [key]: {
        checked: current[key]?.checked ?? false,
        value: current[key]?.value ?? '',
        ...patch,
      },
    }));
  };

  const setDamageField = (index: number, patch: Partial<DamageDraft>) => {
    setDamageItems((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  };

  useEffect(() => {
    if (!bootstrap?.guided_photo_zones.length) {
      return;
    }

    const allRequiredZonesCompleted = bootstrap.guided_photo_zones
      .filter((zone) => zone.required)
      .every((zone) => Boolean(guidedPhotoItems[zone.key]));

    setChecklistState((current) => ({
      ...current,
      photos_inside_outside: {
        checked: allRequiredZonesCompleted,
        value: current.photos_inside_outside?.value ?? '',
      },
    }));
  }, [bootstrap?.guided_photo_zones, guidedPhotoItems]);

  const handleGeneralPhotos = async (event: Event) => {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    const urls = await Promise.all(files.map((file) => fileToDataUrl(file)));
    setGeneralPhotos(urls);
  };

  const handleDamagePhoto = async (index: number, event: Event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    const dataUrl = await fileToDataUrl(file);
    setDamageField(index, { photo: dataUrl });
  };

  const handleGuidedPhotoCapture = async (zoneKey: string) => {
    try {
      const photo = await Camera.getPhoto({
        source: CameraSource.Camera,
        resultType: CameraResultType.Uri,
        quality: 90,
      });

      const file = await photoToOptimizedFile(photo, zoneKey);
      const dataUrl = await fileToDataUrl(file);
      setGuidedPhotoItems((current) => ({
        ...current,
        [zoneKey]: dataUrl,
      }));
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Nao foi possivel usar a camera.';

      if (!message.toLowerCase().includes('user cancelled')) {
        setCreateError(message);
      }
    }
  };

  const submit = async () => {
    if (!token || !bootstrap) {
      setCreateError('Sessao invalida.');
      return;
    }

    if (!vehicleId || !driverId) {
      setCreateError('Seleciona a viatura e o motorista.');
      return;
    }

    if (!operatorSignature || !driverSignature) {
      setCreateError('As duas assinaturas sao obrigatorias.');
      return;
    }

    for (const item of bootstrap.checklist_items) {
      const state = checklistState[item.key];

      if (!state?.checked) {
        setCreateError(`Confirma o item "${item.label}".`);
        return;
      }

      if (item.requires_value && !state.value.trim()) {
        setCreateError(`Preenche o valor de "${item.label}".`);
        return;
      }
    }

    const payload: VehicleHandoverCreatePayload = {
      type,
      vehicle_id: vehicleId,
      driver_id: driverId,
      performed_at: performedAt,
      checklist_payload: Object.fromEntries(
        Object.entries(checklistState).map(([key, value]) => [key, { checked: value.checked, value: value.value || null }]),
      ),
      damage_items: damageItems
        .filter((item) => item.type && item.zone)
        .map((item) => ({
          type: item.type,
          zone: item.zone,
          description: item.description,
          photo: item.photo,
        })),
      guided_photo_items: Object.fromEntries(
        Object.entries(guidedPhotoItems).map(([key, value]) => [key, { photo: value }]),
      ),
      general_photos: generalPhotos,
      notes,
      operator_signature_data_url: operatorSignature,
      driver_signature_data_url: driverSignature,
    };

    setIsSubmitting(true);
    setCreateError('');

    try {
      const procedure = await createVehicleHandover(token, payload);
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

  return (
    <>
      <IonCard className="zt-card zt-handover-card">
        <IonCardContent>
          <div className="zt-handover-card__header">
            <div>
              <strong>Entregas &amp; devolucoes</strong>
              <p>Regista autos com checklist, danos, fotos opcionais e assinaturas conjuntas.</p>
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
              <p>Entrega ou devolucao com historico completo.</p>
            </div>
            <IonButton fill="clear" onClick={closeCreateModal}>
              <IonIcon icon={close} slot="icon-only" />
            </IonButton>
          </div>

          <div className="zt-handover-form">
            <IonItem lines="full">
              <IonLabel position="stacked">Tipo</IonLabel>
              <IonSelect value={type} onIonChange={(event) => setType(event.detail.value)} interface="popover">
                <IonSelectOption value="delivery">Entrega</IonSelectOption>
                <IonSelectOption value="return">Devolucao</IonSelectOption>
              </IonSelect>
            </IonItem>

            <IonItem lines="full">
              <IonLabel position="stacked">Comecar por</IonLabel>
              <IonSelect value={selectionMode} onIonChange={(event) => setSelectionMode(event.detail.value)} interface="popover">
                <IonSelectOption value="vehicle">Viatura</IonSelectOption>
                <IonSelectOption value="driver">Motorista</IonSelectOption>
              </IonSelect>
            </IonItem>

            <IonItem lines="full">
              <IonLabel position="stacked">Viatura</IonLabel>
              <IonSelect value={vehicleId} onIonChange={(event) => setVehicleId(Number(event.detail.value))} interface="popover">
                {bootstrap?.vehicles.map((vehicle) => (
                  <IonSelectOption key={vehicle.id} value={vehicle.id}>
                    {vehicle.display_name}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>

            <IonItem lines="full">
              <IonLabel position="stacked">Motorista</IonLabel>
              <IonSelect value={driverId} onIonChange={(event) => setDriverId(Number(event.detail.value))} interface="popover">
                {bootstrap?.drivers.map((driver) => (
                  <IonSelectOption key={driver.id} value={driver.id}>
                    {driver.display_name}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>

            <IonItem lines="full">
              <IonLabel position="stacked">Data e hora</IonLabel>
              <IonInput type="datetime-local" value={performedAt} onIonInput={(event) => setPerformedAt(String(event.detail.value || ''))} />
            </IonItem>

            {!!selectedVehicle && (
              <IonNote className="zt-handover-note">
                Estado da viatura: {selectedVehicle.status_label}
                {selectedVehicle.current_driver_name ? ` · Motorista atual ${selectedVehicle.current_driver_name}` : ''}
              </IonNote>
            )}

            {!!selectedDriver?.current_vehicle_license_plate && (
              <IonNote className="zt-handover-note">
                Viatura atual do motorista: {selectedDriver.current_vehicle_license_plate}
              </IonNote>
            )}

            <div className="zt-handover-section">
              <h3>Checklist</h3>
              {bootstrap?.checklist_items.filter((item) => item.key !== 'photos_inside_outside').map((item) => (
                <div key={item.key} className="zt-handover-checklist-row">
                  <label className="zt-handover-checklist-row__label">
                    <input
                      type="checkbox"
                      checked={checklistState[item.key]?.checked ?? false}
                      onChange={(event) => updateChecklist(item.key, { checked: event.target.checked })}
                    />
                    <span>{item.label}</span>
                  </label>
                  {item.requires_value ? (
                    <IonInput
                      value={checklistState[item.key]?.value ?? ''}
                      placeholder={item.value_label || 'Valor'}
                      onIonInput={(event) => updateChecklist(item.key, { value: String(event.detail.value || '') })}
                    />
                  ) : null}
                </div>
              ))}
            </div>

            <div className="zt-handover-section">
              <div className="zt-handover-section__header">
                <h3>Mapa fotografico da viatura</h3>
                <IonChip className={`zt-status-chip ${checklistState.photos_inside_outside?.checked ? 'zt-status-chip--success' : 'zt-status-chip--warning'}`}>
                  {checklistState.photos_inside_outside?.checked ? 'Completo' : 'Em falta'}
                </IonChip>
              </div>

              {bootstrap?.guided_photo_zones.length ? (
                <VehicleInspectionMap
                  zones={bootstrap.guided_photo_zones}
                  photosByZone={guidedPhotoItems}
                  onCapture={(zoneKey) => void handleGuidedPhotoCapture(zoneKey)}
                />
              ) : null}
            </div>

            <div className="zt-handover-section">
              <div className="zt-handover-section__header">
                <h3>Danos</h3>
                <IonButton fill="outline" size="small" onClick={() => setDamageItems((current) => [...current, { type: '', zone: '', description: '', photo: null }])}>
                  <IonIcon icon={add} slot="start" />
                  Adicionar
                </IonButton>
              </div>

              {damageItems.length ? damageItems.map((item, index) => (
                <div key={`damage-${index}`} className="zt-handover-damage-card">
                  <IonItem lines="full">
                    <IonLabel position="stacked">Tipo</IonLabel>
                    <IonSelect value={item.type} onIonChange={(event) => setDamageField(index, { type: event.detail.value })} interface="popover">
                      {bootstrap?.damage_types.map((option) => (
                        <IonSelectOption key={option.value} value={option.value}>{option.label}</IonSelectOption>
                      ))}
                    </IonSelect>
                  </IonItem>
                  <IonItem lines="full">
                    <IonLabel position="stacked">Zona</IonLabel>
                    <IonSelect value={item.zone} onIonChange={(event) => setDamageField(index, { zone: event.detail.value })} interface="popover">
                      {bootstrap?.vehicle_zones.map((option) => (
                        <IonSelectOption key={option.value} value={option.value}>{option.label}</IonSelectOption>
                      ))}
                    </IonSelect>
                  </IonItem>
                  <IonItem lines="full">
                    <IonLabel position="stacked">Descricao</IonLabel>
                    <IonTextarea value={item.description} onIonInput={(event) => setDamageField(index, { description: String(event.detail.value || '') })} />
                  </IonItem>
                  <label className="zt-handover-upload">
                    <IonIcon icon={documentText} />
                    <span>{item.photo ? 'Foto anexada' : 'Adicionar foto opcional do dano'}</span>
                    <input type="file" accept="image/*" capture="environment" onChange={(event) => void handleDamagePhoto(index, event.nativeEvent)} />
                  </label>
                  <IonButton fill="clear" color="danger" size="small" onClick={() => setDamageItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
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
                <span>{generalPhotos.length ? `${generalPhotos.length} foto(s) pronta(s)` : 'Adicionar fotos opcionais da viatura'}</span>
                <input type="file" accept="image/*" multiple capture="environment" onChange={(event) => void handleGeneralPhotos(event.nativeEvent)} />
              </label>
            </div>

            <IonItem lines="full">
              <IonLabel position="stacked">Observacoes</IonLabel>
              <IonTextarea value={notes} onIonInput={(event) => setNotes(String(event.detail.value || ''))} />
            </IonItem>

            <div className="zt-handover-signatures">
              <SignaturePad label="Assinatura do operador" value={operatorSignature} onChange={setOperatorSignature} />
              <SignaturePad label="Assinatura do motorista" value={driverSignature} onChange={setDriverSignature} />
            </div>

            {createError ? (
              <IonText color="danger">
                <p>{createError}</p>
              </IonText>
            ) : null}

            <IonButton expand="block" onClick={() => void submit()} disabled={isSubmitting}>
              {isSubmitting ? <IonSpinner name="crescent" /> : 'Guardar procedimento'}
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
