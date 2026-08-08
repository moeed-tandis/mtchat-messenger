import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { initials } from "@/utils/format";

const palette = [
  "bg-chart-1/15 text-chart-1",
  "bg-chart-2/15 text-chart-2",
  "bg-chart-3/15 text-chart-3",
  "bg-chart-4/20 text-chart-4",
  "bg-chart-5/15 text-chart-5",
];

function hash(value: string) {
  let sum = 0;
  for (let i = 0; i < value.length; i += 1) sum += value.charCodeAt(i);
  return sum;
}

export function UserAvatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const tone = palette[hash(name) % palette.length]!;
  return (
    <Avatar className={cn("size-10", className)}>
      <AvatarFallback className={cn("text-xs font-semibold", tone)}>
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
