import '@/lib/errorReporter';
import { enableMapSet } from "immer";
enableMapSet();
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import '@/index.css'
import { HomePage } from '@/pages/HomePage'

const queryClient = new QueryClient();

const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <HomePage />,
      errorElement: <RouteErrorBoundary />,
    },
  ],
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    },
  }
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <RouterProvider
          router={router}
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        />
      </ErrorBoundary>
    </QueryClientProvider>
  </StrictMode>,
)
   