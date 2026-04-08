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
        <path d="M94 28 C110 16, 132 11, 160 11 C188 11, 210 16, 226 28 L244 48 C252 57, 257 69, 257 83 L257 108 C257 122, 245 134, 231 134 L89 134 C75 134, 63 122, 63 108 L63 83 C63 69, 68 57, 76 48 Z" className="zt-inspection-map__car-shell" />
        <path d="M111 31 C123 24, 140 20, 160 20 C180 20, 197 24, 209 31 L220 52 L100 52 Z" className="zt-inspection-map__glass" />
        <path d="M84 92 C96 80, 112 74, 126 73 C116 79, 106 86, 99 96" className="zt-inspection-map__accent" />
        <path d="M236 92 C224 80, 208 74, 194 73 C204 79, 214 86, 221 96" className="zt-inspection-map__accent" />
        <path d="M132 92 C144 88, 176 88, 188 92" className="zt-inspection-map__accent" />
        <rect x="133" y="97" width="54" height="10" rx="5" className="zt-inspection-map__accent-soft" />
        <path d="M96 112 H224" className="zt-inspection-map__cutline" />
        <circle cx="101" cy="126" r="15" className="zt-inspection-map__wheel" />
        <circle cx="219" cy="126" r="15" className="zt-inspection-map__wheel" />
      </>
    );
  }

  if (view === 'rear') {
    return (
      <>
        <path d="M85 26 C103 15, 129 11, 160 11 C191 11, 217 15, 235 26 L248 42 C257 53, 261 67, 261 83 L261 108 C261 122, 249 134, 235 134 L85 134 C71 134, 59 122, 59 108 L59 83 C59 67, 63 53, 72 42 Z" className="zt-inspection-map__car-shell" />
        <path d="M108 30 C121 24, 139 21, 160 21 C181 21, 199 24, 212 30 L220 47 L100 47 Z" className="zt-inspection-map__glass" />
        <path d="M88 81 Q118 70 145 74" className="zt-inspection-map__accent" />
        <path d="M232 81 Q202 70 175 74" className="zt-inspection-map__accent" />
        <path d="M98 88 C128 94, 192 94, 222 88" className="zt-inspection-map__accent" />
        <rect x="134" y="95" width="52" height="10" rx="5" className="zt-inspection-map__accent-soft" />
        <path d="M95 110 H225" className="zt-inspection-map__cutline" />
        <circle cx="101" cy="126" r="15" className="zt-inspection-map__wheel" />
        <circle cx="219" cy="126" r="15" className="zt-inspection-map__wheel" />
      </>
    );
  }

  if (view === 'interior') {
    return (
      <>
        <rect x="86" y="14" width="148" height="132" rx="28" className="zt-inspection-map__car-shell" />
        <path d="M102 24 H218 C221 24 224 27 224 30 V44 H96 V30 C96 27 99 24 102 24 Z" className="zt-inspection-map__dashboard" />
        <path d="M99 56 C99 48 106 44 114 44 H144 C151 44 156 49 156 56 V95 C156 102 151 107 144 107 H113 C105 107 99 101 99 94 Z" className="zt-inspection-map__seat" />
        <path d="M164 56 C164 48 171 44 179 44 H209 C216 44 221 49 221 56 V94 C221 101 215 107 208 107 H177 C170 107 164 102 164 95 Z" className="zt-inspection-map__seat" />
        <rect x="114" y="114" width="92" height="16" rx="8" className="zt-inspection-map__dashboard" />
        <path d="M160 44 V130" className="zt-inspection-map__cutline" />
      </>
    );
  }

  return (
    <>
      <path d="M28 122 L38 104 C46 88 58 74 74 65 L109 46 C126 37 145 32 165 32 H200 C221 32 240 40 254 54 L274 74 C286 86 295 101 300 116 L302 122 V128 H28 Z" className="zt-inspection-map__car-shell" />
      <path d="M112 44 H198 C214 44 227 49 237 60 L252 75 H90 L100 57 C103 50 106 46 112 44 Z" className="zt-inspection-map__glass" />
      <path d="M130 44 C141 30 154 23 171 22 C185 22 198 26 207 36" className="zt-inspection-map__accent" />
      <path d="M80 78 H258" className="zt-inspection-map__cutline" />
      <path d="M50 104 H86" className="zt-inspection-map__accent" />
      <path d="M238 104 H284" className="zt-inspection-map__accent" />
      <path d="M104 112 H224" className="zt-inspection-map__cutline" />
      <circle cx="96" cy="126" r="18" className="zt-inspection-map__wheel" />
      <circle cx="232" cy="126" r="18" className="zt-inspection-map__wheel" />
      <path d="M84 128 Q96 111 108 128" className="zt-inspection-map__accent-soft-line" />
      <path d="M220 128 Q232 111 244 128" className="zt-inspection-map__accent-soft-line" />
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
      <div className="zt-inspection-map__views">
        <IonSegment
          value={activeView}
          scrollable
          onIonChange={(event) => setActiveView(String(event.detail.value || 'front'))}
        >
          {availableViews.map((view) => (
            <IonSegmentButton key={view} value={view}>
              {viewLabels[view] || view}
            </IonSegmentButton>
          ))}
        </IonSegment>
      </div>

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
