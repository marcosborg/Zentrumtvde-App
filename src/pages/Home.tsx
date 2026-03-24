import {
  IonAvatar,
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonIcon,
  IonNote,
} from '@ionic/react';
import { carSport, flash, people } from 'ionicons/icons';
import { Autoplay, Pagination } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import AppShell from '../components/AppShell';
import DataState from '../components/DataState';
import { useFrontpageData } from '../context/FrontpageDataContext';
import 'swiper/css';
import 'swiper/css/pagination';
import './Home.css';
import './SectionPage.css';

const Home: React.FC = () => {
  const { data, loading, error, refresh } = useFrontpageData();
  const heroes = data?.heroes ?? [];

  return (
    <AppShell
      title="Frontpage"
      subtitle="Conhece a proposta da Zentrum TVDE, os servicos, a frota e os principais pontos de contacto."
    >
      <DataState loading={loading} error={error} onRetry={refresh} />

      {!data || heroes.length === 0 ? null : (
        <div className="zt-stack">
          <IonCard className="zt-card zt-hero-card">
            <IonCardContent>
              <Swiper
                modules={[Autoplay, Pagination]}
                autoplay={{ delay: 5000, disableOnInteraction: false }}
                pagination={{ clickable: true }}
                loop={heroes.length > 1}
                className="home-hero-swiper"
              >
                {heroes.map((hero) => (
                  <SwiperSlide key={hero.id}>
                    <div
                      className="home-hero-slide"
                      style={{ backgroundImage: `url(${hero.image_url})` }}
                    >
                      <div className="home-hero-overlay">
                        <div className="zt-hero-copy">
                          <IonBadge color="primary">Apoio completo para motoristas TVDE</IonBadge>
                          <h2>{hero.title || 'Ganhe mais como motorista TVDE'}</h2>
                          <p>{hero.subtitle || 'Obtenha flexibilidade e autonomia, trabalhando como motorista TVDE.'}</p>
                          <div className="zt-hero-actions">
                            {hero.cta_text ? (
                              <IonButton shape="round" color="success" href={hero.cta_link || undefined}>
                                {hero.cta_text}
                              </IonButton>
                            ) : null}
                            {hero.cta_secondary_text ? (
                              <IonButton
                                shape="round"
                                fill="outline"
                                color="primary"
                                href={hero.cta_secondary_link || undefined}
                              >
                                {hero.cta_secondary_text}
                              </IonButton>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            </IonCardContent>
          </IonCard>

          <div className="zt-pillars">
            {data.stats.map((stat) => (
              <div className="zt-stat" key={stat.id}>
                <strong>{stat.value}</strong>
                <IonNote>{stat.name}</IonNote>
              </div>
            ))}
          </div>

          <div className="zt-grid">
            {data.services.map((service) => (
              <IonCard className="zt-card" key={service.id}>
                <IonCardContent>
                  <div
                    className="zt-service-icon"
                    style={{ background: service.icon_color || 'var(--zt-service-purple)' }}
                  >
                    <IonIcon
                      icon={
                        service.icon === 'flash'
                          ? flash
                          : service.icon === 'people'
                            ? people
                            : carSport
                      }
                      size="large"
                    />
                  </div>
                  <h3>{service.name}</h3>
                  <p>{service.description || 'Descricao indisponivel no momento.'}</p>
                </IonCardContent>
              </IonCard>
            ))}
          </div>

          <IonCard className="zt-card">
            <IonCardContent>
              <div className="home-section-header">
                <div>
                  <h3>A nossa frota</h3>
                  <p>Conhece alguns dos modelos disponiveis.</p>
                </div>
                <IonButton fill="clear" routerLink="/tabs/fleet">
                  Abrir detalhe
                </IonButton>
              </div>

              <div className="zt-grid">
                {data.fleets.slice(0, 3).map((vehicle) => (
                  <div className="home-fleet-preview" key={vehicle.id}>
                    <img src={vehicle.image_url} alt={vehicle.name} />
                    <h4>{vehicle.name}</h4>
                  </div>
                ))}
              </div>
            </IonCardContent>
          </IonCard>

          <div className="zt-grid home-dual-grid">
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
                <h3>FAQ em destaque</h3>
                <div className="home-faq-list">
                  {data.faqs.slice(0, 3).map((faq) => (
                    <div className="home-faq-item" key={faq.question}>
                      <h4>{faq.question}</h4>
                      <p>{faq.answer}</p>
                    </div>
                  ))}
                </div>
              </IonCardContent>
            </IonCard>
          </div>

          <div className="zt-grid home-dual-grid">
            <IonCard className="zt-card">
              <IonCardContent>
                <div className="home-section-header">
                  <div>
                    <h3>Depoimentos</h3>
                    <p>O que dizem alguns motoristas sobre a experiencia.</p>
                  </div>
                </div>
                <div className="home-testimonial-list">
                  {data.testimonials.slice(0, 3).map((testimonial) => (
                    <div className="home-testimonial-item" key={testimonial.id}>
                      <div className="home-testimonial-head">
                        {testimonial.photo_url ? (
                          <IonAvatar>
                            <img src={testimonial.photo_url} alt={testimonial.author_name} />
                          </IonAvatar>
                        ) : (
                          <div className="home-testimonial-avatar">
                            {testimonial.author_name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <h4>{testimonial.author_name}</h4>
                          <p>{'★'.repeat(Math.max(0, testimonial.stars))}</p>
                        </div>
                      </div>
                      <p>{testimonial.content}</p>
                    </div>
                  ))}
                </div>
              </IonCardContent>
            </IonCard>

            <IonCard className="zt-card">
              <IonCardContent>
                <div className="home-section-header">
                  <div>
                    <h3>Noticias do blog</h3>
                    <p>Novidades e conteudos em destaque.</p>
                  </div>
                </div>
                <div className="home-blog-list">
                  {data.blog_posts.slice(0, 3).map((post) => (
                    <a className="home-blog-item" href={post.path} key={post.id}>
                      <img src={post.image_url} alt={post.title} />
                      <div>
                        <IonNote>{post.published_at || 'Sem data'}</IonNote>
                        <h4>{post.title}</h4>
                        <p>{post.excerpt}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </IonCardContent>
            </IonCard>
          </div>

        </div>
      )}
    </AppShell>
  );
};

export default Home;
