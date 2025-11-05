/**
 * User types
 */
export interface User {
  _id: string;
  email: string;
  full_name: string;
  created_at: string;
  updated_at: string;
}

export interface UserCreate {
  email: string;
  password: string;
  full_name: string;
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}
