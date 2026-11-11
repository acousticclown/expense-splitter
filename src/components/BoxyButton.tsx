type Props = {
  children: React.ReactNode;
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
};

/** Chunky segmented black CTA (label | →). */
export function BoxyButton({
  children,
  type = "button",
  disabled,
  onClick,
  className = "",
}: Props) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`btn-boxy-split ${className}`.trim()}
    >
      <span className="btn-boxy-split-label">{children}</span>
      <span className="btn-boxy-split-arrow" aria-hidden>
        →
      </span>
    </button>
  );
}
