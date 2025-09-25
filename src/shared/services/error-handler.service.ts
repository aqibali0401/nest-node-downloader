import { Injectable } from '@nestjs/common';
import { ErrorResponse, ValidationError } from '../interfaces/app.interfaces';
import { AppLoggerService } from './logger.service';

/**
 * Centralized error handling service
 */
@Injectable()
export class ErrorHandlerService {
  private readonly logger = new AppLoggerService(ErrorHandlerService.name);

  /**
   * Handle application errors
   */
  handleError(error: Error, context?: string): ErrorResponse {
    const timestamp = new Date().toISOString();
    const errorContext = context || 'Unknown';

    this.logger.error(`Error in ${errorContext}:`, error.stack);

    // Determine error type and create appropriate response
    if (error.name === 'ValidationError') {
      return this.createValidationErrorResponse(error, timestamp);
    }

    if (error.name === 'DatabaseError') {
      return this.createDatabaseErrorResponse(error, timestamp);
    }

    if (error.name === 'NetworkError') {
      return this.createNetworkErrorResponse(error, timestamp);
    }

    if (error.name === 'RecoveryError') {
      return this.createRecoveryErrorResponse(error, timestamp);
    }

    // Generic error response
    return {
      statusCode: 500,
      message: error.message || 'Internal server error',
      error: 'Internal Server Error',
      timestamp,
      path: errorContext,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    };
  }

  /**
   * Create validation error response
   */
  private createValidationErrorResponse(error: Error, timestamp: string): ErrorResponse {
    return {
      statusCode: 400,
      message: 'Validation failed',
      error: 'Bad Request',
      timestamp,
      path: 'validation',
      details: {
        message: error.message,
        validationErrors: this.parseValidationErrors(error.message),
      },
    };
  }

  /**
   * Create database error response
   */
  private createDatabaseErrorResponse(error: Error, timestamp: string): ErrorResponse {
    return {
      statusCode: 500,
      message: 'Database operation failed',
      error: 'Database Error',
      timestamp,
      path: 'database',
      details: {
        message: error.message,
        type: 'database_error',
      },
    };
  }

  /**
   * Create network error response
   */
  private createNetworkErrorResponse(error: Error, timestamp: string): ErrorResponse {
    return {
      statusCode: 503,
      message: 'Network operation failed',
      error: 'Service Unavailable',
      timestamp,
      path: 'network',
      details: {
        message: error.message,
        type: 'network_error',
      },
    };
  }

  /**
   * Create recovery error response
   */
  private createRecoveryErrorResponse(error: Error, timestamp: string): ErrorResponse {
    return {
      statusCode: 500,
      message: 'Recovery operation failed',
      error: 'Recovery Error',
      timestamp,
      path: 'recovery',
      details: {
        message: error.message,
        type: 'recovery_error',
      },
    };
  }

  /**
   * Parse validation errors from error message
   */
  private parseValidationErrors(message: string): ValidationError[] {
    // Simple validation error parsing - can be enhanced based on needs
    return [
      {
        field: 'unknown',
        message: message,
      },
    ];
  }

  /**
   * Create custom error
   */
  createCustomError(message: string, statusCode: number = 500, context?: string): Error {
    const error = new Error(message);
    error.name = 'CustomError';
    (error as any).statusCode = statusCode;
    (error as any).context = context;
    return error;
  }

  /**
   * Log error with context
   */
  logError(error: Error, context: string, additionalData?: any): void {
    this.logger.error(`[${context}] ${error.message}`);
    if (additionalData) {
      this.logger.error(`[${context}] Additional Data:`, additionalData);
    }
  }

  /**
   * Log warning with context
   */
  logWarning(message: string, context: string, additionalData?: any): void {
    this.logger.warn(`[${context}] ${message}`, additionalData);
  }

  /**
   * Log info with context
   */
  logInfo(message: string, context: string, additionalData?: any): void {
    this.logger.log(`[${context}] ${message}`, additionalData);
  }
}
