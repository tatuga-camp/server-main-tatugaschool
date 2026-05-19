import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Type,
  UnauthorizedException,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import fastifyPassport from '@fastify/passport';

// AuthenticateCallback signature per @fastify/passport README.
type AuthCb = (
  req: FastifyRequest,
  reply: FastifyReply,
  err: Error | null,
  user: unknown | false,
  info?: unknown,
  status?: number | number[],
) => Promise<void>;

export function createFastifyPassportGuard(
  strategyName: string,
  options: Record<string, unknown> = { session: false },
): Type<CanActivate> {
  @Injectable()
  class MixinGuard implements CanActivate {
    async canActivate(context: ExecutionContext): Promise<boolean> {
      const req = context.switchToHttp().getRequest<FastifyRequest>();
      const reply = context.switchToHttp().getResponse<FastifyReply>();
      return new Promise<boolean>((resolve, reject) => {
        const cb: AuthCb = async (_req, _reply, err, user, info, status) => {
          try {
            const resolved = (this as any).handleRequest(err, user, info, status);
            (req as any).user = resolved;
            resolve(true);
          } catch (e) {
            reject(e);
          }
        };
        const hook = (fastifyPassport.authenticate as any)(
          strategyName,
          options,
          cb,
        );
        Promise.resolve(hook(req, reply)).catch(reject);
      });
    }

    handleRequest(err: unknown, user: unknown, _info?: unknown): unknown {
      if (err || !user) throw new UnauthorizedException('Access denied');
      return user;
    }
  }
  return MixinGuard;
}
