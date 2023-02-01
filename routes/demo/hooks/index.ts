import type { FastifyReply, FastifyRequest } from 'fastify';

export async function redirectIfNotLogin(req: FastifyRequest, reply: FastifyReply) {
  if (!req.auth.login) {
    const qs = new URLSearchParams({ to: req.url });
    return reply.redirect(`/demo/login?${qs.toString()}`);
  }
}
