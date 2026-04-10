"use client";

import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { useReadContract } from "wagmi";
import { api } from "@/lib/api";
import { CONTRACTS, VAULT_ABI } from "@/lib/contracts";
import { VaultUI } from "./ui";

export default function VaultPage() {
  const { address } = useAccount();

  const { data: balance } = useReadContract({
    address: CONTRACTS.vault as `0x${string}`,
    abi: VAULT_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!CONTRACTS.vault },
  });

  const { data: history } = useQuery({
    queryKey: ["vault-history", address],
    queryFn: () => api.getVaultHistory(address!),
    enabled: !!address,
  });

  return <VaultUI address={address} balance={balance} history={history} />;
}
