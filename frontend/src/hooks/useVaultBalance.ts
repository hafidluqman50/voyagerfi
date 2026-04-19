import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { VAULT_ADDRESS, VAULT_ABI } from "@/lib/contracts";
import type { Address } from "viem";

const USDC_DECIMALS = 6;

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
    total:     total.data     != null ? formatUnits(total.data,     USDC_DECIMALS) : null,
    available: available.data != null ? formatUnits(available.data, USDC_DECIMALS) : null,
    locked:    locked.data    != null ? formatUnits(locked.data,    USDC_DECIMALS) : null,
    isLoading: total.isLoading,
  };
}
