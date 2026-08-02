"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, deleteSession } from "@/lib/session";

export type AuthState =
  | {
      errors?: { name?: string[]; email?: string[]; password?: string[] };
      message?: string;
      values?: { name?: string; email?: string };
    }
  | undefined;

const RegisterSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name.").max(60),
  email: z.email("Please enter a valid email address.").trim().toLowerCase(),
  // Length only, no composition rules -- long passwords beat fiddly ones.
  password: z.string().min(8, "Password must be at least 8 characters."),
  unit: z.enum(["LB", "KG"]).catch("LB"),
});

export async function register(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    unit: formData.get("unit") ?? "LB",
  };

  // Echoed back so a failed submit doesn't wipe what they typed.
  const values = {
    name: typeof raw.name === "string" ? raw.name : "",
    email: typeof raw.email === "string" ? raw.email : "",
  };

  const parsed = RegisterSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors, values };
  }

  const { name, email, password, unit } = parsed.data;

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) {
    return {
      errors: { email: ["An account with that email already exists."] },
      values,
    };
  }

  const user = await prisma.user.create({
    data: { name, email, passwordHash: await bcrypt.hash(password, 10), unit },
    select: { id: true },
  });

  await createSession(user.id);
  redirect("/");
}

// bcrypt hash of a value nobody can log in with; only used for timing parity.
const DUMMY_HASH =
  "$2b$10$CwTycUXWue0Thq9StjUM0uJ8.Qe2n1hDBmFVJ4TnQTAJcMOTGkPHu";

const LoginSchema = z.object({
  email: z.email("Please enter a valid email address.").trim().toLowerCase(),
  password: z.string().min(1, "Please enter your password."),
});

export async function login(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
  };
  const values = { email: typeof raw.email === "string" ? raw.email : "" };

  const parsed = LoginSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors, values };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, passwordHash: true },
  });

  const wrongCredentials = {
    message: "That email and password don't match.",
    values,
  };

  if (!user) {
    // Compare against a throwaway hash anyway, so an unknown email and a wrong
    // password take the same amount of time to answer.
    await bcrypt.compare(parsed.data.password, DUMMY_HASH);
    return wrongCredentials;
  }

  if (!(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return wrongCredentials;
  }

  await createSession(user.id);
  redirect("/");
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect("/login");
}
