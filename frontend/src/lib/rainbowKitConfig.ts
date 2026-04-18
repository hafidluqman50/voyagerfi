import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'viem';
import { mantleSepoliaTestnet, sepolia, zeroGMainnet } from 'wagmi/chains'

export const config = getDefaultConfig({
  appName: 'LendingRWA',
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID!,
  chains: [zeroGMainnet],
  transports: {
      [zeroGMainnet.id]: http(), 
    },
});