import { IonCard, IonCardContent, IonNote } from '@ionic/react';
import AppShell from '../components/AppShell';
import DataState from '../components/DataState';
import { useFrontpageData } from '../context/FrontpageDataContext';
import './SectionPage.css';

const BlogList: React.FC = () => {
  const { data, loading, error, refresh } = useFrontpageData();

  return (
    <AppShell title="Noticias" subtitle="">
      <DataState loading={loading} error={error} onRetry={refresh} />

      {!data ? null : (
        <div className="zt-stack">
          {data.blog_posts.map((post) => (
            <a className="zt-blog-card" href={post.path} key={post.id}>
              <IonCard className="zt-card">
                <IonCardContent>
                  <div className="zt-blog-card__layout">
                    <img src={post.image_url} alt={post.title} className="zt-blog-card__image" />
                    <div>
                      <IonNote>{post.published_at || 'Sem data'}</IonNote>
                      <h3>{post.title}</h3>
                      <p>{post.excerpt}</p>
                    </div>
                  </div>
                </IonCardContent>
              </IonCard>
            </a>
          ))}
        </div>
      )}
    </AppShell>
  );
};

export default BlogList;
