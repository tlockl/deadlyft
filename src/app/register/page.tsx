import type { Metadata } from "next";
import RegisterForm from "@/components/RegisterForm";
import { DumbbellIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Sign Up · Reps" };

export default function RegisterPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-8 flex flex-col items-center text-center">
        <DumbbellIcon className="h-11 w-11 text-accent" />
        <h1 className="mt-3 text-[28px] leading-[34px] font-bold tracking-[-0.4px]">
          Create your account
        </h1>
        <p className="mt-1 text-[15px] text-label2">
          Everyone gets their own private workout log.
        </p>
      </div>
      <RegisterForm />
    </div>
  );
}
