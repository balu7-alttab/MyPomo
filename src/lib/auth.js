import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  events: {
    async createUser({ user }) {
      // Seed default categories for new users
      await prisma.category.createMany({
        data: [
          { userId: user.id, name: 'Work', color: '#3b82f6', icon: '💼' },
          { userId: user.id, name: 'Study', color: '#8b5cf6', icon: '📚' },
          { userId: user.id, name: 'Personal', color: '#10b981', icon: '🧘' }
        ]
      });
    }
  },
  ...authConfig,
});
