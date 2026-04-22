import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import MicrosoftEntraId from "next-auth/providers/microsoft-entra-id";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/generated/prisma/enums";

const entra = MicrosoftEntraId({
  clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID!,
  clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!,
  issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
  authorization: {
    params: {
      prompt: "select_account",
      scope:
        "openid profile email offline_access https://graph.microsoft.com/Files.Read https://graph.microsoft.com/Files.ReadWrite",
    },
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const allProviders: any[] = [entra];

if (
  process.env.ALLOW_DEV_PASSWORD_LOGIN === "true" &&
  process.env.NODE_ENV === "development" &&
  process.env.AUTH_DEV_EMAIL &&
  process.env.AUTH_DEV_PASSWORD
) {
  allProviders.push(
    Credentials({
      id: "dev-credentials",
      name: "Development",
      credentials: {
        email: { label: "Email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (
          credentials?.email === process.env.AUTH_DEV_EMAIL &&
          credentials?.password === process.env.AUTH_DEV_PASSWORD
        ) {
          let u = await prisma.user.findUnique({
            where: { email: process.env.AUTH_DEV_EMAIL! },
          });
          if (!u) {
            u = await prisma.user.create({
              data: {
                email: process.env.AUTH_DEV_EMAIL!,
                name: "Dev user",
                role: "ADMIN",
              },
            });
          }
          return { id: u.id, email: u.email, name: u.name, image: u.image };
        }
        return null;
      },
    })
  );
}

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
  providers: allProviders,
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
      if (trigger === "update" && triggerSession && typeof triggerSession === "object") {
        if ("role" in triggerSession && triggerSession.role) {
          token.role = triggerSession.role as UserRole;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? token.sub ?? "";
        session.user.role = (token.role as UserRole) ?? "PROFESSOR";
        if (token.email) session.user.email = token.email as string;
        if (token.name) session.user.name = token.name as string;
        if (token.picture) session.user.image = token.picture as string;
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
