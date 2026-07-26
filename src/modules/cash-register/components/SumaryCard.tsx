import { Card, CardContent, Typography } from "@mui/material";

interface SummaryCardProps {
  label: string;
  value: string;
  accent?: "success" | "error" | "default";
}

export function SummaryCard({
  label,
  value,
  accent = "default",
}: SummaryCardProps) {
  const color =
    accent === "success"
      ? "success.main"
      : accent === "error"
        ? "error.main"
        : "text.primary";
  const borderColor =
    accent === "success"
      ? "success.main"
      : accent === "error"
        ? "error.main"
        : "transparent";
  return (
    <Card
      variant="outlined"
      sx={{
        borderColor: accent !== "default" ? borderColor : "rgba(26,32,53,0.10)",
      }}
    >
      <CardContent sx={{ py: 1.5, px: 2, "&:last-child": { pb: 1.5 } }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            fontWeight: 600,
          }}
        >
          {label}
        </Typography>
        <Typography
          variant="h6"
          color={color}
          sx={{ fontVariantNumeric: "tabular-nums", mt: 0.25 }}
        >
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}
