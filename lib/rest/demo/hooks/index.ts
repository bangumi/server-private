import type { FastifyReply, FastifyRequest } from 'fastify';

export async function redirectIfNotLogin(req: FastifyRequest, reply: FastifyReply) {
  if (!req.auth.login) {
    return reply.redirect('/demo/login');
  }
}
