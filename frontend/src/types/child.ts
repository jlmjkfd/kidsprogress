/**
 * Child types
 */
export interface Child {
  _id: string;
  parent_id: string;
  name: string;
  date_of_birth: string; // ISO date string (YYYY-MM-DD)
  avatar_url?: string;
  pin_required: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChildCreate {
  name: string;
  date_of_birth: string; // ISO date string (YYYY-MM-DD)
  avatar_url?: string;
  pin_required: boolean;
  pin?: string;
}

/**
 * Calculate age from date of birth
 */
export function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}
