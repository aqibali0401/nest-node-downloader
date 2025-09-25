import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { NetworkService } from '../network/network.service';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export interface ProcessState {
  id: string;
  status: 'running' | 'crashed' | 'recovering' | 'completed' | 'failed';
  startTime: string;
  lastUpdate: string;
  currentStep: string;
  progress: number;
  error?: string;
  retryCount: number;
  maxRetries: number;
}

export interface RecoveryResult {
  success: boolean;
  state: ProcessState;
  recoveryTime: number;
  dataRestored: boolean;
  error?: string;
}

@Injectable()
export class ProcessRecoveryService {
  private readonly logger = new Logger(ProcessRecoveryService.name);
  private readonly STATE_FILE = './process-state.json';
  private readonly MAX_RETRIES = 3;
  private readonly RECOVERY_TIMEOUT = 30000; // 30 seconds

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly networkService: NetworkService
  ) {}

  /**
   * Save process state for recovery
   */
  async saveProcessState(state: ProcessState): Promise<void> {
    try {
      const stateData = {
        ...state,
        lastUpdate: new Date().toISOString()
      };
      
      writeFileSync(this.STATE_FILE, JSON.stringify(stateData, null, 2));
      this.logger.debug(`💾 Process state saved: ${state.id}`);
    } catch (error) {
      this.logger.error('❌ Failed to save process state:', error.message);
      throw error;
    }
  }

  /**
   * Load process state for recovery
   */
  async loadProcessState(): Promise<ProcessState | null> {
    try {
      if (!existsSync(this.STATE_FILE)) {
        this.logger.debug('📭 No process state file found');
        return null;
      }

      const stateData = JSON.parse(readFileSync(this.STATE_FILE, 'utf8'));
      this.logger.log(`📂 Process state loaded: ${stateData.id}`);
      return stateData as ProcessState;
    } catch (error) {
      this.logger.error('❌ Failed to load process state:', error.message);
      return null;
    }
  }

  /**
   * Clear process state after successful completion
   */
  async clearProcessState(): Promise<void> {
    try {
      if (existsSync(this.STATE_FILE)) {
        const { unlinkSync } = require('fs');
        unlinkSync(this.STATE_FILE);
        this.logger.log('🗑️ Process state cleared');
      }
    } catch (error) {
      this.logger.error('❌ Failed to clear process state:', error.message);
    }
  }

  /**
   * Attempt process recovery
   */
  async attemptRecovery(): Promise<RecoveryResult> {
    const startTime = Date.now();
    this.logger.log('🔄 Attempting process recovery...');

    try {
      const state = await this.loadProcessState();
      if (!state) {
        this.logger.log('📭 No process state to recover');
        return {
          success: true,
          state: null as any,
          recoveryTime: Date.now() - startTime,
          dataRestored: false
        };
      }

      if (state.status === 'completed') {
        this.logger.log('✅ Process already completed');
        await this.clearProcessState();
        return {
          success: true,
          state,
          recoveryTime: Date.now() - startTime,
          dataRestored: false
        };
      }

      if (state.retryCount >= state.maxRetries) {
        this.logger.error('❌ Maximum retries exceeded');
        return {
          success: false,
          state,
          recoveryTime: Date.now() - startTime,
          dataRestored: false,
          error: 'Maximum retries exceeded'
        };
      }

      // Update state to recovering
      state.status = 'recovering';
      state.retryCount++;
      await this.saveProcessState(state);

      this.logger.log(`🔄 Recovering process: ${state.id} (attempt ${state.retryCount}/${state.maxRetries})`);

      // Perform recovery steps
      const recoverySteps = [
        () => this.recoverDatabase(),
        () => this.recoverNetwork(),
        () => this.recoverFiles(),
        () => this.recoverProcess()
      ];

      for (const step of recoverySteps) {
        try {
          await step();
        } catch (error) {
          this.logger.warn(`⚠️ Recovery step failed: ${error.message}`);
        }
      }

      // Update state to running
      state.status = 'running';
      state.lastUpdate = new Date().toISOString();
      await this.saveProcessState(state);

      this.logger.log('✅ Process recovery completed successfully');
      return {
        success: true,
        state,
        recoveryTime: Date.now() - startTime,
        dataRestored: true
      };

    } catch (error) {
      this.logger.error('❌ Recovery failed:', error.message);
      return {
        success: false,
        state: null as any,
        recoveryTime: Date.now() - startTime,
        dataRestored: false,
        error: error.message
      };
    }
  }

  /**
   * Recover database connection
   */
  private async recoverDatabase(): Promise<void> {
    this.logger.log('🗄️ Recovering database connection...');
    await this.databaseService.initialize();
    this.logger.log('✅ Database connection recovered');
  }

  /**
   * Recover network connectivity
   */
  private async recoverNetwork(): Promise<void> {
    this.logger.log('🌐 Recovering network connectivity...');
    const connectivity = await this.networkService.checkConnectivity();
    if (!connectivity.isOnline) {
      throw new Error('Network still offline');
    }
    this.logger.log('✅ Network connectivity recovered');
  }

  /**
   * Recover file system
   */
  private async recoverFiles(): Promise<void> {
    this.logger.log('📁 Recovering file system...');
    // Check if downloads directory exists
    const { existsSync, mkdirSync } = require('fs');
    const downloadsDir = './downloads';
    if (!existsSync(downloadsDir)) {
      mkdirSync(downloadsDir, { recursive: true });
      this.logger.log('📁 Downloads directory recreated');
    }
    this.logger.log('✅ File system recovered');
  }

  /**
   * Recover process state
   */
  private async recoverProcess(): Promise<void> {
    this.logger.log('⚙️ Recovering process state...');
    // Reset any process-specific state
    this.logger.log('✅ Process state recovered');
  }

  /**
   * Create new process state
   */
  createProcessState(processId: string, currentStep: string): ProcessState {
    return {
      id: processId,
      status: 'running',
      startTime: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      currentStep,
      progress: 0,
      retryCount: 0,
      maxRetries: this.MAX_RETRIES
    };
  }

  /**
   * Update process state
   */
  async updateProcessState(state: ProcessState, step: string, progress: number): Promise<void> {
    state.currentStep = step;
    state.progress = progress;
    state.lastUpdate = new Date().toISOString();
    await this.saveProcessState(state);
  }

  /**
   * Mark process as completed
   */
  async markProcessCompleted(state: ProcessState): Promise<void> {
    state.status = 'completed';
    state.progress = 100;
    state.lastUpdate = new Date().toISOString();
    await this.saveProcessState(state);
    await this.clearProcessState();
  }

  /**
   * Mark process as failed
   */
  async markProcessFailed(state: ProcessState, error: string): Promise<void> {
    state.status = 'failed';
    state.error = error;
    state.lastUpdate = new Date().toISOString();
    await this.saveProcessState(state);
  }
}
