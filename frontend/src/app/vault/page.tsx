"use client";

import { useAccount } from "wagmi";
import { VaultUI } from "./ui";

export default function VaultPage() {
  const { address } = useAccount();
  return <VaultUI address={address} />;
}
