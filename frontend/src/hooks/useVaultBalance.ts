import { useReadContract } from "wagmi";
import { formatEther } from "viem";
import { VAULT_ADDRESS, VAULT_ABI } from "@/lib/contracts";
import type { Address } from "viem";

export function useVaultBalance(address: Address | undefined) {
  const total = useReadContract({
    address: VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 15_000 },
  });

  const available = useReadContract({
    address: VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: "availableBalance",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 15_000 },
  });

  const locked = useReadContract({
    address: VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: "getLockedMargin",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 15_000 },
  });

  return {
    total:     total.data     != null ? formatEther(total.data)     : null,
    available: available.data != null ? formatEther(available.data) : null,
    locked:    locked.data    != null ? formatEther(locked.data)    : null,
    isLoading: total.isLoading,
  };
}
