export interface CredentialFieldDef {
  key: string;
  label: string;
  type: "text" | "password";
  required: boolean;
}

export interface CredentialStatus {
  configured: boolean;
  sameAsB2c?: boolean;
}

export interface ProviderListItem {
  id: string;
  serviceProvider: string;
  displayName: string;
  logoUrl: string;
  totalCouriers: number;
  enabledCouriers: number;
  serviceProviderDisplayName: string;
  isEnabled: boolean;
  b2c: CredentialStatus;
  b2b: CredentialStatus;
  status: "active" | "inactive";
  updatedAt: string;
}

export interface CredentialBlock {
  fields: CredentialFieldDef[];
  description: string;
  values: Record<string, string>;
}

export interface B2bCredentialBlock extends CredentialBlock {
  sameAsB2c: boolean;
}

export interface ProviderCredentialsResponse {
  b2c: CredentialBlock;
  b2b: B2bCredentialBlock;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ListProvidersResponse {
  providers: ProviderListItem[];
  stats: {
    total: number;
    active: number;
    b2cConfigured: number;
  };
  pagination: Pagination;
}
