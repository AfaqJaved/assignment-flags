import { applyDecorators } from '@nestjs/common';
import { IsIn, IsOptional } from 'class-validator';

type WeekDay =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

const WEEK_DAYS: WeekDay[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

/** Required WeekDay value ('monday' – 'sunday'). */
export const PikSlotsWeekDayValidation = () => applyDecorators(IsIn(WEEK_DAYS));

/** Optional WeekDay value ('monday' – 'sunday'). */
export const PikSlotsOptionalWeekDayValidation = () =>
  applyDecorators(IsOptional(), IsIn(WEEK_DAYS));
