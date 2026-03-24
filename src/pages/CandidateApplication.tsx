import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCheckbox,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonProgressBar,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { arrowBackOutline, cameraOutline, checkmarkCircle, cloudUploadOutline } from 'ionicons/icons';
import type { ChangeEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  fetchCandidateApplication,
  saveCandidateApplicationStep,
  submitCandidateApplication,
  type CandidateApplicationPayload,
  uploadCandidateApplicationFile,
} from '../lib/frontpage-api';
import { optimizeUploadFile, photoToOptimizedFile } from '../lib/upload-file-utils';
import type {
  CandidateApplicationBootstrap,
  CandidateApplicationDocument,
  CandidateApplicationRecord,
  VehicleType,
} from '../types/candidate';
import './CandidateApplication.css';

const steps = [
  { name: 'welcome', title: 'Boas-vindas', subtitle: 'Modelo Zentrum TVDE' },
  { name: 'vehicle', title: 'Escolha de viatura', subtitle: 'Selecione a viatura pretendida' },
  { name: 'rental', title: 'Condicoes de aluguer', subtitle: 'Leia e aceite' },
  { name: 'eligibility', title: 'Elegibilidade TVDE', subtitle: 'Requisitos' },
  { name: 'personal', title: 'Dados pessoais', subtitle: 'Contacto e identificacao' },
  { name: 'documents', title: 'Documentos', subtitle: 'Uploads obrigatorios' },
  { name: 'legal', title: 'Confirmacoes legais', subtitle: 'RGPD e autorizacoes' },
  { name: 'summary', title: 'Conclusao', subtitle: 'Revisao final' },
] as const;

const documentFields = [
  { field: 'document_id', label: 'Documento de identificacao' },
  { field: 'driver_license', label: 'Carta de conducao' },
  { field: 'tvde_certificate', label: 'Certificado TVDE' },
  { field: 'criminal_record', label: 'Registo criminal' },
] as const;

type WizardForm = {
  accepts_model: boolean;
  independent_driver: boolean;
  rental_terms_read: boolean;
  rental_terms_accept: boolean;
  has_tvde_course: '' | '1' | '0';
  certificate_valid: '' | '1' | '0';
  experience: string;
  platforms: string[];
  full_name: string;
  email: string;
  phone: string;
  nif: string;
  iban: string;
  rgpd: boolean;
  truth_declaration: boolean;
  contact_authorization: boolean;
  vehicle_type_id: string;
};

const emptyForm: WizardForm = {
  accepts_model: false,
  independent_driver: false,
  rental_terms_read: false,
  rental_terms_accept: false,
  has_tvde_course: '',
  certificate_valid: '',
  experience: '',
  platforms: [],
  full_name: '',
  email: '',
  phone: '',
  nif: '',
  iban: '',
  rgpd: false,
  truth_declaration: false,
  contact_authorization: false,
  vehicle_type_id: '',
};

const candidateTokenStorageKey = 'zentrum_candidate_token';

function mapApplicationToForm(application: CandidateApplicationRecord): WizardForm {
  return {
    accepts_model: Boolean(application.accepts_model),
    independent_driver: Boolean(application.independent_driver),
    rental_terms_read: Boolean(application.rental_terms_read),
    rental_terms_accept: Boolean(application.rental_terms_accept),
    has_tvde_course:
      application.has_tvde_course === null ? '' : application.has_tvde_course ? '1' : '0',
    certificate_valid:
      application.certificate_valid === null ? '' : application.certificate_valid ? '1' : '0',
    experience: application.experience ?? '',
    platforms: application.platforms ?? [],
    full_name: application.full_name ?? '',
    email: application.email ?? '',
    phone: application.phone ?? '',
    nif: application.nif ?? '',
    iban: application.iban ?? '',
    rgpd: Boolean(application.rgpd),
    truth_declaration: Boolean(application.truth_declaration),
    contact_authorization: Boolean(application.contact_authorization),
    vehicle_type_id: application.vehicle_type_id ? String(application.vehicle_type_id) : '',
  };
}

function toBooleanStringValue(value: WizardForm['has_tvde_course']): boolean | '' {
  if (value === '') {
    return '';
  }

  return value === '1';
}

function formatStatus(status: CandidateApplicationRecord['status']): string {
  if (status === 'submitted') {
    return 'Submetida';
  }

  if (status === 'incomplete') {
    return 'Incompleta';
  }

  return 'Rascunho';
}

const CandidateApplicationPage: React.FC = () => {
  const history = useHistory();
  const [bootstrap, setBootstrap] = useState<CandidateApplicationBootstrap | null>(null);
  const [form, setForm] = useState<WizardForm>(emptyForm);
  const [documents, setDocuments] = useState<Record<string, CandidateApplicationDocument[]>>({});
  const [token, setToken] = useState('');
  const [stepIndex, setStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [uploadingField, setUploadingField] = useState('');
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setErrorMessage('');

      try {
        const storedToken = window.localStorage.getItem(candidateTokenStorageKey) ?? undefined;
        const response = await fetchCandidateApplication(storedToken);

        if (cancelled) {
          return;
        }

        setBootstrap(response);
        setToken(response.application.token);
        window.localStorage.setItem(candidateTokenStorageKey, response.application.token);
        setForm(mapApplicationToForm(response.application));
        setDocuments(response.application.documents ?? {});
        const foundIndex = steps.findIndex((step) => step.name === response.application.current_step);
        setStepIndex(foundIndex >= 0 ? foundIndex : 0);
      } catch {
        if (!cancelled) {
          setErrorMessage('Nao foi possivel carregar a candidatura.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const progress = useMemo(() => (stepIndex + 1) / steps.length, [stepIndex]);
  const currentStep = steps[stepIndex];
  const selectedVehicle = bootstrap?.vehicle_types.find(
    (vehicle) => String(vehicle.id) === form.vehicle_type_id,
  );
  const statusLabel = bootstrap ? formatStatus(bootstrap.application.status) : 'Rascunho';

  const syncApplicationState = (application: CandidateApplicationRecord) => {
    setBootstrap((current) => (current ? { ...current, application } : current));
    setToken(application.token);
    window.localStorage.setItem(candidateTokenStorageKey, application.token);
    setDocuments(application.documents ?? {});
  };

  const buildPayload = (): CandidateApplicationPayload => ({
    token,
    accepts_model: form.accepts_model,
    independent_driver: form.independent_driver,
    rental_terms_read: form.rental_terms_read,
    rental_terms_accept: form.rental_terms_accept,
    has_tvde_course: toBooleanStringValue(form.has_tvde_course),
    certificate_valid: toBooleanStringValue(form.certificate_valid),
    experience: form.experience,
    platforms: form.platforms,
    full_name: form.full_name,
    email: form.email,
    phone: form.phone,
    nif: form.nif,
    iban: form.iban,
    rgpd: form.rgpd,
    truth_declaration: form.truth_declaration,
    contact_authorization: form.contact_authorization,
    vehicle_type_id: form.vehicle_type_id ? Number(form.vehicle_type_id) : '',
  });

  const updateForm = <K extends keyof WizardForm>(field: K, value: WizardForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
    setMessage('');
    setErrorMessage('');
  };

  const togglePlatform = (platform: string, checked: boolean) => {
    setForm((current) => ({
      ...current,
      platforms: checked
        ? [...current.platforms, platform]
        : current.platforms.filter((item) => item !== platform),
    }));
  };

  const validateStep = (step: string) => {
    if (step === 'welcome') {
      return form.accepts_model && form.independent_driver;
    }
    if (step === 'vehicle') {
      return Boolean(form.vehicle_type_id);
    }
    if (step === 'rental') {
      return form.rental_terms_read && form.rental_terms_accept;
    }
    if (step === 'eligibility') {
      return (
        form.has_tvde_course !== '' &&
        form.certificate_valid !== '' &&
        form.experience.trim() !== '' &&
        form.platforms.length > 0
      );
    }
    if (step === 'personal') {
      return (
        form.full_name.trim() !== '' &&
        form.email.trim() !== '' &&
        form.phone.trim() !== '' &&
        form.nif.trim() !== '' &&
        form.iban.trim() !== ''
      );
    }
    if (step === 'documents') {
      return documentFields.every((documentField) => (documents[documentField.field] ?? []).length > 0);
    }
    if (step === 'legal') {
      return form.rgpd && form.truth_declaration && form.contact_authorization;
    }

    return true;
  };

  const saveStep = async (stepName = currentStep.name) => {
    if (stepName !== 'summary' && !validateStep(stepName)) {
      setErrorMessage('Preencha todos os campos obrigatorios.');
      return false;
    }

    setSaving(true);
    setErrorMessage('');
    setMessage(stepName === 'summary' ? '' : 'A guardar...');

    try {
      const response = await saveCandidateApplicationStep({
        ...buildPayload(),
        step: stepName,
      });

      syncApplicationState(response.application);
      setMessage('Dados guardados.');
      return true;
    } catch {
      setErrorMessage('Nao foi possivel guardar este passo.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    const saved = await saveStep();
    if (saved && stepIndex < steps.length - 1) {
      setStepIndex((current) => current + 1);
    }
  };

  const handleSubmit = async () => {
    const requiredSteps = steps.map((step) => step.name).filter((step) => step !== 'summary');

    if (!requiredSteps.every((step) => validateStep(step))) {
      setErrorMessage('Preencha todos os campos obrigatorios antes de submeter.');
      return;
    }

    const saved = await saveStep('summary');
    if (!saved) {
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    setMessage('A submeter...');

    try {
      const response = await submitCandidateApplication(buildPayload());
      syncApplicationState(response.application);
      setMessage('Candidatura submetida com sucesso.');
      window.localStorage.removeItem(candidateTokenStorageKey);
    } catch {
      setErrorMessage('Nao foi possivel submeter a candidatura.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpload = async (field: string, files: FileList | null) => {
    if (!files?.length || !token) {
      return;
    }

    setUploadingField(field);
    setErrorMessage('');
    setMessage('A enviar ficheiros...');

    try {
      for (const file of Array.from(files)) {
        const optimizedFile = await optimizeUploadFile(file);
        const response = await uploadCandidateApplicationFile(token, field, optimizedFile);
        syncApplicationState(response.application);
      }
      setMessage('Ficheiro enviado.');
    } catch (caughtError) {
      setErrorMessage(
        caughtError instanceof Error
          ? caughtError.message
          : 'Nao foi possivel enviar o ficheiro.',
      );
    } finally {
      setUploadingField('');
      const input = fileInputs.current[field];
      if (input) {
        input.value = '';
      }
    }
  };

  const handleCapturePhoto = async (field: string) => {
    if (!token) {
      return;
    }

    setUploadingField(field);
    setErrorMessage('');
    setMessage('A preparar imagem...');

    try {
      const photo = await Camera.getPhoto({
        source: CameraSource.Camera,
        resultType: CameraResultType.Uri,
        quality: 90,
      });

      const file = await photoToOptimizedFile(photo, field);
      setMessage('A enviar ficheiro...');
      const response = await uploadCandidateApplicationFile(token, field, file);
      syncApplicationState(response.application);
      setMessage('Ficheiro enviado.');
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : 'Nao foi possivel usar a camera.';

      if (message.toLowerCase().includes('user cancelled')) {
        setMessage('');
      } else {
        setErrorMessage(message);
      }
    } finally {
      setUploadingField('');
    }
  };

  const renderStep = () => {
    if (currentStep.name === 'welcome') {
      return (
        <div className="zt-application-panel">
          <p>Conheca o modelo Zentrum TVDE antes de avancar.</p>
          <IonItem lines="none" className="zt-application-check">
            <IonCheckbox
              checked={form.accepts_model}
              onIonChange={(event) => updateForm('accepts_model', event.detail.checked)}
            />
            <IonLabel>Compreendo que a Zentrum TVDE nao celebra contratos de trabalho.</IonLabel>
          </IonItem>
          <IonItem lines="none" className="zt-application-check">
            <IonCheckbox
              checked={form.independent_driver}
              onIonChange={(event) => updateForm('independent_driver', event.detail.checked)}
            />
            <IonLabel>Pretendo avancar como motorista independente.</IonLabel>
          </IonItem>
        </div>
      );
    }

    if (currentStep.name === 'vehicle') {
      return (
        <div className="zt-application-vehicle-grid">
          {bootstrap?.vehicle_types.map((vehicle: VehicleType) => (
            <button
              key={vehicle.id}
              type="button"
              className={`zt-application-vehicle ${form.vehicle_type_id === String(vehicle.id) ? 'is-selected' : ''}`}
              onClick={() => updateForm('vehicle_type_id', String(vehicle.id))}
            >
              <strong>{vehicle.brand} {vehicle.model}</strong>
              <span>{vehicle.version || 'Versao padrao'}</span>
              <span>Aluguer semanal: EUR {vehicle.weekly_rental_price}</span>
            </button>
          ))}
        </div>
      );
    }

    if (currentStep.name === 'rental') {
      return (
        <div className="zt-application-stack">
          <div className="zt-application-grid">
            <div className="zt-application-panel">
              <h3>Condicoes chave</h3>
              <ul>
                <li>Aluguer com manutencao incluida</li>
                <li>Seguro e assistencia 24/7</li>
                <li>Faturacao transparente</li>
              </ul>
            </div>
            <div className="zt-application-panel">
              <h3>O que esperamos</h3>
              <ul>
                <li>Profissionalismo e pontualidade</li>
                <li>Respeito pelas plataformas</li>
                <li>Comunicacao clara com a equipa</li>
              </ul>
            </div>
          </div>
          <IonItem lines="none" className="zt-application-check">
            <IonCheckbox
              checked={form.rental_terms_read}
              onIonChange={(event) => updateForm('rental_terms_read', event.detail.checked)}
            />
            <IonLabel>Li e compreendi as condicoes.</IonLabel>
          </IonItem>
          <IonItem lines="none" className="zt-application-check">
            <IonCheckbox
              checked={form.rental_terms_accept}
              onIonChange={(event) => updateForm('rental_terms_accept', event.detail.checked)}
            />
            <IonLabel>Aceito avancar com base nestas condicoes.</IonLabel>
          </IonItem>
        </div>
      );
    }

    if (currentStep.name === 'eligibility') {
      return (
        <div className="zt-application-grid">
          <IonItem className="zt-application-field">
            <IonLabel position="stacked">Tem curso TVDE?</IonLabel>
            <IonSelect
              value={form.has_tvde_course}
              onIonChange={(event) => updateForm('has_tvde_course', event.detail.value)}
            >
              <IonSelectOption value="">Selecione</IonSelectOption>
              <IonSelectOption value="1">Sim</IonSelectOption>
              <IonSelectOption value="0">Nao</IonSelectOption>
            </IonSelect>
          </IonItem>
          <IonItem className="zt-application-field">
            <IonLabel position="stacked">Certificado valido?</IonLabel>
            <IonSelect
              value={form.certificate_valid}
              onIonChange={(event) => updateForm('certificate_valid', event.detail.value)}
            >
              <IonSelectOption value="">Selecione</IonSelectOption>
              <IonSelectOption value="1">Sim</IonSelectOption>
              <IonSelectOption value="0">Nao</IonSelectOption>
            </IonSelect>
          </IonItem>
          <IonItem className="zt-application-field zt-application-field--full">
            <IonLabel position="stacked">Experiencia anterior</IonLabel>
            <IonInput
              value={form.experience}
              placeholder="Anos, cidades, plataformas"
              onIonInput={(event) => updateForm('experience', event.detail.value ?? '')}
            />
          </IonItem>
          <div className="zt-application-field zt-application-field--full">
            <span className="zt-application-label">Plataformas</span>
            <div className="zt-application-platforms">
              {['Uber', 'Bolt', 'Outra'].map((platform) => (
                <IonItem lines="none" className="zt-application-check" key={platform}>
                  <IonCheckbox
                    checked={form.platforms.includes(platform)}
                    onIonChange={(event) => togglePlatform(platform, event.detail.checked)}
                  />
                  <IonLabel>{platform}</IonLabel>
                </IonItem>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (currentStep.name === 'personal') {
      return (
        <div className="zt-application-grid">
          <IonItem className="zt-application-field">
            <IonLabel position="stacked">Nome completo</IonLabel>
            <IonInput value={form.full_name} onIonInput={(event) => updateForm('full_name', event.detail.value ?? '')} />
          </IonItem>
          <IonItem className="zt-application-field">
            <IonLabel position="stacked">Email</IonLabel>
            <IonInput type="email" value={form.email} onIonInput={(event) => updateForm('email', event.detail.value ?? '')} />
          </IonItem>
          <IonItem className="zt-application-field">
            <IonLabel position="stacked">Telemovel</IonLabel>
            <IonInput value={form.phone} onIonInput={(event) => updateForm('phone', event.detail.value ?? '')} />
          </IonItem>
          <IonItem className="zt-application-field">
            <IonLabel position="stacked">NIF</IonLabel>
            <IonInput value={form.nif} onIonInput={(event) => updateForm('nif', event.detail.value ?? '')} />
          </IonItem>
          <IonItem className="zt-application-field zt-application-field--full">
            <IonLabel position="stacked">IBAN</IonLabel>
            <IonInput
              value={form.iban}
              placeholder="PT50 0000 0000 0000 0000 0000 0"
              onIonInput={(event) => updateForm('iban', event.detail.value ?? '')}
            />
          </IonItem>
        </div>
      );
    }

    if (currentStep.name === 'documents') {
      return (
        <div className="zt-application-grid">
          {documentFields.map((documentField) => (
            <div className="zt-application-upload" key={documentField.field}>
              <strong>{documentField.label}</strong>
              <p>Limite 10MB por ficheiro.</p>
              <input
                ref={(element) => {
                  fileInputs.current[documentField.field] = element;
                }}
                type="file"
                className="zt-application-file-input"
                multiple
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  void handleUpload(documentField.field, event.target.files)
                }
              />
              <div className="zt-application-upload-actions">
                <IonButton
                  fill="outline"
                  onClick={() => void handleCapturePhoto(documentField.field)}
                  disabled={uploadingField === documentField.field}
                >
                  <IonIcon icon={cameraOutline} slot="start" />
                  {uploadingField === documentField.field ? 'A enviar' : 'Camera'}
                </IonButton>
                <IonButton
                  fill="outline"
                  onClick={() => fileInputs.current[documentField.field]?.click()}
                  disabled={uploadingField === documentField.field}
                >
                  <IonIcon icon={cloudUploadOutline} slot="start" />
                  {uploadingField === documentField.field ? 'A enviar' : 'Selecionar ficheiro'}
                </IonButton>
              </div>
              <IonList inset={false} className="zt-application-doc-list">
                {(documents[documentField.field] ?? []).map((document) => (
                  <IonItem lines="none" key={`${documentField.field}-${document.path}`}>
                    <IonIcon icon={checkmarkCircle} color="success" slot="start" />
                    <IonLabel>{document.name}</IonLabel>
                  </IonItem>
                ))}
              </IonList>
            </div>
          ))}
        </div>
      );
    }

    if (currentStep.name === 'legal') {
      return (
        <div className="zt-application-stack">
          <IonItem lines="none" className="zt-application-check">
            <IonCheckbox checked={form.rgpd} onIonChange={(event) => updateForm('rgpd', event.detail.checked)} />
            <IonLabel>Li e aceito o tratamento de dados.</IonLabel>
          </IonItem>
          <IonItem lines="none" className="zt-application-check">
            <IonCheckbox
              checked={form.truth_declaration}
              onIonChange={(event) => updateForm('truth_declaration', event.detail.checked)}
            />
            <IonLabel>Declaro que as informacoes sao verdadeiras.</IonLabel>
          </IonItem>
          <IonItem lines="none" className="zt-application-check">
            <IonCheckbox
              checked={form.contact_authorization}
              onIonChange={(event) => updateForm('contact_authorization', event.detail.checked)}
            />
            <IonLabel>Autorizo contacto pela equipa Zentrum.</IonLabel>
          </IonItem>
        </div>
      );
    }

    return (
      <div className="zt-application-panel">
        <h3>Resumo</h3>
        <p>Revise os dados antes de submeter.</p>
        <ul className="zt-application-summary">
          <li>Nome: {form.full_name || '-'}</li>
          <li>Email: {form.email || '-'}</li>
          <li>Telemovel: {form.phone || '-'}</li>
          <li>NIF: {form.nif || '-'}</li>
          <li>IBAN: {form.iban || '-'}</li>
          <li>Viatura: {selectedVehicle ? `${selectedVehicle.brand} ${selectedVehicle.model}` : '-'}</li>
        </ul>
      </div>
    );
  };

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonButton fill="clear" slot="start" onClick={() => history.goBack()}>
            <IonIcon icon={arrowBackOutline} slot="icon-only" />
          </IonButton>
          <IonTitle>Candidatura online</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="zt-application-page">
        {loading ? (
          <div className="zt-application-loading">
            <IonSpinner name="crescent" />
          </div>
        ) : errorMessage && !bootstrap ? (
          <div className="zt-application-loading">
            <p>{errorMessage}</p>
            <IonButton onClick={() => window.location.reload()}>Tentar novamente</IonButton>
          </div>
        ) : bootstrap ? (
          <div className="zt-application-shell">
            <img
              src="https://zentrum-tvde.com/website/assets/header-candidatura.png"
              alt="Candidatura Zentrum TVDE"
              className="zt-application-hero"
            />

            <div className="zt-application-head">
              <div>
                <p>Zentrum TVDE</p>
                <h1>Candidatura online</h1>
              </div>
              <IonBadge color="success">{statusLabel}</IonBadge>
            </div>

            <IonCard className="zt-card">
              <IonCardContent>
                <div className="zt-application-meta">
                  <small>Passo {stepIndex + 1} de {steps.length}</small>
                  <small>{currentStep.title}</small>
                </div>
                <IonProgressBar value={progress} />

                <div className="zt-application-step-head">
                  <div className="zt-application-step-index">{stepIndex + 1}</div>
                  <div>
                    <h2>{currentStep.title}</h2>
                    <p>{currentStep.subtitle}</p>
                  </div>
                </div>

                {renderStep()}

                {message ? <p className="zt-application-message">{message}</p> : null}
                {errorMessage ? <p className="zt-application-error">{errorMessage}</p> : null}

                <div className="zt-application-actions">
                  <IonButton
                    fill="outline"
                    onClick={() => setStepIndex((current) => Math.max(current - 1, 0))}
                    disabled={stepIndex === 0 || saving || submitting}
                  >
                    Voltar
                  </IonButton>
                  <IonButton
                    onClick={() => void (stepIndex === steps.length - 1 ? handleSubmit() : handleNext())}
                    disabled={saving || submitting}
                  >
                    {saving || submitting ? <IonSpinner name="crescent" /> : stepIndex === steps.length - 1 ? 'Submeter candidatura' : 'Avancar'}
                  </IonButton>
                </div>
              </IonCardContent>
            </IonCard>
          </div>
        ) : null}
      </IonContent>
    </IonPage>
  );
};

export default CandidateApplicationPage;
