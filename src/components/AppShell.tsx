import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonMenuButton,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { lockClosed } from 'ionicons/icons';
import type { PropsWithChildren } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import WebsiteChatWidget from './WebsiteChatWidget';
import './AppShell.css';

type AppShellProps = PropsWithChildren<{
  title: string;
  subtitle: string;
}>;

const AppShell: React.FC<AppShellProps> = ({ title, subtitle, children }) => {
  const history = useHistory();
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar className="zt-toolbar">
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>
            <span className="zt-toolbar-brand">
              <img src="/assets/logo.svg" alt="Zentrum TVDE" className="zt-toolbar-logo" />
            </span>
          </IonTitle>
          <IonButtons slot="end">
            <IonButton
              fill="clear"
              onClick={() =>
                history.push(isAuthenticated ? '/reserved' : '/auth/login', {
                  returnTo: location.pathname,
                })
              }
            >
              <IonIcon icon={lockClosed} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="zt-shell-content">
        <div className="zt-shell-body ion-padding">{children}</div>
        <WebsiteChatWidget />
      </IonContent>
    </IonPage>
  );
};

export default AppShell;
