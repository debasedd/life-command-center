import { redirect } from "next/navigation";
import { getAuthUserId } from "@/lib/auth";
import AuthForm from "@/components/auth-form";

export default async function LoginPage() {
  if (await getAuthUserId()) redirect("/home");
  return (
    <main className="min-h-screen flex flex-col justify-center px-6 max-w-md mx-auto safe-top safe-bottom">
      <div className="text-center mb-10">
        <div className="text-5xl mb-3">🧭</div>
        <h1 className="text-2xl font-bold">Life Command Center</h1>
        <p className="text-zinc-500 text-sm mt-1">All-in-One Life OS kamu</p>
      </div>
      <AuthForm mode="login" />
    </main>
  );
}