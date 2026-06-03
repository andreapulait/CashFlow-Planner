// Componente non utilizzato — residuo template Manus

export type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

export function AIChatBox(_props?: {
  messages?: Message[];
  onSendMessage?: (content: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  height?: string;
  emptyStateMessage?: string;
  suggestedPrompts?: string[];
}) {
  return null;
}
