"use client";

import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { DashboardUI } from "./ui";

export default function DashboardPage() {
  const { address } = useAccount();

  const { data: dashboard } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.getDashboard(),
  });

  const { data: positions } = useQuery({
    queryKey: ["positions", address],
    queryFn: () => api.getOpenPositions(address!),
    enabled: !!address,
  });

  return (
    <DashboardUI
      address={address}
      dashboard={dashboard}
      positions={positions}
    />
  );
}
