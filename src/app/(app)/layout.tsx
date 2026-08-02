import TabBar from "@/components/TabBar";

/**
 * Shell for the tabbed part of the app. The active-workout logger deliberately
 * sits outside this group so it can take over the whole screen, the way a
 * modal does on iOS.
 */
export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <main
        className="flex-1"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          // Clear the 49pt tab bar plus the home indicator.
          paddingBottom: "calc(49px + env(safe-area-inset-bottom) + 24px)",
        }}
      >
        {children}
      </main>
      <TabBar />
    </div>
  );
}
