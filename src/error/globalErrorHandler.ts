import { Request, Response, NextFunction } from 'express';
import { AppError } from './AppError';
import { Log } from '@/utils/logger';

export const globalErrorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  Log.error(`GlobalErrorHandler::::globalErrorHandler::::: Error occurred: ${err.message}`);
  
  if (err.isOperational) {
    res.status(err.statusCode || 500).json({
      status: err.status || 'error',
      message: err.message,
      statusCode: err.statusCode
    });
    return;
  }

  Log.error('GlobalErrorHandler::::globalErrorHandler::::: Unexpected error', err);

  res.status(500).json({
    status: 'error',
    message: 'Something went very wrong!',
    statusCode: 500
  });
};
