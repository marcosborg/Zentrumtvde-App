import { IonButton, IonButtons, IonCard, IonCardContent, IonContent, IonHeader, IonInput, IonItem, IonLabel, IonModal, IonNote, IonSpinner, IonText, IonTextarea, IonTitle, IonToolbar } from '@ionic/react';
import { useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import AppShell from '../components/AppShell';
import DataState from '../components/DataState';
import { useFrontpageData } from '../context/FrontpageDataContext';
import { submitContactForm } from '../lib/frontpage-api';
import './SectionPage.css';

const CmsPage: React.FC = () => {
  const history = useHistory();
  const { pageId } = useParams<{ pageId: string }>();
  const { data, loading, error, refresh } = useFrontpageData();
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    message: '',
  });

  const page = useMemo(
    () => data?.cms_pages.find((item) => String(item.id) === String(pageId)) ?? null,
    [data, pageId],
  );

  const isContactPage = page?.slug === 'contactos';

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      if (!current[field]?.length) {
        return current;
      }

      return {
        ...current,
        [field]: [],
      };
    });
    setErrorMessage('');
  };

  const resetForm = () => {
    setForm({
      name: '',
      phone: '',
      email: '',
      message: '',
    });
    setFieldErrors({});
    setErrorMessage('');
  };

  const handleCloseModal = () => {
    setIsContactModalOpen(false);
    setIsSubmitting(false);
    setSuccessMessage('');
    resetForm();
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrorMessage('');
    setFieldErrors({});
    setSuccessMessage('');

    try {
      const response = await submitContactForm(form);
      setSuccessMessage(response.message);
      resetForm();
    } catch (submissionError) {
      const payload =
        typeof submissionError === 'object' && submissionError !== null
          ? (submissionError as { message?: string; errors?: Record<string, string[]> })
          : null;

      setErrorMessage(payload?.message || 'Nao foi possivel enviar o pedido.');
      setFieldErrors(payload?.errors || {});
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell title={page?.title || 'Pagina'} subtitle="">
      <DataState loading={loading} error={error} onRetry={refresh} />

      {!data || !page ? null : (
        <div className="zt-stack">
          <IonCard className="zt-card zt-hero-card">
            <IonCardContent>
              <div className="zt-hero-layout">
                <div className="zt-hero-copy">
                  <h2>{page.title}</h2>
                  {page.highlight ? <p>{page.highlight}</p> : null}
                </div>
                <div className="zt-hero-media">
                  <img className="zt-hero-image" src={page.image_url} alt={page.title} />

                  {isContactPage ? (
                    <div className="zt-contact-cta zt-contact-cta--hero">
                      <IonButton onClick={() => setIsContactModalOpen(true)}>Pedir contacto</IonButton>
                      <IonButton fill="outline" onClick={() => history.push('/tabs/application')}>
                        Preencher candidatura
                      </IonButton>
                    </div>
                  ) : null}
                </div>
              </div>
            </IonCardContent>
          </IonCard>

          <IonCard className="zt-card">
            <IonCardContent>
              <div className="zt-rich-content" dangerouslySetInnerHTML={{ __html: page.body }} />
            </IonCardContent>
          </IonCard>
        </div>
      )}

      <IonModal isOpen={isContactModalOpen} onDidDismiss={handleCloseModal}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Pronto para comecar?</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={handleCloseModal}>Fechar</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>

        <IonContent className="ion-padding">
          <div className="zt-contact-form">
            <IonItem lines="none" className="zt-contact-field">
              <IonLabel position="stacked">Nome</IonLabel>
              <IonInput
                value={form.name}
                placeholder="O seu nome"
                onIonInput={(event) => updateField('name', event.detail.value ?? '')}
              />
            </IonItem>
            {fieldErrors.name?.length ? (
              <IonNote color="danger">{fieldErrors.name[0]}</IonNote>
            ) : null}

            <IonItem lines="none" className="zt-contact-field">
              <IonLabel position="stacked">Telefone</IonLabel>
              <IonInput
                value={form.phone}
                placeholder="O seu telefone"
                onIonInput={(event) => updateField('phone', event.detail.value ?? '')}
              />
            </IonItem>
            {fieldErrors.phone?.length ? (
              <IonNote color="danger">{fieldErrors.phone[0]}</IonNote>
            ) : null}

            <IonItem lines="none" className="zt-contact-field">
              <IonLabel position="stacked">Email</IonLabel>
              <IonInput
                type="email"
                value={form.email}
                placeholder="O seu email"
                onIonInput={(event) => updateField('email', event.detail.value ?? '')}
              />
            </IonItem>
            {fieldErrors.email?.length ? (
              <IonNote color="danger">{fieldErrors.email[0]}</IonNote>
            ) : null}

            <IonItem lines="none" className="zt-contact-field">
              <IonLabel position="stacked">Mensagem</IonLabel>
              <IonTextarea
                value={form.message}
                rows={5}
                placeholder="Escreva a sua mensagem aqui"
                onIonInput={(event) => updateField('message', event.detail.value ?? '')}
              />
            </IonItem>
            {fieldErrors.message?.length ? (
              <IonNote color="danger">{fieldErrors.message[0]}</IonNote>
            ) : null}

            {errorMessage ? (
              <IonText color="danger">
                <p className="zt-contact-feedback">{errorMessage}</p>
              </IonText>
            ) : null}

            {successMessage ? (
              <IonText color="success">
                <p className="zt-contact-feedback">{successMessage}</p>
              </IonText>
            ) : null}

            <IonButton expand="block" onClick={() => void handleSubmit()} disabled={isSubmitting}>
              {isSubmitting ? <IonSpinner name="crescent" /> : 'Enviar'}
            </IonButton>
          </div>
        </IonContent>
      </IonModal>
    </AppShell>
  );
};

export default CmsPage;
