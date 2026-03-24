import { IonButton, IonCard, IonCardContent } from '@ionic/react';
import AppShell from '../components/AppShell';
import DataState from '../components/DataState';
import { useFrontpageData } from '../context/FrontpageDataContext';
import './SectionPage.css';

const Contact: React.FC = () => {
  const { data, loading, error, refresh } = useFrontpageData();

  return (
    <AppShell title="Contacto" subtitle="">
      <DataState loading={loading} error={error} onRetry={refresh} />

      {!data ? null : (
        <div className="zt-stack">
          <div className="zt-grid">
            {data.contacts.map((item) => (
              <IonCard className="zt-card" key={item.label}>
                <IonCardContent className="zt-contact-item">
                  <h3>{item.label}</h3>
                  <IonButton fill="clear" href={item.href} className="zt-contact-link">
                    {item.value}
                  </IonButton>
                </IonCardContent>
              </IonCard>
            ))}
          </div>
        </div>
      )}
    </AppShell>
  );
};

export default Contact;
