import { createFileRoute, redirect } from "@tanstack/react-router";
import { homeFor, meQuery } from "@/lib/session";
import { Spinner } from "@/components/gj";

export const Route = createFileRoute("/_authenticated/inicio")({
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.fetchQuery({ ...meQuery, staleTime: 0 });
    throw redirect({ to: homeFor(me), replace: true });
  },
  component: () => <Spinner />,
});
