import { useMutation, useQueryClient } from "@tanstack/react-query";
import { estimateFeesPerGas, readContract, waitForTransactionReceipt } from "@wagmi/core";
import { parseUnits } from "viem";
import { useAccount, useConfig, useWriteContract } from "wagmi";
import { USDC_ADDRESS, USDC_ABI, VAULT_ADDRESS, VAULT_ABI } from "@/lib/contracts";
import { api } from "@/lib/api";

const USDC_DECIMALS = 6;

async function freshGas(config: ReturnType<typeof useConfig>) {
  const fees = await estimateFeesPerGas(config);
  return {
    maxFeePerGas:         (fees.maxFeePerGas         * 130n) / 100n,
    maxPriorityFeePerGas: (fees.maxPriorityFeePerGas * 130n) / 100n,
  };
}

export function useDeposit() {
  const { address } = useAccount();
  const config = useConfig();
  const { writeContractAsync } = useWriteContract();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (amount: string) => {
      if (!address) throw new Error("Wallet not connected");

      const amountWei = parseUnits(amount, USDC_DECIMALS);

      const allowance = await readContract(config, {
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: "allowance",
        args: [address, VAULT_ADDRESS],
      }) as bigint;

      if (allowance < amountWei) {
        const approveTx = await writeContractAsync({
          address: USDC_ADDRESS,
          abi: USDC_ABI,
          functionName: "approve",
          args: [VAULT_ADDRESS, amountWei],
          ...(await freshGas(config)),
        });
        await waitForTransactionReceipt(config, { hash: approveTx });
      }

      const depositTx = await writeContractAsync({
        address: VAULT_ADDRESS,
        abi: VAULT_ABI,
        functionName: "deposit",
        args: [amountWei],
        ...(await freshGas(config)),
      });
      await waitForTransactionReceipt(config, { hash: depositTx });

      api.recordVaultEvent(address, {
        event_type: "deposit",
        amount: amountWei.toString(),
        tx_hash: depositTx,
      }).then(() => queryClient.invalidateQueries({ queryKey: ["vault-pnl", address] }))
        .catch(() => {});
    },
  });
}
