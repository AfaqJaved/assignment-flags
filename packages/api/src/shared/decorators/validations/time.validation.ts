import { applyDecorators } from '@nestjs/common';
import { IsOptional, IsString, Matches } from 'class-validator';

const HH_MM_REGEX = /^\d{2}:\d{2}$/;
const HH_MM_MESSAGE = 'Time must be in HH:mm format (e.g. 09:30)';

/** Required 24-hour time string in HH:mm format. */
export const PikSlotsTimeValidation = () =>
  applyDecorators(IsString(), Matches(HH_MM_REGEX, { message: HH_MM_MESSAGE }));

/** Optional 24-hour time string in HH:mm format. */
export const PikSlotsOptionalTimeValidation = () =>
  applyDecorators(
    IsOptional(),
    IsString(),
    Matches(HH_MM_REGEX, { message: HH_MM_MESSAGE }),
  );
