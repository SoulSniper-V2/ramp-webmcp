import { wcagGrade } from "../color";
import type { ContrastPairReport } from "../types";

type Props = { pairs: ContrastPairReport[] };

export function ContrastMeter({ pairs }: Props) {
  return (
    <div className="meter">
      {pairs.map((p) => {
        const fail = !p.aa.text;
        const grade = wcagGrade(p.ratio, false);
        return (
          <div key={p.pair.join("/")} className={`pair${fail ? " fail" : ""}`}>
            <span className="names">
              {p.pair[0]} / {p.pair[1]}
            </span>
            <span className="ratio">{p.ratio.toFixed(2)}:1</span>
            <span className={`badge${fail ? " fail" : ""}`}>{fail ? "FAIL AA" : grade}</span>
          </div>
        );
      })}
    </div>
  );
}
