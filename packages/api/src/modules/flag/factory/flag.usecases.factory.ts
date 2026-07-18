import { Inject, Injectable } from '@nestjs/common';
import {
  IArchiveFeatureFlagUseCase,
  ICreateFeatureFlagUseCase,
  IListFeatureFlagsUseCase,
  IUpdateFeatureFlagUseCase,
} from '@flags/domain';
import type {
  ArchiveFeatureFlagUseCase,
  CreateFeatureFlagUseCase,
  ListFeatureFlagsUseCase,
  UpdateFeatureFlagUseCase,
} from '@flags/domain';

@Injectable()
export class FlagUsecasesFactory {
  @Inject(ICreateFeatureFlagUseCase)
  public readonly createFeatureFlagUseCase: CreateFeatureFlagUseCase;

  @Inject(IListFeatureFlagsUseCase)
  public readonly listFeatureFlagsUseCase: ListFeatureFlagsUseCase;

  @Inject(IUpdateFeatureFlagUseCase)
  public readonly updateFeatureFlagUseCase: UpdateFeatureFlagUseCase;

  @Inject(IArchiveFeatureFlagUseCase)
  public readonly archiveFeatureFlagUseCase: ArchiveFeatureFlagUseCase;
}
