import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import type { UserRole } from "@/generated/prisma/enums";

function parseBootstrapAdmin(): Set<string> {
  const raw = process.env.BOOTSTRAP_ADMIN_EMAILS;
  if (!raw) return new Set();
  return new Set(
    raw
      .split(/[,;]\s*/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

const bootstrap = parseBootstrapAdmin();

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email || "")
          .trim()
          .toLowerCase();
        const password = String(credentials?.password || "");
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
        });
        if (!user?.passwordHash) return null;

        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return true;
      const e = user.email.toLowerCase();
      if (bootstrap.size > 0 && bootstrap.has(e)) {
        const existing = user.id
          ? await prisma.user.findUnique({ where: { id: user.id } })
          : null;
        if (existing && existing.role !== "ADMIN") {
          await prisma.user.update({
            where: { id: existing.id },
            data: { role: "ADMIN" as UserRole },
          });
        }
      }
      return true;
    },
    async jwt({ token, user, trigger, session: triggerSession }) {
      if (user) {
        token.sub = user.id;
        if (user.email) token.email = user.email;
        if (user.name) token.name = user.name;
        if (user.image) token.picture = user.image;
        const u = await prisma.user.findUnique({
          where: { id: user.id },
          select: { id: true, role: true },
        });
        token.id = u?.id ?? user.id;
        token.role = (u?.role as UserRole) ?? "PROFESSOR";
      }
      if (
        trigger === "update" &&
        triggerSession &&
        typeof triggerSession === "object"
      ) {
        if ("role" in triggerSession && triggerSession.role) {
          token.role = triggerSession.role as UserRole;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const id = (token.id as string) || (token.sub as string) || "";
        session.user.id = id;
        if (id) {
          const u = await prisma.user.findUnique({
            where: { id },
            select: { name: true, email: true, role: true, image: true },
          });
          if (u) {
            session.user.name = u.name;
            session.user.email = u.email ?? "";
            session.user.role = u.role;
            session.user.image = u.image;
          } else {
            session.user.role = (token.role as UserRole) ?? "PROFESSOR";
            if (token.email) session.user.email = token.email as string;
            if (token.name) session.user.name = token.name as string;
            if (token.picture) session.user.image = token.picture as string;
          }
        } else {
          session.user.role = (token.role as UserRole) ?? "PROFESSOR";
          if (token.email) session.user.email = token.email as string;
          if (token.name) session.user.name = token.name as string;
          if (token.picture) session.user.image = token.picture as string;
        }
      }
      return session;
    },
  },
  events: {
    createUser: async ({ user }) => {
      if (!user.email) return;
      if (bootstrap.has(user.email.toLowerCase())) {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: "ADMIN" as UserRole },
        });
      }
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  debug: process.env.AUTH_DEBUG === "true",
});
