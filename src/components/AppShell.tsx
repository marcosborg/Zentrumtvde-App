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
import { adminLoginUrl } from '../lib/frontpage-api';
import WebsiteChatWidget from './WebsiteChatWidget';
import './AppShell.css';

type AppShellProps = PropsWithChildren<{
  title: string;
  subtitle: string;
}>;

const AppShell: React.FC<AppShellProps> = ({ title, subtitle, children }) => {
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
            <IonButton fill="clear" href={adminLoginUrl} target="_blank">
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
