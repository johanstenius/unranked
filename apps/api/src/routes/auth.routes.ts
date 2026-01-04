import { Hono } from "hono";
import { auth } from "../lib/auth.js";

export const authRoutes = new Hono();

authRoutes.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));
