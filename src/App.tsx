import {
  IonApp,
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenu,
  IonMenuToggle,
  IonRouterOutlet,
  IonSplitPane,
  IonTabBar,
  IonTabButton,
  IonTabs,
  setupIonicReact,
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import type { PropsWithChildren } from 'react';
import { Redirect, Route } from 'react-router-dom';
import {
  call,
  carSport,
  briefcase,
  documentText,
  folderOpen,
  grid,
  home,
  informationCircle,
  map,
  newspaper,
  people,
  personAdd,
  sparkles,
  globe,
} from 'ionicons/icons';
import FrontpageDataProvider, { useFrontpageData } from './context/FrontpageDataContext';
import BlogList from './pages/BlogList';
import BlogPost from './pages/BlogPost';
import CandidateApplicationPage from './pages/CandidateApplication';
import CmsPage from './pages/CmsPage';
import Fleet from './pages/Fleet';
import Home from './pages/Home';
import ReservedArea from './pages/ReservedArea';
import ReservedLogin from './pages/ReservedLogin';
import Services from './pages/Services';
import AuthProvider, { useAuth } from './context/AuthContext';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/* Theme variables */
import './theme/variables.css';

setupIonicReact();

const fallbackMenuItems = [
  { id: 'home', label: 'Frontpage', url: '/tabs/home', path: '/tabs/home', children: [], icon: home },
  { id: 'services', label: 'Servicos', url: '/tabs/services', path: '/tabs/services', children: [], icon: sparkles },
  { id: 'fleet', label: 'Frota', url: '/tabs/fleet', path: '/tabs/fleet', children: [], icon: carSport },
  { id: 'contact', label: 'Contacto', url: '/tabs/cms/9', path: '/tabs/cms/9', children: [], icon: call },
];

const menuIconMap: Record<string, string> = {
  home,
  'information-circle': informationCircle,
  people,
  'person-add': personAdd,
  briefcase,
  globe,
  map,
  call,
  newspaper,
  'folder-open': folderOpen,
  'document-text': documentText,
};

const TabsLayout: React.FC = () => {
  const { data } = useFrontpageData();
  const contactPage = data?.cms_pages.find(
    (page) => page.slug === 'contactos' || page.title.toLowerCase() === 'contactos',
  );
  const contactHref = contactPage?.path || '/tabs/cms/9';

  return (
    <IonTabs>
      <IonRouterOutlet>
        <Route exact path="/tabs/home">
          <Home />
        </Route>
        <Route exact path="/tabs/services">
          <Services />
        </Route>
        <Route exact path="/tabs/fleet">
          <Fleet />
        </Route>
        <Route exact path="/tabs/cms/:pageId">
          <CmsPage />
        </Route>
        <Route exact path="/tabs/application">
          <CandidateApplicationPage />
        </Route>
        <Route exact path="/tabs/blog">
          <BlogList />
        </Route>
        <Route exact path="/tabs/blog/:postId">
          <BlogPost />
        </Route>
        <Route exact path="/tabs">
          <Redirect to="/tabs/home" />
        </Route>
        <Route>
          <Redirect to="/tabs/home" />
        </Route>
      </IonRouterOutlet>

      <IonTabBar slot="bottom" className="zt-tabbar">
        <IonTabButton tab="home" href="/tabs/home">
          <IonIcon icon={home} />
          <IonLabel>Inicio</IonLabel>
        </IonTabButton>
        <IonTabButton tab="services" href="/tabs/services">
          <IonIcon icon={grid} />
          <IonLabel>Servicos</IonLabel>
        </IonTabButton>
        <IonTabButton tab="fleet" href="/tabs/fleet">
          <IonIcon icon={carSport} />
          <IonLabel>Frota</IonLabel>
        </IonTabButton>
        <IonTabButton tab="contact" href={contactHref}>
          <IonIcon icon={call} />
          <IonLabel>Contacto</IonLabel>
        </IonTabButton>
      </IonTabBar>
    </IonTabs>
  );
};

const ProtectedRoute: React.FC<PropsWithChildren<{ path: string; exact?: boolean }>> = ({
  children,
  ...rest
}) => {
  const { isAuthenticated } = useAuth();

  return (
    <Route
      {...rest}
      render={() => (isAuthenticated ? children : <Redirect to="/auth/login" />)}
    />
  );
};

const AppFrame: React.FC = () => {
  const { data } = useFrontpageData();

  const menuItems = data?.menu.length
    ? data.menu.map((item) => ({
        ...item,
        icon: menuIconMap[item.icon] || documentText,
        children: item.children.map((child) => ({
          ...child,
          icon: menuIconMap[child.icon] || documentText,
        })),
      }))
    : fallbackMenuItems;

  return (
    <IonApp>
      <IonReactRouter>
        <IonSplitPane contentId="main-content" when="lg">
          <IonMenu contentId="main-content" type="overlay" className="zt-menu">
            <IonContent>
              <div className="zt-menu__header">
                <img src="/assets/logo.svg" alt="Zentrum TVDE" className="zt-menu__logo" />
              </div>

              <IonList inset className="zt-menu__list">
                {menuItems.map((item) =>
                  'children' in item && item.children?.length ? (
                    <div key={`${item.id}-${item.label}`} className="zt-menu__group">
                      <IonItem lines="none" className="zt-menu__group-title">
                        <IonIcon icon={item.icon} slot="start" />
                        <IonLabel>
                          <h3>{item.label}</h3>
                        </IonLabel>
                      </IonItem>
                      {item.children.map((child) =>
                        child.path ? (
                          <IonMenuToggle autoHide={false} key={`${child.id}-${child.label}`}>
                            <IonItem
                              button
                              detail={false}
                              routerLink={child.path}
                              routerDirection="root"
                              className="zt-menu__child"
                            >
                              <IonIcon icon={child.icon} slot="start" />
                              <IonLabel>
                                <h3>{child.label}</h3>
                              </IonLabel>
                            </IonItem>
                          </IonMenuToggle>
                        ) : null,
                      )}
                    </div>
                  ) : 'path' in item ? (
                    <IonMenuToggle autoHide={false} key={`${item.label}-${item.url ?? item.path}`}>
                      <IonItem
                        button
                        detail={false}
                        routerLink={item.path ?? item.url}
                        routerDirection="root"
                      >
                        <IonIcon icon={item.icon} slot="start" />
                        <IonLabel>
                          <h3>{item.label}</h3>
                        </IonLabel>
                      </IonItem>
                    </IonMenuToggle>
                  ) : null,
                )}
              </IonList>
            </IonContent>
          </IonMenu>

          <IonRouterOutlet id="main-content">
            <Route exact path="/auth/login">
              <ReservedLogin />
            </Route>
            <ProtectedRoute exact path="/reserved">
              <ReservedArea />
            </ProtectedRoute>
            <Route path="/tabs">
              <TabsLayout />
            </Route>
            <Route exact path="/">
              <Redirect to="/tabs/home" />
            </Route>
            <Route>
              <Redirect to="/tabs/home" />
            </Route>
          </IonRouterOutlet>
        </IonSplitPane>
      </IonReactRouter>
    </IonApp>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <FrontpageDataProvider>
      <AppFrame />
    </FrontpageDataProvider>
  </AuthProvider>
);

export default App;
