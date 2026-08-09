import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { ContactPanel } from "@/components/chat/ContactPanel";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

export const Route = createFileRoute("/_authed/conversations/$conversationId")({
  ssr: false,
  component: ConversationDetail,
});

function ConversationDetail() {
  const { conversationId } = Route.useParams();
  const navigate = useNavigate();
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <div className="grid h-full min-h-0 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-h-0">
        <ChatPanel
          key={conversationId}
          conversationId={conversationId}
          onBack={() => void navigate({ to: "/conversations" })}
          onOpenContact={() => setContactOpen(true)}
        />
      </div>
      <div className="hidden min-h-0 border-s xl:block">
        <ContactPanel conversationId={conversationId} />
      </div>

      <Sheet open={contactOpen} onOpenChange={setContactOpen}>
        <SheetContent side="left" className="w-80 p-0">
          <SheetTitle className="border-b px-4 py-3 text-sm">اطلاعات مخاطب</SheetTitle>
          <ContactPanel conversationId={conversationId} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
