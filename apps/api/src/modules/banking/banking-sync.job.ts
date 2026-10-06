import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { runAsUser } from '../../common/user-context'
import { AuthRepository } from '../auth/auth.repository'
import { BankingSyncRepository } from './banking-sync.repository'
import { BankingService } from './banking.service'

function describeError(error: unknown): string {
  return error instanceof Error ? error.name : 'UnknownError'
}

const DAILY_SYNC_LOCK_KEY = 7_301_001

@Injectable()
export class BankingSyncJob {
  private readonly logger = new Logger(BankingSyncJob.name)

  constructor(
    private readonly banking: BankingService,
    private readonly repository: BankingSyncRepository,
    private readonly auth: AuthRepository,
  ) {}

  @Cron('0 3 * * *', { name: 'banking-daily-sync', timeZone: 'America/Manaus' })
  async runDaily(): Promise<void> {
    try {
      const ran = await this.repository.withAdvisoryLock(DAILY_SYNC_LOCK_KEY, () => this.syncEveryUser())
      if (!ran) this.logger.log('Daily sync skipped: another instance holds the lock')
    } catch (error) {
      this.logger.error(`Daily sync aborted: ${describeError(error)}`)
    }
  }

  private async syncEveryUser(): Promise<void> {
    const userIds = await this.auth.findAllUserIds()
    let synced = 0
    let failed = 0
    for (const userId of userIds) {
      try {
        const result = await runAsUser(userId, () => this.banking.syncAllConnected(userId))
        synced += result.synced
        failed += result.failed
      } catch (error) {
        failed++
        this.logger.error(`Sync failed for user ${userId}: ${describeError(error)}`)
      }
    }
    this.logger.log(`Daily sync finished: ${synced} synced, ${failed} failed`)
  }
}
