import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Router } from "express";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Silent Review API",
      version: "0.1.0",
      description: "API for the Silent Review mobile web app.",
    },
    servers: [
      { url: "http://localhost:3001", description: "Local development" },
      { url: "/api", description: "Production (same origin)" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: ["./src/routes/*.ts", "./src/*/routes.ts", "./src/*/*.routes.ts"],
};

const specs = swaggerJsdoc(options);

export const docsRouter = Router();
docsRouter.use("/", swaggerUi.serve, swaggerUi.setup(specs));
