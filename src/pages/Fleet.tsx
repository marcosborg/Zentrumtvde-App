import {
  IonAccordion,
  IonAccordionGroup,
  IonCard,
  IonCardContent,
  IonItem,
  IonLabel,
} from '@ionic/react';
import AppShell from '../components/AppShell';
import DataState from '../components/DataState';
import { useFrontpageData } from '../context/FrontpageDataContext';
import './SectionPage.css';

const Fleet: React.FC = () => {
  const { data, loading, error, refresh } = useFrontpageData();

  return (
    <AppShell
      title="Frota e FAQ"
      subtitle="A secao mais visual do site passa para cards, passos e accordions, com leitura mais direta em mobile."
    >
      <DataState loading={loading} error={error} onRetry={refresh} />

      {!data ? null : (
        <div className="zt-stack">
          <div className="zt-grid">
            {data.fleets.map((vehicle) => (
              <IonCard className="zt-card zt-fleet-item" key={vehicle.id}>
                <IonCardContent>
                  <img src={vehicle.image_url} alt={vehicle.name} />
                  <h3>{vehicle.name}</h3>
                  <p>Conteudo servido pelo backend Laravel e apresentado com componentes Ionic.</p>
                </IonCardContent>
              </IonCard>
            ))}
          </div>

          <IonCard className="zt-card">
            <IonCardContent>
              <h3>Como funciona</h3>
              <div className="zt-step-list">
                {data.steps.map((step, index) => (
                  <div className="zt-step" key={step}>
                    <span className="zt-step-index">{index + 1}</span>
                    <div>
                      <h4>Passo {index + 1}</h4>
                      <p>{step}</p>
                    </div>
                  </div>
                ))}
              </div>
            </IonCardContent>
          </IonCard>

          <IonCard className="zt-card">
            <IonCardContent>
              <h3>Perguntas frequentes</h3>
              <IonAccordionGroup>
                {data.faqs.map((faq, index) => (
                  <IonAccordion key={faq.question} value={`faq-${index}`}>
                    <IonItem slot="header" lines="none">
                      <IonLabel>{faq.question}</IonLabel>
                    </IonItem>
                    <div className="ion-padding" slot="content">
                      {faq.answer}
                    </div>
                  </IonAccordion>
                ))}
              </IonAccordionGroup>
            </IonCardContent>
          </IonCard>
        </div>
      )}
    </AppShell>
  );
};

export default Fleet;
