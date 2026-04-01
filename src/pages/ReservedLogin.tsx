import {
  IonButton,
  IonCard,
  IonCardContent,
  IonIcon,
  IonSpinner,
  IonContent,
  IonInput,
  IonItem,
  IonLabel,
  IonPage,
  IonText,
} from '@ionic/react';
import { eye, eyeOff } from 'ionicons/icons';
import { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './ReservedArea.css';

const ReservedLogin: React.FC = () => {
  const history = useHistory();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (isSubmitting) {
      return;
    }

    if (email.trim() === '' || password.trim() === '') {
      setError('Preencha email e password para entrar.');
      return;
    }

    setIsSubmitting(true);

    try {
      await login(email, password);
      setError('');
      history.replace('/reserved');
    } catch (exception) {
      const message =
        exception instanceof Error
          ? exception.message
          : ((exception as { errors?: Record<string, string[]>; message?: string } | null)?.errors?.email?.[0] ??
            (exception as { message?: string } | null)?.message ??
            'Nao foi possivel validar o acesso.');

      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }

    window.location.assign('/tabs/home');
  };

  return (
    <IonPage>
      <IonContent fullscreen className="zt-reserved-page">
        <div className="zt-reserved-shell">
          <IonCard className="zt-card zt-reserved-card">
            <IonCardContent>
              <div className="zt-reserved-close">
                <button type="button" className="zt-reserved-close-btn" onClick={handleClose}>
                  x
                </button>
              </div>

              <div className="zt-reserved-brand">
                <img src="/assets/logo.svg" alt="Zentrum TVDE" />
                <h1>Area reservada</h1>
                <p>Acesso interno da app Zentrum TVDE.</p>
              </div>

              <div className="zt-reserved-form">
                <IonItem className="zt-reserved-field">
                  <IonLabel position="stacked">Email</IonLabel>
                  <IonInput
                    type="email"
                    value={email}
                    onIonInput={(event) => setEmail(event.detail.value ?? '')}
                  />
                </IonItem>
                <IonItem className="zt-reserved-field">
                  <IonLabel position="stacked">Password</IonLabel>
                  <IonInput
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onIonInput={(event) => setPassword(event.detail.value ?? '')}
                  />
                  <button
                    type="button"
                    className="zt-password-toggle"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? 'Esconder password' : 'Mostrar password'}
                  >
                    <IonIcon icon={showPassword ? eyeOff : eye} />
                  </button>
                </IonItem>

                {error ? (
                  <IonText color="danger">
                    <p className="zt-reserved-error">{error}</p>
                  </IonText>
                ) : null}

                <IonButton expand="block" onClick={handleLogin} disabled={isSubmitting}>
                  {isSubmitting ? <IonSpinner name="crescent" /> : 'Entrar'}
                </IonButton>
              </div>
            </IonCardContent>
          </IonCard>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ReservedLogin;
