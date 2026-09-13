import { redirect } from "next/navigation";
import { getAuthUserId } from "@/lib/auth";
import AuthForm from "@/components/auth-form";

export default async function RegisterPage() {
  if (await getAuthUserId()) redirect("/home");
  return (
    <main className="min-h-screen flex flex-col justify-center px-6 max-w-md mx-auto safe-top safe-bottom">
      <div className="text-center mb-10">
        <div className="text-5xl mb-3">🚀</div>
        <h1 className="text-2xl font-bold">Buat Akun</h1>
        <p className="text-zinc-500 text-sm mt-1">Mulai kelola hidupmu hari ini</p>
      </div>
      <AuthForm mode="register" />
    </main>
  );
}