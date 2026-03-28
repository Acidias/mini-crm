import { signIn } from "@/auth";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="bg-card-bg rounded-xl border border-border p-8 w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold mb-2">Mini CRM</h1>
        <p className="text-muted text-sm mb-6">Sign in to continue</p>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="w-full bg-foreground text-background px-5 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Sign in with Google
          </button>
        </form>
        <p className="text-muted text-xs mt-4">
          Access restricted to authorised accounts only.
        </p>
      </div>
    </div>
  );
}
