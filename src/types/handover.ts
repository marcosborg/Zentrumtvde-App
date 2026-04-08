export type VehicleHandoverChecklistItem = {
  key: string;
  label: string;
  requires_value?: boolean;
  value_label?: string | null;
  value_type?: string | null;
};

export type VehicleHandoverOption = {
  value: string;
  label: string;
};

export type VehicleHandoverVehicle = {
  id: number;
  license_plate: string;
  display_name: string;
  make?: string | null;
  model?: string | null;
  status: string;
  status_label: string;
  current_driver_id?: number | null;
  current_driver_name?: string | null;
};

export type VehicleHandoverDriver = {
  id: number;
  name: string;
  display_name: string;
  phone?: string | null;
  email?: string | null;
  current_vehicle_id?: number | null;
  current_vehicle_license_plate?: string | null;
};

export type VehicleHandoverSummary = {
  id: number;
  type: 'delivery' | 'return';
  type_label: string;
  performed_at?: string | null;
  performed_at_label?: string | null;
  vehicle: {
    id?: number | null;
    license_plate?: string | null;
    display_name?: string | null;
  };
  driver: {
    id?: number | null;
    name?: string | null;
    phone?: string | null;
  };
  operator_name?: string | null;
  notes?: string | null;
  pdf_url?: string | null;
};

export type VehicleHandoverDetail = VehicleHandoverSummary & {
  status: string;
  performed_date_label?: string | null;
  allocation_effective_start_date?: string | null;
  allocation_effective_start_date_label?: string | null;
  allocation_effective_end_date?: string | null;
  allocation_effective_end_date_label?: string | null;
  vehicle_snapshot?: Record<string, unknown> | null;
  driver_snapshot?: Record<string, unknown> | null;
  checklist_payload: Record<string, {
    label: string;
    checked: boolean;
    value?: string | null;
    value_label?: string | null;
    value_type?: string | null;
  }>;
  damage_items: Array<{
    type?: string | null;
    zone?: string | null;
    description?: string | null;
    photo_url?: string | null;
  }>;
  general_photo_urls: string[];
  guided_photo_items: Array<{
    key: string;
    label: string;
    view?: string | null;
    required: boolean;
    photo_url?: string | null;
  }>;
  battery_minimum_confirmed: boolean;
  battery_minimum_percent?: number | null;
  deposit_paid_confirmed: boolean;
  deposit_paid_amount?: string | null;
  operator_signature_data_url: string;
  driver_signature_data_url: string;
  html_snapshot?: string | null;
  created_allocation_id?: number | null;
  closed_allocation_id?: number | null;
};

export type VehicleHandoverBootstrapPayload = {
  checklist_items: VehicleHandoverChecklistItem[];
  damage_types: VehicleHandoverOption[];
  guided_photo_zones: Array<{
    key: string;
    label: string;
    view: string;
    required: boolean;
  }>;
  vehicle_zones: VehicleHandoverOption[];
  vehicles: VehicleHandoverVehicle[];
  drivers: VehicleHandoverDriver[];
  recent_procedures: VehicleHandoverSummary[];
};

export type VehicleHandoverCreatePayload = {
  type: 'delivery' | 'return';
  vehicle_id: number;
  driver_id: number;
  performed_at: string;
  checklist_payload: Record<string, {
    checked: boolean;
    value?: string | null;
  }>;
  damage_items: Array<{
    type: string;
    zone: string;
    description?: string;
    photo?: string | null;
  }>;
  guided_photo_items: Record<string, {
    photo: string | null;
  }>;
  general_photos: string[];
  notes?: string;
  operator_signature_data_url: string;
  driver_signature_data_url: string;
};
