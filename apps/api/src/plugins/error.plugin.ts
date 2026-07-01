// Error handler — memetakan AppError ke status code yang konsisten.
import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { AppError } from "../shared/errors.js";

const errorPlugin = async (fastify: FastifyInstance) => {
  fastify.setErrorHandler((err: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    if (err instanceof AppError) {
      return reply.status(err.statusCode).send({
        error: {
          code: err.code ?? "APP_ERROR",
          message: err.message,
          details: err.details,
        },
      });
    }

    // Fastify validation errors
    const ve = (err as FastifyError).validation;
    if (ve) {
      return reply.status(400).send({
        error: { code: "VALIDATION_ERROR", message: err.message, details: ve },
      });
    }

    request.log.error({ err }, "Unhandled error");
    return reply.status(500).send({
      error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan pada server." },
    });
  });
};

export default fp(errorPlugin, { name: "error-handler" });