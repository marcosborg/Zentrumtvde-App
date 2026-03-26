import {
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonInput,
  IonItem,
  IonLabel,
  IonPage,
  IonText,
} from '@ionic/react';
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

  const handleLogin = () => {
    const ok = login(email, password);

    if (!ok) {
      setError('Preencha email e password para entrar.');
      return;
    }

    setError('');
    history.replace('/reserved');
  };

  return (
    <IonPage>
      <IonContent fullscreen className="zt-reserved-page">
        <div className="zt-reserved-shell">
          <IonCard className="zt-card zt-reserved-card">
            <IonCardContent>
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
                    type="password"
                    value={password}
                    onIonInput={(event) => setPassword(event.detail.value ?? '')}
                  />
                </IonItem>

                {error ? (
                  <IonText color="danger">
                    <p className="zt-reserved-error">{error}</p>
                  </IonText>
                ) : null}

                <IonButton expand="block" onClick={handleLogin}>
                  Entrar
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
