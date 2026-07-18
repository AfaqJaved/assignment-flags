import { Provider } from '@nestjs/common';
import {
  IArchiveFeatureFlagUseCase,
  ICreateFeatureFlagUseCase,
  IListFeatureFlagsUseCase,
  IUpdateFeatureFlagUseCase,
} from '@flags/domain';
import { CreateFeatureFlagUseCaseImpl } from './create.feature.flag.usecase.impl';
import { ListFeatureFlagsUseCaseImpl } from './list.feature.flags.usecase.impl';
import { UpdateFeatureFlagUseCaseImpl } from './update.feature.flag.usecase.impl';
import { ArchiveFeatureFlagUseCaseImpl } from './archive.feature.flag.usecase.impl';

// binds each domain use-case interface (the Symbol tokens) to its NestJS-flavored impl below;
// spread into FlagModule's providers so FlagUsecasesFactory can @Inject() them by token
export const FLAG_USECASES: Provider[] = [
  {
    useClass: CreateFeatureFlagUseCaseImpl,
    provide: ICreateFeatureFlagUseCase,
  },
  { useClass: ListFeatureFlagsUseCaseImpl, provide: IListFeatureFlagsUseCase },
  {
    useClass: UpdateFeatureFlagUseCaseImpl,
    provide: IUpdateFeatureFlagUseCase,
  },
  {
    useClass: ArchiveFeatureFlagUseCaseImpl,
    provide: IArchiveFeatureFlagUseCase,
  },
];
