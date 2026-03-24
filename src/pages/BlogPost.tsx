import { IonCard, IonCardContent, IonNote } from '@ionic/react';
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import AppShell from '../components/AppShell';
import DataState from '../components/DataState';
import { useFrontpageData } from '../context/FrontpageDataContext';
import './SectionPage.css';

const BlogPost: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const { data, loading, error, refresh } = useFrontpageData();

  const post = useMemo(
    () => data?.blog_posts.find((item) => String(item.id) === String(postId)) ?? null,
    [data, postId],
  );

  return (
    <AppShell title={post?.title || 'Noticia'} subtitle="">
      <DataState loading={loading} error={error} onRetry={refresh} />

      {!data || !post ? null : (
        <div className="zt-stack">
          <IonCard className="zt-card">
            <IonCardContent>
              <IonNote>{post.published_at || 'Sem data'}</IonNote>
              <h2>{post.title}</h2>
              <img src={post.image_url} alt={post.title} className="zt-post-image" />
              <div className="zt-rich-content" dangerouslySetInnerHTML={{ __html: post.body }} />
            </IonCardContent>
          </IonCard>
        </div>
      )}
    </AppShell>
  );
};

export default BlogPost;
