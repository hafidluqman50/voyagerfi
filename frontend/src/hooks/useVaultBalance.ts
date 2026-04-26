import { useReadContracts, useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { VAULT_ADDRESS, VAULT_ABI } from "@/lib/contracts";
import type { Address } from "viem";

const USDC_DECIMALS = 6;

export function useVaultBalance(address: Address | undefined) {
  const { data: poolData, isLoading: poolLoading } = useReadContracts({
    contracts: [
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "poolBalance" } as const,
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "deployedAmount" } as const,
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "totalShares" } as const,
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "pendingManagementFee" } as const,
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "highWaterMark" } as const,
    ],
    query: { refetchInterval: 15_000 },
  });

  const { data: userValue, isLoading: uvLoading } = useReadContract({
    address: VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: "userValue",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 15_000 },
  });

  const { data: userShares } = useReadContract({
    address: VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: "sharesOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 15_000 },
  });

  const fmt = (v: bigint | undefined) =>
    v != null ? formatUnits(v, USDC_DECIMALS) : null;

  const poolBalance    = poolData?.[0]?.result as bigint | undefined;
  const deployedAmount = poolData?.[1]?.result as bigint | undefined;
  const totalShares    = poolData?.[2]?.result as bigint | undefined;
  const pendingMgmtFee = poolData?.[3]?.result as bigint | undefined;
  const highWaterMark  = poolData?.[4]?.result as bigint | undefined;

  const liquidBalance = poolBalance != null && deployedAmount != null
    ? poolBalance - deployedAmount
    : undefined;

  const userSharePct =
    userShares != null && totalShares != null && totalShares > BigInt(0)
      ? Number((userShares * BigInt(10000)) / totalShares) / 100
      : null;

  return {
    poolBalance:    fmt(poolBalance),
    deployedAmount: fmt(deployedAmount),
    liquidBalance:  fmt(liquidBalance),
    totalShares:    fmt(totalShares),
    pendingMgmtFee: fmt(pendingMgmtFee),
    highWaterMark:  fmt(highWaterMark),
    userValue:      fmt(userValue as bigint | undefined),
    userShares:     fmt(userShares as bigint | undefined),
    userSharePct,
    isLoading: poolLoading || uvLoading,
  };
}
