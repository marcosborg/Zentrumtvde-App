export type CandidateApplicationDocument = {
  path: string;
  name: string;
  mime?: string | null;
  size?: number | null;
  uploaded_at?: string | null;
};

export type CandidateApplicationRecord = {
  token: string;
  status: 'draft' | 'incomplete' | 'submitted';
  current_step: string;
  accepts_model: boolean;
  independent_driver: boolean;
  rental_terms_read: boolean;
  rental_terms_accept: boolean;
  has_tvde_course: boolean | null;
  certificate_valid: boolean | null;
  experience: string | null;
  platforms: string[] | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  nif: string | null;
  iban: string | null;
  rgpd: boolean;
  truth_declaration: boolean;
  contact_authorization: boolean;
  vehicle_type_id: number | null;
  documents: Record<string, CandidateApplicationDocument[]> | null;
};

export type VehicleType = {
  id: number;
  brand: string;
  model: string;
  version: string | null;
  weekly_rental_price: string;
};

export type CandidateApplicationBootstrap = {
  application: CandidateApplicationRecord;
  vehicle_types: VehicleType[];
};
