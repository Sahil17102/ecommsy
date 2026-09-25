export interface CompanyProfile {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  businessName?: string;
  website?: string;
  supportEmail?: string;
  contactNumber?: string;
  address?: string;
  pincode?: string;
  city?: string;
  state?: string;
  plan?: string;
}

export interface ProfileResponse {
  success: boolean;
  profile: CompanyProfile;
}

export interface ProfileUpdatePayload {
  website?: string;
  supportEmail?: string;
  contactNumber?: string;
  address?: string;
  pincode?: string;
  city?: string;
  state?: string;
}
