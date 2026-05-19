import 'fastify';
import { UserJwtPayload, StudentJwtPayload } from '../interfaces/jwt-payload';
import { GoogleProfile } from '../auth/strategy/google-oauth.strategy';

declare module 'fastify' {
  interface FastifyRequest {
    user?: UserJwtPayload | StudentJwtPayload | GoogleProfile;
  }
}
