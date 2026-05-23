export const TaskStatus = {
  Pending: 'pending',
  InProgress: 'in_progress',
  Completed: 'completed',
  Skipped: 'skipped',
  Abandoned: 'abandoned',
} as const;
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export const TaskKind = {
  Generic: 'generic',
  AdditionSubtraction: 'addition-subtraction',
  Writing: 'writing',
} as const;
export type TaskKind = (typeof TaskKind)[keyof typeof TaskKind];

export const DayType = {
  School: 'school',
  Weekend: 'weekend',
  Holiday: 'holiday',
  Vacation: 'vacation',
} as const;
export type DayType = (typeof DayType)[keyof typeof DayType];

export const UserRole = {
  Parent: 'parent',
  Child: 'child',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const AttachmentKind = {
  Image: 'image',
  Audio: 'audio',
  Video: 'video',
  Document: 'document',
} as const;
export type AttachmentKind = (typeof AttachmentKind)[keyof typeof AttachmentKind];
