import MatrixText from "@/components/kokonutui/matrix-text";
import { usePaused } from "@/gallery/state";

export function DemoMatrixText() {
  // Driven by setTimeout per letter, so pausing shows the settled word (#68).
  if (usePaused()) return <span className="font-mono text-4xl font-bold tracking-widest text-white">COMPONENTS</span>;
  return <MatrixText text="COMPONENTS" className="text-white" />;
}
