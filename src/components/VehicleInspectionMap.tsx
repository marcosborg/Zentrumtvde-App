import { IonIcon, IonSegment, IonSegmentButton, IonText } from '@ionic/react';
import { camera, checkmarkCircle, ellipseOutline, image } from 'ionicons/icons';
import { useMemo, useState } from 'react';

type GuidedZone = {
  key: string;
  label: string;
  view: string;
  required: boolean;
};

type ZoneLayout = GuidedZone & {
  x: number;
  y: number;
  width: number;
  height: number;
  shape?: 'rect' | 'circle';
};

type VehicleInspectionMapProps = {
  zones: GuidedZone[];
  photosByZone: Record<string, string | null>;
  onCapture: (zoneKey: string) => void;
};

const viewLabels: Record<string, string> = {
  front: 'Frente',
  left: 'Lado Esq.',
  rear: 'Tras',
  right: 'Lado Dir.',
  interior: 'Interior',
};

const zoneLayouts: ZoneLayout[] = [
  { key: 'front_full', label: 'Frente', view: 'front', required: true, x: 96, y: 44, width: 128, height: 84 },
  { key: 'left_front', label: 'Lado esquerdo frente', view: 'left', required: true, x: 92, y: 54, width: 68, height: 64 },
  { key: 'left_rear', label: 'Lado esquerdo tras', view: 'left', required: true, x: 166, y: 54, width: 62, height: 64 },
  { key: 'rear_full', label: 'Tras', view: 'rear', required: true, x: 96, y: 44, width: 128, height: 84 },
  { key: 'right_front', label: 'Lado direito frente', view: 'right', required: true, x: 92, y: 54, width: 68, height: 64 },
  { key: 'right_rear', label: 'Lado direito tras', view: 'right', required: true, x: 166, y: 54, width: 62, height: 64 },
  { key: 'interior_dashboard', label: 'Tablier / posto de conducao', view: 'interior', required: true, x: 100, y: 26, width: 120, height: 24 },
  { key: 'interior_front_seats', label: 'Bancos da frente', view: 'interior', required: true, x: 100, y: 58, width: 54, height: 42 },
  { key: 'interior_rear_seats', label: 'Bancos traseiros', view: 'interior', required: true, x: 166, y: 58, width: 54, height: 42 },
  { key: 'boot', label: 'Mala / bagageira', view: 'rear', required: false, x: 126, y: 18, width: 66, height: 18 },
];

function renderIllustration(view: string) {
  if (view === 'front') {
    return (
      <>
        <path d="M95 30 C110 18, 132 12, 160 12 C188 12, 210 18, 225 30 L246 54 C252 62, 256 73, 256 86 L256 108 C256 121, 245 132, 232 132 L88 132 C75 132, 64 121, 64 108 L64 86 C64 73, 68 62, 74 54 Z" className="zt-inspection-map__car-shell" />
        <path d="M108 34 C120 26, 137 22, 160 22 C183 22, 200 26, 212 34 L226 54 L94 54 Z" className="zt-inspection-map__glass" />
        <path d="M88 78 Q108 70 126 78" className="zt-inspection-map__accent" />
        <path d="M194 78 Q212 70 232 78" className="zt-inspection-map__accent" />
        <rect x="128" y="88" width="64" height="14" rx="7" className="zt-inspection-map__accent-soft" />
        <circle cx="102" cy="124" r="16" className="zt-inspection-map__wheel" />
        <circle cx="218" cy="124" r="16" className="zt-inspection-map__wheel" />
      </>
    );
  }

  if (view === 'rear') {
    return (
      <>
        <path d="M86 28 C104 16, 129 12, 160 12 C191 12, 216 16, 234 28 L248 46 C256 56, 260 69, 260 84 L260 106 C260 120, 248 132, 234 132 L86 132 C72 132, 60 120, 60 106 L60 84 C60 69, 64 56, 72 46 Z" className="zt-inspection-map__car-shell" />
        <path d="M108 34 C122 28, 139 24, 160 24 C181 24, 198 28, 212 34 L222 50 L98 50 Z" className="zt-inspection-map__glass" />
        <path d="M86 80 H128" className="zt-inspection-map__accent" />
        <path d="M192 80 H234" className="zt-inspection-map__accent" />
        <rect x="132" y="84" width="56" height="16" rx="8" className="zt-inspection-map__accent-soft" />
        <circle cx="102" cy="124" r="16" className="zt-inspection-map__wheel" />
        <circle cx="218" cy="124" r="16" className="zt-inspection-map__wheel" />
      </>
    );
  }

  if (view === 'interior') {
    return (
      <>
        <rect x="86" y="14" width="148" height="132" rx="24" className="zt-inspection-map__car-shell" />
        <rect x="100" y="24" width="120" height="24" rx="10" className="zt-inspection-map__dashboard" />
        <rect x="98" y="56" width="56" height="46" rx="16" className="zt-inspection-map__seat" />
        <rect x="166" y="56" width="56" height="46" rx="16" className="zt-inspection-map__seat" />
        <rect x="116" y="112" width="88" height="18" rx="8" className="zt-inspection-map__dashboard" />
      </>
    );
  }

  return (
    <>
      <path d="M42 116 L50 100 C58 82, 74 64, 96 56 L136 40 C146 36, 154 34, 170 34 L206 34 C220 34, 232 38, 242 46 L266 64 C278 74, 288 90, 294 106 L300 116 L300 126 L30 126 Z" className="zt-inspection-map__car-shell" />
      <path d="M120 42 H190 C206 42, 216 48, 226 58 L246 76 H96 L108 56 C112 48, 116 44, 120 42 Z" className="zt-inspection-map__glass" />
      <path d="M142 44 Q158 28 176 28" className="zt-inspection-map__accent" />
      <path d="M56 108 H92" className="zt-inspection-map__accent-soft" />
      <path d="M232 108 H276" className="zt-inspection-map__accent-soft" />
      <circle cx="96" cy="126" r="18" className="zt-inspection-map__wheel" />
      <circle cx="230" cy="126" r="18" className="zt-inspection-map__wheel" />
    </>
  );
}

const VehicleInspectionMap: React.FC<VehicleInspectionMapProps> = ({ zones, photosByZone, onCapture }) => {
  const [activeView, setActiveView] = useState<string>(zones[0]?.view ?? 'front');

  const activeLayouts = useMemo(
    () => zoneLayouts.filter((layout) => layout.view === activeView && zones.some((zone) => zone.key === layout.key)),
    [activeView, zones],
  );

  const availableViews = useMemo(() => Array.from(new Set(zones.map((zone) => zone.view))), [zones]);

  return (
    <div className="zt-inspection-map">
      <IonSegment value={activeView} onIonChange={(event) => setActiveView(String(event.detail.value || 'front'))}>
        {availableViews.map((view) => (
          <IonSegmentButton key={view} value={view}>
            {viewLabels[view] || view}
          </IonSegmentButton>
        ))}
      </IonSegment>

      <div className="zt-inspection-map__canvas">
        <svg viewBox="0 0 320 160" className="zt-inspection-map__svg" role="img" aria-label={`Mapa ${viewLabels[activeView] || activeView}`}>
          {renderIllustration(activeView)}
          {activeLayouts.map((zone) => {
            const hasPhoto = Boolean(photosByZone[zone.key]);

            return (
              <g
                key={zone.key}
                className={`zt-inspection-map__zone ${hasPhoto ? 'is-complete' : ''}`}
                onClick={() => onCapture(zone.key)}
              >
                <rect
                  x={zone.x}
                  y={zone.y}
                  width={zone.width}
                  height={zone.height}
                  rx="12"
                />
                <text x={zone.x + zone.width / 2} y={zone.y + zone.height / 2} textAnchor="middle" dominantBaseline="middle">
                  {hasPhoto ? 'OK' : '+'}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="zt-inspection-map__legend">
        {activeLayouts.map((zone) => {
          const hasPhoto = Boolean(photosByZone[zone.key]);

          return (
            <button key={zone.key} type="button" className="zt-inspection-map__legend-item" onClick={() => onCapture(zone.key)}>
              <span className={`zt-inspection-map__legend-bullet ${hasPhoto ? 'is-complete' : ''}`}>
                <IonIcon icon={hasPhoto ? checkmarkCircle : ellipseOutline} />
              </span>
              <span>{zone.label}{zone.required ? ' *' : ''}</span>
              <IonIcon icon={hasPhoto ? image : camera} />
            </button>
          );
        })}
      </div>

      <IonText color="medium">
        <p className="zt-inspection-map__hint">Toca numa zona do desenho para tirar a fotografia dessa parte da viatura.</p>
      </IonText>
    </div>
  );
};

export default VehicleInspectionMap;
