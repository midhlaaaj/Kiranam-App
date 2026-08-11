import type { Metadata } from "next";
import { JoinRedirect } from "./JoinRedirect";

export const metadata: Metadata = {
  title: "Join Kiranam",
  description: "Get the Kiranam app.",
};

export default function JoinPage() {
  return <JoinRedirect />;
}
