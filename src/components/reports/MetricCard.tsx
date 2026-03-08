import { Box, Card, CardContent, Typography } from "@mui/material";

interface MetricCardProps {
  icon: React.ReactNode;
  value: string;
  label: string;
  accentColor: string;
  iconBg: string;
}

export function MetricCard({
  icon,
  value,
  label,
  accentColor,
  iconBg,
}: MetricCardProps) {
  return (
    <Card sx={{ borderLeft: "3px solid", borderColor: accentColor }}>
      <CardContent
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          py: 2,
          px: 2.5,
          "&:last-child": { pb: 2 },
        }}
      >
        <Box
          sx={{
            p: 1.25,
            borderRadius: 1.5,
            backgroundColor: iconBg,
            display: "flex",
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="h5"
            fontWeight={700}
            sx={{
              fontVariantNumeric: "tabular-nums",
              color: accentColor,
              lineHeight: 1.2,
            }}
          >
            {value}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              fontWeight: 500,
            }}
          >
            {label}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
