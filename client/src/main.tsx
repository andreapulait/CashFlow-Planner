import { trpc } from "@/lib/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Non riprovare su errori di autenticazione — causerebbe loop infiniti
      retry: (failureCount, error) => {
        if (error instanceof TRPCClientError) {
          const code = (error as TRPCClientError<any>).data?.code;
          if (code === "UNAUTHORIZED" || code === "FORBIDDEN") return false;
        }
        return failureCount < 3;
      },
    },
  },
});

// Se la sessione scade, invalida auth.me → il dialog di login compare
// senza ricaricare la pagina (window.reload causava un loop infinito)
const handleUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;
  const code = (error as TRPCClientError<any>).data?.code;
  if (code === "UNAUTHORIZED" || code === "FORBIDDEN") {
    queryClient.invalidateQueries({ queryKey: [["auth", "me"]] });
  }
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    handleUnauthorized(event.query.state.error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    handleUnauthorized(event.mutation.state.error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
