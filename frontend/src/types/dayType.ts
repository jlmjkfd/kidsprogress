/**
 * Day type management type definitions
 * Matches backend models for day type calendar system
 */

export enum DayTypeEnum {
  SCHOOL_DAY = "school_day",
  WEEKEND = "weekend",
  HOLIDAY = "holiday",
  SPECIAL = "special",
}

export interface DayTypeEntry {
  _id: string;
  child_id: string;
  parent_id: string;
  date: string; // YYYY-MM-DD
  day_type: DayTypeEnum;
  name?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface DayTypeCreate {
  child_id: string;
  date: string; // YYYY-MM-DD
  day_type: DayTypeEnum;
  name?: string;
  description?: string;
}

export interface DayTypeUpdate {
  day_type?: DayTypeEnum;
  name?: string;
  description?: string;
}

export interface DefaultDayPattern {
  _id: string;
  child_id: string;
  parent_id: string;
  monday: DayTypeEnum;
  tuesday: DayTypeEnum;
  wednesday: DayTypeEnum;
  thursday: DayTypeEnum;
  friday: DayTypeEnum;
  saturday: DayTypeEnum;
  sunday: DayTypeEnum;
  created_at: string;
  updated_at: string;
}

export interface DefaultDayPatternUpdate {
  monday?: DayTypeEnum;
  tuesday?: DayTypeEnum;
  wednesday?: DayTypeEnum;
  thursday?: DayTypeEnum;
  friday?: DayTypeEnum;
  saturday?: DayTypeEnum;
  sunday?: DayTypeEnum;
}
