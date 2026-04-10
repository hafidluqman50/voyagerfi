"use client";

import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PositionsUI } from "./ui";

export default function PositionsPage() {
  const { address } = useAccount();

  const { data: positions } = useQuery({
    queryKey: ["positions", address],
    queryFn: () => api.getPositions(address!),
    enabled: !!address,
  });

  return <PositionsUI address={address} positions={positions} />;
}
