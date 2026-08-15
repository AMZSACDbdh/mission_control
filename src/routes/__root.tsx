import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Upload, X } from "lucide-react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Sidebar } from "@/components/mission/Sidebar";
import { ActivityProvider } from "@/hooks/use-activity";
import { ProgressionProvider } from "@/hooks/use-progression";
import { CeremonyOverlay } from "@/components/mission/Ceremony";
import { StorageAlert } from "@/components/mission/StorageAlert";
import { isTauri } from "@/platform";
import { KEYS, readJson, writeJson } from "@/services/store";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Mission Control — Master Your Mission" },
      {
        name: "description",
        content: "A luxury personal operating system for focused, disciplined days.",
      },
      { property: "og:title", content: "Mission Control — Master Your Mission" },
      {
        property: "og:description",
        content: "A luxury personal operating system for focused, disciplined days.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Inter:wght@400;500;600&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

/**
 * Shown exactly once, on the first launch of the desktop (Tauri) build, to
 * tell the user that their web data can be imported from a backup file.
 *
 * The welcomed key is written on dismiss (or after a successful import in
 * Settings), so the banner never appears again. It does not block the app,
 * and it does not render at all on the web build.
 */
function DesktopMigrationBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isTauri()) return;
    void readJson<boolean>(KEYS.desktopWelcomed, false).then((welcomed) => {
      if (!welcomed) setShow(true);
    });
  }, []);

  const dismiss = () => {
    setShow(false);
    void writeJson(KEYS.desktopWelcomed, true);
  };

  if (!show) return null;

  return (
    <div
      role="status"
      className="mb-6 flex flex-wrap items-start gap-4 rounded-xl border border-gold/40 bg-gold/8 p-4"
    >
      <Upload className="mt-0.5 size-5 shrink-0 text-gold" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">Welcome to the desktop app</p>
        <p className="mt-1 text-[0.78rem] leading-relaxed text-muted-foreground">
          If you have been using Mission Control in a browser, go to{" "}
          <Link to="/settings" className="text-gold underline-offset-2 hover:underline">
            Settings
          </Link>{" "}
          and use <span className="text-foreground">Restore From File</span> to import your backup.
          Your ledger, missions, journal and training history will all transfer — only your YouTube
          API key must be re-entered.
        </p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="mt-0.5 shrink-0 cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Wraps the Sidebar too, so rank and XP stay in step with every page. */}
      <ActivityProvider>
        <ProgressionProvider>
          <div className="flex min-h-screen bg-background">
            <Sidebar />
            <main className="min-w-0 flex-1 px-6 py-8 lg:px-10 lg:py-10">
              <div className="mx-auto w-full max-w-[1400px]">
                {/* First-launch desktop migration hint — no-ops on web. */}
                <DesktopMigrationBanner />
                {/* Data-safety warnings outrank every page. */}
                <StorageAlert />
                {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
                <Outlet />
              </div>
            </main>
          </div>
          {/* Ceremonies are global — they can fire from any page. */}
          <CeremonyOverlay />
        </ProgressionProvider>
      </ActivityProvider>
    </QueryClientProvider>
  );
}
