export type ReservedCandidateApplication = {
  id: number;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  status: string;
  status_label: string;
  current_step?: string | null;
  submitted_at?: string | null;
  submitted_at_label?: string | null;
  created_at?: string | null;
  created_at_label?: string | null;
};

export type ReservedDriver = {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  bolt_driver_code?: string | null;
  uber_driver_code?: string | null;
  current_vehicle_license_plate?: string | null;
  has_active_billing_profile: boolean;
  company_name?: string | null;
};

export type ReservedVehicle = {
  id: number;
  license_plate: string;
  make?: string | null;
  model?: string | null;
  status: string;
  status_label: string;
  source?: string | null;
  source_label?: string | null;
  current_driver_name?: string | null;
  expired_documents_count: number;
  expiring_30_documents_count: number;
};

export type ReservedOverviewPayload = {
  candidate_applications: ReservedCandidateApplication[];
  drivers: ReservedDriver[];
  vehicles: ReservedVehicle[];
};
