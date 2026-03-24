import { IonButton, IonCard, IonCardContent, IonSpinner } from '@ionic/react';

type DataStateProps = {
  loading: boolean;
  error: string | null;
  onRetry: () => Promise<void> | void;
};

const DataState: React.FC<DataStateProps> = ({ loading, error, onRetry }) => {
  if (loading) {
    return (
      <IonCard className="zt-card">
        <IonCardContent className="ion-text-center">
          <IonSpinner name="crescent" />
        </IonCardContent>
      </IonCard>
    );
  }

  if (error) {
    return (
      <IonCard className="zt-card">
        <IonCardContent className="ion-text-center">
          <h3>Falha ao carregar a frontpage</h3>
          <p>{error}</p>
          <IonButton onClick={() => void onRetry()}>Tentar novamente</IonButton>
        </IonCardContent>
      </IonCard>
    );
  }

  return null;
};

export default DataState;
