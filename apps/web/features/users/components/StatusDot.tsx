import { UserStatus } from "../../../shared/types";

const STATUS_COLOR: Record<UserStatus, string> = {
  available: "bg-green-500",
  away: "bg-yellow-400",
  dnd: "bg-red-500",
};

export const STATUS_LABEL: Record<UserStatus, string> = {
  available: "Available",
  away: "Away",
  dnd: "Do Not Disturb",
};

export function StatusDot({ status, size = 10 }: { status: UserStatus; size?: number }) {
  return (
    <span
      className={`inline-block rounded-full shrink-0 ${STATUS_COLOR[status]}`}
      style={{ width: size, height: size }}
      title={STATUS_LABEL[status]}
    />
  );
}
