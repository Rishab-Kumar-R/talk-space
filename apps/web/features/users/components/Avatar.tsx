import { avatarBg } from "../../../shared/lib/utils";

export function Avatar({ name, size = 38, color, style }: {
  name: string;
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%",
        background: color ?? avatarBg(name), flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.38, fontWeight: 700, color: "white",
        userSelect: "none", letterSpacing: "-0.5px",
        ...style,
      }}
    >
      {name[0]?.toUpperCase() ?? "?"}
    </div>
  );
}
