import NextAuth from "next-auth";
import { authConfig } from "./src/lib/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    "/",
    "/timer",
    "/analytics",
    "/sessions",
    "/settings",
    "/categories"
  ],
};
