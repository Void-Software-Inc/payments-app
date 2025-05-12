import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Withdraw SUI Tokens",
  description: "Withdraw your SUI tokens to another wallet address",
};

export default function WithdrawLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
} 