import {
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './ReservedArea.css';

const ReservedArea: React.FC = () => {
  const history = useHistory();
  const { logout } = useAuth();

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar className="zt-toolbar">
          <IonTitle>Area reservada</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="zt-reserved-page">
        <div className="zt-reserved-shell zt-reserved-shell--inner">
          <IonCard className="zt-card zt-reserved-card">
            <IonCardContent>
              <div className="zt-reserved-brand">
                <img src="/assets/logo.svg" alt="Zentrum TVDE" />
                <h1>Backend da app</h1>
                <p>Zona reservada pronta para os proximos modulos.</p>
              </div>

              <div className="zt-reserved-placeholder">
                <strong>Sem funcoes disponiveis para ja.</strong>
                <p>Esta area fica preparada para dashboards, operacoes e gestao interna.</p>
              </div>

              <IonButton
                fill="outline"
                expand="block"
                onClick={() => {
                  logout();
                  history.replace('/auth/login');
                }}
              >
                Sair
              </IonButton>
            </IonCardContent>
          </IonCard>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ReservedArea;
