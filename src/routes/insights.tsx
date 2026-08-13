import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/mission/ComingSoon";

const title = "Insights — Mission Control";
const description = "Understand learning consistency and subject performance metrics.";

export const Route = createFileRoute("/insights")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: () => <ComingSoon title="Insights" note={description} />,
});
