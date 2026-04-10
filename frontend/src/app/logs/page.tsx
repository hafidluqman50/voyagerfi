"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { LogsUI } from "./ui";

export default function LogsPage() {
  const { data: dashboard } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.getDashboard(),
  });

  return <LogsUI dashboard={dashboard} />;
}
