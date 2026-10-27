import type { LucideIcon } from "lucide-react";
import {
  LayoutGrid, ReceiptText, WalletCards, Target, FileText,
  ArrowLeftRight, Percent, History, Lightbulb, Settings2,
} from "lucide-react";

export interface Tab {
  id: string;
  href: string;
  name: string;
  short: string;
  icon: LucideIcon;
}

export const TABS: Tab[] = [
  { id: "dash",   href: "/",           name: "Dashboard", short: "Home",     icon: LayoutGrid },
  { id: "log",    href: "/log",        name: "Money log", short: "Log",      icon: ReceiptText },
  { id: "bills",  href: "/bills",      name: "Bills",     short: "Bills",    icon: FileText },
  { id: "env",    href: "/envelopes",  name: "Envelopes", short: "Wallet",   icon: WalletCards },
  { id: "goals",  href: "/goals",      name: "Goals",     short: "Goals",    icon: Target },
  { id: "rebal",  href: "/rebalance",  name: "Rebalance", short: "Balance",  icon: ArrowLeftRight },
  { id: "tax",    href: "/tax",        name: "Tax",       short: "Tax",      icon: Percent },
  { id: "hist",   href: "/history",    name: "History",   short: "History",  icon: History },
  { id: "ins",    href: "/insights",   name: "Insights",  short: "Insights", icon: Lightbulb },
  { id: "set",    href: "/setup",      name: "Setup",     short: "Setup",    icon: Settings2 },
];

/** The five that earn a permanent slot on a phone. */
export const PHONE_TABS = ["dash", "add", "env", "goals", "more"];
export const MORE_TABS = ["log", "bills", "rebal", "tax", "hist", "ins", "set"];
