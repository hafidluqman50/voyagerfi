"use client";

import { useAccount } from "wagmi";
import { DashboardUI } from "./ui";

export default function DashboardPage() {
  const { address } = useAccount();
  return <DashboardUI address={address} />;
}
