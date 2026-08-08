import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Contact2, MessageSquare, MessagesSquare } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { globalSearch } from "@/services/api/search";
import { formatSmart } from "@/utils/format";

export function GlobalSearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(timer);
  }, [query]);

  const { data } = useQuery({
    queryKey: ["global-search", debounced],
    queryFn: () => globalSearch(debounced),
    enabled: debounced.trim().length > 0,
  });

  const go = (path: { to: string; search?: Record<string, string> }) => {
    onOpenChange(false);
    setQuery("");
    void navigate(path as never);
  };

  const hasResults =
    (data?.contacts.length ?? 0) + (data?.conversations.length ?? 0) + (data?.messages.length ?? 0) >
    0;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="جستجوی نام مخاطب، شماره، شناسه روبیکا یا متن پیام..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {debounced.trim().length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-muted-foreground">
            برای جستجو عبارتی بنویسید.
          </div>
        ) : !hasResults ? (
          <CommandEmpty>نتیجه‌ای پیدا نشد.</CommandEmpty>
        ) : null}

        {data?.contacts.length ? (
          <CommandGroup heading="مخاطبین">
            {data.contacts.map((contact) => (
              <CommandItem
                key={contact.id}
                value={`contact-${contact.id}-${contact.name}`}
                onSelect={() => go({ to: "/contacts", search: { id: contact.id } })}
              >
                <Contact2 className="size-4" />
                <span className="font-medium">{contact.name}</span>
                <span className="ms-auto text-[11px] text-muted-foreground">{contact.phone}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}

        {data?.conversations.length ? (
          <CommandGroup heading="گفتگوها">
            {data.conversations.map((conversation) => (
              <CommandItem
                key={conversation.id}
                value={`conv-${conversation.id}-${conversation.contactName}`}
                onSelect={() => go({ to: "/conversations", search: { c: conversation.id } })}
              >
                <MessagesSquare className="size-4" />
                <span className="font-medium">{conversation.contactName}</span>
                <span className="truncate text-[11px] text-muted-foreground">
                  {conversation.lastMessagePreview}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}

        {data?.messages.length ? (
          <CommandGroup heading="پیام‌ها">
            {data.messages.map((message) => (
              <CommandItem
                key={message.id}
                value={`msg-${message.id}`}
                onSelect={() => go({ to: "/conversations", search: { c: message.conversationId } })}
              >
                <MessageSquare className="size-4" />
                <span className="truncate">{message.text}</span>
                <span className="ms-auto shrink-0 text-[11px] text-muted-foreground">
                  {message.contactName} · {formatSmart(message.createdAt)}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
      </CommandList>
    </CommandDialog>
  );
}
