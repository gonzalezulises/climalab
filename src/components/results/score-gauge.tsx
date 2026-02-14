"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ScoreGaugeProps {
  score: number;
  maxScore?: number;
  label?: string;
}

function getScoreColor(score: number, maxScore: number): string {
  const pct = (score / maxScore) * 100;
  if (pct >= 90) return "#1dc47c";
  if (pct >= 80) return "#00B4D8";
  if (pct >= 70) return "#0052CC";
  if (pct >= 60) return "#F59E0B";
  return "#DC2626";
}

function getScoreLabel(score: number, maxScore: number): string {
  const pct = (score / maxScore) * 100;
  if (pct >= 90) return "Excepcional";
  if (pct >= 80) return "Solida";
  if (pct >= 70) return "Aceptable";
  if (pct >= 60) return "Atencion";
  return "Crisis";
}

export function ScoreGauge({ score, maxScore = 5, label }: ScoreGaugeProps) {
  const color = getScoreColor(score, maxScore);
  const classification = getScoreLabel(score, maxScore);

  // SVG arc parameters for a semicircle
  const cx = 100;
  const cy = 100;
  const radius = 80;
  const strokeWidth = 16;

  // Calculate angle: 0 to 180 degrees mapped to score
  const fraction = Math.min(Math.max(score / maxScore, 0), 1);
  const angle = fraction * 180;

  // Arc path: starts at left (180 deg), sweeps clockwise
  const startX = cx - radius;
  const startY = cy;
  const endAngleRad = ((180 - angle) * Math.PI) / 180;
  const endX = cx + radius * Math.cos(endAngleRad);
  const endY = cy - radius * Math.sin(endAngleRad);
  const largeArc = angle > 180 ? 1 : 0;

  const bgArcPath = `M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`;
  const valueArcPath = `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY}`;

  return (
    <Card>
      {label && (
        <CardHeader>
          <CardTitle>{label}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="flex flex-col items-center">
        <svg width="200" height="120" viewBox="0 10 200 120">
          {/* Background arc */}
          <path
            d={bgArcPath}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Value arc */}
          {score > 0 && (
            <path
              d={valueArcPath}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
          )}
          {/* Score text */}
          <text x={cx} y={cy - 10} textAnchor="middle" fontSize="28" fontWeight="bold" fill={color}>
            {score.toFixed(1)}
          </text>
          {/* Classification text */}
          <text x={cx} y={cy + 14} textAnchor="middle" fontSize="12" fill="#6b7280">
            {classification}
          </text>
          {/* Min/max labels */}
          <text x={cx - radius} y={cy + 24} textAnchor="middle" fontSize="10" fill="#9ca3af">
            0
          </text>
          <text x={cx + radius} y={cy + 24} textAnchor="middle" fontSize="10" fill="#9ca3af">
            {maxScore}
          </text>
        </svg>
      </CardContent>
    </Card>
  );
}
