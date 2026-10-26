import { WifiOff } from "lucide-react";

export const metadata = { title: "No connection" };

export default function OfflinePage() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <span className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-fill-2 text-muted-foreground">
          <WifiOff className="size-6" />
        </span>
        <h1 className="text-xl font-bold tracking-[-0.024em]">No connection</h1>
        <p className="mx-auto mt-1.5 max-w-[38ch] text-[14px] text-muted-foreground">
          Your figures live on your account, so they come back as soon as you are online. Nothing has been lost.
        </p>
      </div>
    </main>
  );
}
