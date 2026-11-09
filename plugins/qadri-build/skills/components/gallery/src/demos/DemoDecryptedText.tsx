import DecryptedText from "@/components/DecryptedText";
import { usePaused } from "@/gallery/state";

const CLASS = "font-mono text-2xl font-medium text-emerald-300";

export function DemoDecryptedText() {
  // The scramble runs on setInterval, which no CSS pause or motion setting
  // reaches, so a paused gallery shows the settled text instead (#68).
  if (usePaused()) return <span className={CLASS}>HACKER_TEXT</span>;
  return (
    <DecryptedText
      text="HACKER_TEXT"
      animateOn="view"
      sequential
      speed={35}
      className={CLASS}
      encryptedClassName="font-mono text-2xl text-neutral-500"
    />
  );
}
