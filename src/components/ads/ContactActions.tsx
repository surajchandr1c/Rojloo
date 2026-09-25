import Button from "@/components/ui/button";
import { cn } from "@/lib/cn";

type ContactActionsProps = {
  phone?: string;
  whatsapp?: string;
  telegram?: string;
  className?: string;
  cityName?: string;
};

export default function ContactActions({
  phone,
  whatsapp,
  telegram,
  className,
  cityName,
}: ContactActionsProps) {
  if (!phone && !whatsapp && !telegram) return null;

  let whatsappUrl = "";
  if (whatsapp) {
    const cleanNumber = whatsapp.replace(/\D/g, "");
    const fullNumber =
      cleanNumber.length === 10
        ? `91${cleanNumber}`
        : cleanNumber.length === 11 && cleanNumber.startsWith("0")
        ? `91${cleanNumber.slice(1)}`
        : cleanNumber;

    const message = cityName?.trim()
      ? `I saw your ad on rojloo, in ${cityName.trim()}, and I'd like to meet you.`
      : `I saw your ad on rojloo, and I'd like to meet you.`;

    whatsappUrl = `https://wa.me/${fullNumber}?text=${encodeURIComponent(message)}`;
  }

  return (
    <div className={cn("flex flex-wrap", className ?? "gap-2")}>
      {phone && (
        <Button
          href={`tel:${phone.replace(/\s/g, "")}`}
          variant="solid"
          size="sm"
          className="!text-white"
        >
          Call
        </Button>
      )}
      {whatsapp && (
        <Button
          href={whatsappUrl}
          variant="solid"
          size="sm"
          className="!bg-gray-600 !text-white hover:!bg-gray-700"
          target="_blank"
          rel="noopener noreferrer"
        >
          WhatsApp
        </Button>
      )}
      {telegram && (
        <Button
          href={`https://t.me/${telegram.replace(/^@/, "")}`}
          variant="solid"
          size="sm"
          className="!bg-gray-500 !text-white hover:!bg-gray-600"
          target="_blank"
          rel="noopener noreferrer"
        >
          Telegram
        </Button>
      )}
    </div>
  );
}
