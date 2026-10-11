"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const supabase = createClient();
      const { data, error } =
        mode === "signin"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({ email, password });
      if (error) return setMessage(error.message);
      if (mode === "signup" && !data.session) {
        return setMessage("สมัครแล้ว ตรวจสอบอีเมลเพื่อยืนยัน จากนั้นเข้าสู่ระบบ");
      }
      router.replace("/");
      router.refresh();
    } catch (err) {
      // e.g. missing env vars in the build, or the network dropped mid-request
      setMessage(
        `เชื่อมต่อไม่สำเร็จ: ${err instanceof Error ? err.message : "ไม่ทราบสาเหตุ"}`,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-sm flex-1 px-4 py-16">
      <h1 className="text-2xl font-bold">บันทึกฝึกงาน</h1>
      <p className="mt-1 text-sm text-stone-500">เข้าสู่ระบบเพื่อจัดการอัลบั้มของคุณ</p>
      <form onSubmit={submit} className="mt-8 space-y-3">
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="อีเมล"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-3 text-base"
        />
        <input
          type="password"
          required
          minLength={6}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          placeholder="รหัสผ่าน"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-3 text-base"
        />
        <button
          disabled={busy}
          className="w-full rounded-lg bg-stone-900 px-3 py-3 font-medium text-white disabled:opacity-50"
        >
          {mode === "signin" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
        </button>
        {message && <p className="text-sm text-red-600">{message}</p>}
      </form>
      <button
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        className="mt-4 text-sm text-stone-500 underline"
      >
        {mode === "signin" ? "ยังไม่มีบัญชี? สมัครสมาชิก" : "มีบัญชีแล้ว? เข้าสู่ระบบ"}
      </button>
    </main>
  );
}
