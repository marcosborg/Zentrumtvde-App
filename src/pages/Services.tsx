import { IonCard, IonCardContent, IonIcon, IonNote } from '@ionic/react';
import { carSport, flash, people } from 'ionicons/icons';
import AppShell from '../components/AppShell';
import DataState from '../components/DataState';
import { useFrontpageData } from '../context/FrontpageDataContext';
import './SectionPage.css';

const iconMap: Record<string, string> = {
  flash,
  'car-sport': carSport,
  people,
};

const Services: React.FC = () => {
  const { data, loading, error, refresh } = useFrontpageData();

  return (
    <AppShell
      title="Servicos"
      subtitle="Os principais pilares da oferta Zentrum condensados num formato mais nativo para app."
    >
      <DataState loading={loading} error={error} onRetry={refresh} />

      {!data ? null : (
        <div className="zt-stack">
          <div className="zt-grid">
            {data.services.map((service) => (
              <IonCard className="zt-card" key={service.id}>
                <IonCardContent>
                  <div
                    className="zt-service-icon"
                    style={{ background: service.icon_color || 'var(--zt-service-purple)' }}
                  >
                    <IonIcon icon={iconMap[service.icon || 'flash'] || flash} size="large" />
                  </div>
                  <h3>{service.name}</h3>
                  <p>{service.description || 'Descricao indisponivel no momento.'}</p>
                </IonCardContent>
              </IonCard>
            ))}
          </div>

          <IonCard className="zt-card">
            <IonCardContent>
              <h3>Indicadores rapidos</h3>
              <div className="zt-pillars">
                {data.stats.map((stat) => (
                  <div className="zt-stat" key={stat.id}>
                    <strong>{stat.value}</strong>
                    <IonNote>{stat.name}</IonNote>
                  </div>
                ))}
              </div>
            </IonCardContent>
          </IonCard>
        </div>
      )}
    </AppShell>
  );
};

export default Services;
