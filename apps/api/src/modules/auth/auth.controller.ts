import { HttpStatus } from '@sso/shared';
import {
  ForgotPasswordInput,
  LoginInput,
  ResetPasswordInput,
  SsoCallbackQuery,
  SsoStartInput,
  SwitchOrganizationInput,
} from '@sso/validation';
import { FastifyReply, FastifyRequest } from 'fastify';
import { serverConfig } from '../../config/index.js';
import { SESSION_COOKIE_NAME } from '../../common/auth-guard.js';
import { authService, AuthService } from './auth.service.js';

export class AuthController {
  constructor(private readonly service: AuthService = authService) {}

  private setSessionCookie(reply: FastifyReply, rawToken: string) {
    reply.setCookie(SESSION_COOKIE_NAME, rawToken, {
      path: '/',
      httpOnly: true,
      secure: serverConfig.isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });
  }

  private clearSessionCookie(reply: FastifyReply) {
    reply.clearCookie(SESSION_COOKIE_NAME, {
      path: '/',
      httpOnly: true,
      secure: serverConfig.isProduction,
      sameSite: 'lax',
    });
  }

  login = async (request: FastifyRequest<{ Body: LoginInput }>, reply: FastifyReply) => {
    const ipAddress = request.ip;
    const userAgent = request.headers['user-agent'];

    const result = await this.service.login(request.body, ipAddress, userAgent);
    this.setSessionCookie(reply, result.rawToken);

    return reply.status(HttpStatus.OK).send({
      success: true,
      data: {
        user: result.user,
        session: result.session,
        activeOrganizationId: result.activeOrganizationId,
      },
    });
  };

  logout = async (request: FastifyRequest, reply: FastifyReply) => {
    const ipAddress = request.ip;
    const userAgent = request.headers['user-agent'];

    if (request.session && request.user) {
      await this.service.logout(request.session.id, request.user.id, ipAddress, userAgent);
    }

    this.clearSessionCookie(reply);

    return reply.status(HttpStatus.OK).send({
      success: true,
      data: { loggedOut: true },
    });
  };

  me = async (request: FastifyRequest, reply: FastifyReply) => {
    const profile = await this.service.getCurrentUser(request.user!, request.session);

    return reply.status(HttpStatus.OK).send({
      success: true,
      data: profile,
    });
  };

  forgotPassword = async (
    request: FastifyRequest<{ Body: ForgotPasswordInput }>,
    reply: FastifyReply
  ) => {
    const ipAddress = request.ip;
    const userAgent = request.headers['user-agent'];

    const result = await this.service.forgotPassword(request.body, ipAddress, userAgent);

    return reply.status(HttpStatus.OK).send({
      success: true,
      data: result,
    });
  };

  resetPassword = async (
    request: FastifyRequest<{ Body: ResetPasswordInput }>,
    reply: FastifyReply
  ) => {
    const ipAddress = request.ip;
    const userAgent = request.headers['user-agent'];

    const result = await this.service.resetPassword(request.body, ipAddress, userAgent);
    this.clearSessionCookie(reply);

    return reply.status(HttpStatus.OK).send({
      success: true,
      data: result,
    });
  };

  switchOrganization = async (
    request: FastifyRequest<{ Body: SwitchOrganizationInput }>,
    reply: FastifyReply
  ) => {
    const ipAddress = request.ip;
    const userAgent = request.headers['user-agent'];
    const sessionId = request.session!.id;
    const userId = request.user!.id;

    const result = await this.service.switchOrganization(
      sessionId,
      userId,
      request.body.organizationId,
      ipAddress,
      userAgent
    );

    this.setSessionCookie(reply, result.rawToken);

    return reply.status(HttpStatus.OK).send({
      success: true,
      data: {
        session: result.session,
      },
    });
  };

  ssoDiscover = async (
    request: FastifyRequest<{ Querystring: { query: string } }>,
    reply: FastifyReply
  ) => {
    const result = await this.service.ssoDiscover(request.query.query);

    return reply.status(HttpStatus.OK).send({
      success: true,
      data: result,
    });
  };

  ssoStart = async (request: FastifyRequest<{ Body: SsoStartInput }>, reply: FastifyReply) => {
    const ipAddress = request.ip;
    const userAgent = request.headers['user-agent'];

    const result = await this.service.ssoStart(request.body, ipAddress, userAgent);

    return reply.status(HttpStatus.OK).send({
      success: true,
      data: result,
    });
  };

  ssoCallback = async (
    request: FastifyRequest<{ Querystring: SsoCallbackQuery }>,
    reply: FastifyReply
  ) => {
    const ipAddress = request.ip;
    const userAgent = request.headers['user-agent'];

    const result = await this.service.ssoCallback(request.query, ipAddress, userAgent);
    this.setSessionCookie(reply, result.rawToken);

    return reply.status(HttpStatus.OK).send({
      success: true,
      data: {
        user: result.user,
        session: result.session,
        activeOrganizationId: result.activeOrganizationId,
      },
    });
  };

  getCsrfToken = async (_request: FastifyRequest, reply: FastifyReply) => {
    // Generate CSRF token if csrf protection plugin is registered
    const csrfToken = typeof reply.generateCsrf === 'function' ? reply.generateCsrf() : 'dev-csrf-token';

    return reply.status(HttpStatus.OK).send({
      success: true,
      data: {
        csrfToken,
      },
    });
  };
}

export const authController = new AuthController();
