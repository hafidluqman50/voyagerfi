import { useMutation, useQueryClient } from "@tanstack/react-query";
import { estimateFeesPerGas, waitForTransactionReceipt } from "@wagmi/core";
import { parseUnits } from "viem";
import { useAccount, useConfig, useWriteContract } from "wagmi";
import { VAULT_ADDRESS, VAULT_ABI } from "@/lib/contracts";
import { api } from "@/lib/api";

const USDC_DECIMALS = 6;

async function freshGas(config: ReturnType<typeof useConfig>) {
  const fees = await estimateFeesPerGas(config);
  return {
    maxFeePerGas:         (fees.maxFeePerGas         * 130n) / 100n,
    maxPriorityFeePerGas: (fees.maxPriorityFeePerGas * 130n) / 100n,
  };
}

export function useWithdraw() {
  const { address } = useAccount();
  const config = useConfig();
  const { writeContractAsync } = useWriteContract();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (amount: string) => {
      if (!address) throw new Error("Wallet not connected");

      const amountWei = parseUnits(amount, USDC_DECIMALS);

      const withdrawTx = await writeContractAsync({
        address: VAULT_ADDRESS,
        abi: VAULT_ABI,
        functionName: "withdraw",
        args: [amountWei],
        ...(await freshGas(config)),
      });
      await waitForTransactionReceipt(config, { hash: withdrawTx });

      api.recordVaultEvent(address, {
        event_type: "withdraw",
        amount: amountWei.toString(),
        tx_hash: withdrawTx,
      }).then(() => queryClient.invalidateQueries({ queryKey: ["vault-pnl", address] }))
        .catch(() => {});
    },
  });
}
