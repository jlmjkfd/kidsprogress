/**
 * User types
 */
export interface User {
  _id: string;
  email: string;
  full_name: string;
  language: "en" | "zh";
  parent_portal_pin_hash?: string;
  created_at: string;
  updated_at: string;
}

export interface UserCreate {
  email: string;
  password: string;
  full_name: string;
  language?: "en" | "zh";
}

export interface UserLogin {
  email: string;
  password: string;
  is_trusted_device?: boolean; // True = family device (long token), False = temporary (short token)
}

export interface Token {
  access_token: string;
  token_type: string;
  refresh_token: string; // Long-lived token for auto-refresh
}

export interface ParentPortalPIN {
  pin: string; // 4-6 digit PIN
}

export interface ParentPortalPINStatus {
  has_pin: boolean;
}
