import { AppError, ErrorCode, HttpStatus } from '@sso/shared';
import { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

export function registerErrorHandler(app: FastifyInstance): void {
  // Global 404 handler
  app.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
    reply.status(HttpStatus.NOT_FOUND).send({
      success: false,
      error: {
        message: `Route ${request.method} ${request.url} not found`,
        code: ErrorCode.ROUTE_NOT_FOUND,
        statusCode: HttpStatus.NOT_FOUND,
        requestId: request.id,
      },
    });
  });

  // Global Error Handler
  app.setErrorHandler(
    (error: FastifyError | AppError | Error, request: FastifyRequest, reply: FastifyReply) => {
      const requestId = request.id;

      // Handle AppError (custom domain errors)
      if (error instanceof AppError) {
        if (error.statusCode >= 500) {
          request.log.error({ err: error, requestId }, error.message);
        } else {
          request.log.warn({ err: error, requestId }, error.message);
        }

        return reply.status(error.statusCode).send({
          success: false,
          error: {
            message: error.message,
            code: error.code,
            statusCode: error.statusCode,
            details: error.details,
            requestId,
          },
        });
      }

      // Handle Zod validation errors
      if (error instanceof ZodError) {
        const details = error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        }));

        request.log.warn({ issues: error.issues, requestId }, 'Validation error');

        return reply.status(HttpStatus.UNPROCESSABLE_ENTITY).send({
          success: false,
          error: {
            message: 'Request validation failed',
            code: ErrorCode.VALIDATION_ERROR,
            statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
            details,
            requestId,
          },
        });
      }

      // Handle Fastify built-in schema validation errors
      if ('validation' in error && error.validation) {
        request.log.warn(
          { validation: error.validation, requestId },
          'Fastify schema validation error'
        );

        return reply.status(HttpStatus.BAD_REQUEST).send({
          success: false,
          error: {
            message: error.message,
            code: ErrorCode.VALIDATION_ERROR,
            statusCode: HttpStatus.BAD_REQUEST,
            requestId,
          },
        });
      }

      // Handle other Fastify HTTP errors
      if ('statusCode' in error && typeof error.statusCode === 'number') {
        request.log.warn({ err: error, requestId }, error.message);

        return reply.status(error.statusCode).send({
          success: false,
          error: {
            message: error.message,
            code: error.code || ErrorCode.BAD_REQUEST,
            statusCode: error.statusCode,
            requestId,
          },
        });
      }

      // Unhandled unexpected exceptions (500)
      request.log.error({ err: error, requestId }, 'Unhandled internal server error');

      return reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
        success: false,
        error: {
          message: 'An unexpected internal server error occurred',
          code: ErrorCode.INTERNAL_ERROR,
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          requestId,
        },
      });
    }
  );
}
