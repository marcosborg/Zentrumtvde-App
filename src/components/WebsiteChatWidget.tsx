import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';
import {
  IonButton,
  IonIcon,
  IonSpinner,
  IonTextarea,
} from '@ionic/react';
import { chatbubblesOutline, closeOutline, paperPlaneOutline } from 'ionicons/icons';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  sendWebsiteChatMessage,
  startWebsiteChat,
  type WebsiteChatMessage,
} from '../lib/frontpage-api';
import './WebsiteChatWidget.css';

const storageKey = 'zentrum_chat_session_token';

const WebsiteChatWidget: React.FC = () => {
  const [enabled, setEnabled] = useState(true);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [assistantName, setAssistantName] = useState('Assistente');
  const [sessionToken, setSessionToken] = useState('');
  const [messages, setMessages] = useState<WebsiteChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const messagesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      setLoading(true);

      try {
        const response = await startWebsiteChat(window.localStorage.getItem(storageKey));

        if (cancelled) {
          return;
        }

        setEnabled(response.enabled);
        setAssistantName(response.assistant_name || 'Assistente');
        setSessionToken(response.session_token);
        setMessages(response.messages || []);
        window.localStorage.setItem(storageKey, response.session_token);
      } catch {
        if (!cancelled) {
          setMessages([
            {
              role: 'assistant',
              content: 'Nao foi possivel iniciar o chat agora.',
              created_at: new Date().toISOString(),
            },
          ]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages, open]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return undefined;
    }

    const willShow = Keyboard.addListener('keyboardWillShow', (info) => {
      setKeyboardOffset(info.keyboardHeight);
    });
    const didShow = Keyboard.addListener('keyboardDidShow', (info) => {
      setKeyboardOffset(info.keyboardHeight);
    });
    const willHide = Keyboard.addListener('keyboardWillHide', () => {
      setKeyboardOffset(0);
    });
    const didHide = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardOffset(0);
    });

    return () => {
      void willShow.then((listener) => listener.remove());
      void didShow.then((listener) => listener.remove());
      void willHide.then((listener) => listener.remove());
      void didHide.then((listener) => listener.remove());
    };
  }, []);

  const canSend = useMemo(
    () => enabled && !sending && sessionToken.trim() !== '' && draft.trim() !== '',
    [draft, enabled, sending, sessionToken],
  );

  const handleSend = async () => {
    const message = draft.trim();

    if (!message || !sessionToken || sending) {
      return;
    }

    const optimisticUserMessage: WebsiteChatMessage = {
      role: 'user',
      content: message,
      created_at: new Date().toISOString(),
    };

    setSending(true);
    setMessages((current) => [...current, optimisticUserMessage]);
    setDraft('');

    try {
      const response = await sendWebsiteChatMessage(sessionToken, message);
      setSessionToken(response.session_token || sessionToken);
      window.localStorage.setItem(storageKey, response.session_token || sessionToken);
      setMessages((current) => [
        ...current,
        response.assistant_message,
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: 'Ocorreu um erro no envio da mensagem.',
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  if (!enabled) {
    return null;
  }

  return (
    <div
      className="zt-chat-widget"
      style={{ '--zt-keyboard-offset': `${keyboardOffset}px` } as CSSProperties}
    >
      {open ? (
        <div className="zt-chat-widget__panel" aria-live="polite">
          <div className="zt-chat-widget__header">
            <p>{assistantName}</p>
            <IonButton fill="clear" onClick={() => setOpen(false)}>
              <IonIcon icon={closeOutline} />
            </IonButton>
          </div>

          <div className="zt-chat-widget__messages" ref={messagesRef}>
            {loading ? (
              <div className="zt-chat-widget__loading">
                <IonSpinner name="crescent" />
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={`${message.created_at}-${index}`}
                  className={`zt-chat-widget__bubble ${
                    message.role === 'user'
                      ? 'zt-chat-widget__bubble--user'
                      : 'zt-chat-widget__bubble--assistant'
                  }`}
                >
                  {message.content}
                </div>
              ))
            )}

            {sending ? <div className="zt-chat-widget__typing">A responder...</div> : null}
          </div>

          <div className="zt-chat-widget__footer">
            <div className="zt-chat-widget__input-wrap">
              <IonTextarea
                autoGrow
                value={draft}
                placeholder="Escreve a tua mensagem..."
                onIonInput={(event) => setDraft(event.detail.value ?? '')}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void handleSend();
                  }
                }}
              />
              <IonButton onClick={() => void handleSend()} disabled={!canSend}>
                <IonIcon icon={paperPlaneOutline} />
              </IonButton>
            </div>
            <p className="zt-chat-widget__note">
              Este chat usa IA e guarda historico para melhoria de atendimento.
            </p>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        className={`zt-chat-widget__toggle ${open ? 'is-open' : ''}`}
        onClick={() => setOpen((current) => !current)}
        aria-label="Abrir chat"
      >
        <IonIcon icon={chatbubblesOutline} />
      </button>
    </div>
  );
};

export default WebsiteChatWidget;
