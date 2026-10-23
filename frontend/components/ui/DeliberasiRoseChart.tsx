"use client";

import React, { useState } from "react";

export interface DebatStats {
  diterima: number;
  ditandai: number;
  ditolak: number;
  tertunda: number;
  total: number;
}

interface DeliberasiRoseChartProps {
  stats: DebatStats;
}

export default function DeliberasiRoseChart({ stats }: DeliberasiRoseChartProps) {
  const [chartType, setChartType] = useState<"rose" | "spider">("rose");
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const categories = [
    { key: "diterima", label: "Diterima", count: stats.diterima, color: "#1F6B3A" },
    { key: "ditandai", label: "Ditandai", count: stats.ditandai, color: "#8A5A00" },
    { key: "ditolak", label: "Ditolak", count: stats.ditolak, color: "#A4262C" },
    { key: "tertunda", label: "Tertunda", count: stats.tertunda, color: "#5A6070" },
  ];

  const total = stats.total;
  const maxCount = Math.max(...categories.map((c) => c.count), 1);

  // SVG parameters
  const cx = 110;
  const cy = 110;
  const maxRadius = 88;
  const minRadius = 26;

  // Find the category with maximum count for default protruding effect
  const dominantKey = categories.reduce(
    (max, c) => (c.count > max.count ? c : max),
    categories[0]
  ).key;

  return (
    <div className="space-y-4">
      {/* Header with Chart Type Switcher */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-serif text-base font-normal text-[var(--ink)] mb-0.5">
            Hasil Deliberasi Agen
          </h3>
          <p className="text-xs text-[var(--ink-muted)]">
            Ringkasan keputusan dari seluruh sesi debat multi-agen.
          </p>
        </div>

        {/* Toggle between Rose Chart and Spider Chart */}
        <div className="inline-flex rounded border border-[var(--line)] bg-[var(--surface)] p-0.5 text-[11px] font-sans shrink-0">
          <button
            type="button"
            onClick={() => setChartType("rose")}
            className={`px-2 py-0.5 rounded transition-all duration-140 ${
              chartType === "rose"
                ? "bg-[var(--canvas)] text-[var(--ink)] font-semibold shadow-xs"
                : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
            }`}
            title="Tampilkan grafik Nightingale Rose"
          >
            Rose Chart
          </button>
          <button
            type="button"
            onClick={() => setChartType("spider")}
            className={`px-2 py-0.5 rounded transition-all duration-140 ${
              chartType === "spider"
                ? "bg-[var(--canvas)] text-[var(--ink)] font-semibold shadow-xs"
                : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
            }`}
            title="Tampilkan diagram jaring (Spider / Radar chart)"
          >
            Spider Chart
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-6 min-w-0">
        {/* Chart SVG */}
        <div className="shrink-0 relative flex justify-center py-1">
          {chartType === "rose" ? (
            /* ========================================================
               Nightingale Rose Chart (Polar Area with Protruding Petals)
               ======================================================== */
            <svg
              width="220"
              height="220"
              viewBox="0 0 220 220"
              className="select-none overflow-visible"
            >
              {/* Concentric Guide Circles */}
              {[0.3, 0.55, 0.8, 1].map((scale, i) => (
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r={minRadius + (maxRadius - minRadius) * scale}
                  fill="none"
                  stroke="var(--line)"
                  strokeWidth="1"
                  strokeDasharray="2 3"
                  opacity={0.7}
                />
              ))}

              {/* Crosshair Hairline Axes */}
              <line
                x1={cx}
                y1={16}
                x2={cx}
                y2={204}
                stroke="var(--line)"
                strokeWidth="1"
                opacity={0.6}
              />
              <line
                x1={16}
                y1={cy}
                x2={204}
                y2={cy}
                stroke="var(--line)"
                strokeWidth="1"
                opacity={0.6}
              />

              {/* Petal Sectors */}
              {categories.map((cat, idx) => {
                // Quadrant angles (each 90 degrees)
                // idx 0: -90° to 0° (top-right)
                // idx 1: 0° to 90° (bottom-right)
                // idx 2: 90° to 180° (bottom-left)
                // idx 3: 180° to 270° (top-left)
                const startAngle = -90 + idx * 90;
                const endAngle = startAngle + 90;
                const midAngle = startAngle + 45;
                const midRad = (midAngle * Math.PI) / 180;

                // Radius proportional to count
                const countRatio = maxCount > 0 ? cat.count / maxCount : 0;
                const radius =
                  cat.count === 0
                    ? minRadius
                    : minRadius + 14 + (maxRadius - (minRadius + 14)) * countRatio;

                // Calculate petal start and end arc points
                const startRad = (startAngle * Math.PI) / 180;
                const endRad = (endAngle * Math.PI) / 180;

                const x1 = cx + radius * Math.cos(startRad);
                const y1 = cy + radius * Math.sin(startRad);
                const x2 = cx + radius * Math.cos(endRad);
                const y2 = cy + radius * Math.sin(endRad);

                const pathData = [
                  `M ${cx} ${cy}`,
                  `L ${x1} ${y1}`,
                  `A ${radius} ${radius} 0 0 1 ${x2} ${y2}`,
                  "Z",
                ].join(" ");

                // Protruding offset (outward along the quadrant diagonal)
                const isHovered = hoveredKey === cat.key;
                const isDominant = dominantKey === cat.key && cat.count > 0;

                // Tighter spacing: base offset 0 (petals sit flush together), dominant protrudes by 4.5px, hovered by 8px
                const offset = isHovered ? 8 : isDominant ? 4.5 : 0;
                const tx = Math.cos(midRad) * offset;
                const ty = Math.sin(midRad) * offset;

                // Label point for percentage inside the petal: brought closer inward to tighten the distance between percentages
                const pct = total > 0 ? (cat.count / total) * 100 : 0;
                const labelDist = Math.max(minRadius + 8, Math.min(radius - 10, radius * 0.52));
                const lx = cx + labelDist * Math.cos(midRad);
                const ly = cy + labelDist * Math.sin(midRad);

                return (
                  <g
                    key={cat.key}
                    transform={`translate(${tx.toFixed(1)}, ${ty.toFixed(1)})`}
                    style={{
                      transition: "transform 260ms cubic-bezier(0.16, 1, 0.3, 1), opacity 200ms ease",
                    }}
                    onMouseEnter={() => setHoveredKey(cat.key)}
                    onMouseLeave={() => setHoveredKey(null)}
                    className="cursor-pointer"
                  >
                    <path
                      d={pathData}
                      fill={cat.color}
                      fillOpacity={
                        hoveredKey && !isHovered ? 0.45 : isHovered ? 1 : 0.88
                      }
                      stroke="var(--canvas)"
                      strokeWidth="1.2"
                      className="transition-all duration-200"
                    >
                      <title>{`${cat.label}: ${cat.count} butir (${Math.round(pct)}%)`}</title>
                    </path>

                    {/* Percentage text label inside the petal */}
                    {cat.count > 0 && radius >= 42 && (
                      <text
                        x={lx}
                        y={ly + 3.5}
                        textAnchor="middle"
                        fill="#FFFFFF"
                        className="text-[10px] font-mono font-bold select-none pointer-events-none drop-shadow-xs"
                      >
                        {Math.round(pct)}%
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Center "Butir" Hub Indicator */}
              <circle
                cx={cx}
                cy={cy}
                r={minRadius * 0.5}
                fill="var(--canvas)"
                stroke="var(--line)"
                strokeWidth="1.5"
              />
              <circle
                cx={cx}
                cy={cy}
                r={3}
                fill="var(--accent)"
                className="select-none pointer-events-none"
              />
            </svg>
          ) : (
            /* ========================================================
               Spider Chart (Radar Chart)
               ======================================================== */
            <svg
              width="220"
              height="220"
              viewBox="0 0 220 220"
              className="select-none"
            >
              {(() => {
                // Scaled down slightly so labels have plenty of breathing room inside
                const spiderRadius = 60;

                // Concentric Diamond/Radar Grid Rings
                return (
                  <>
                    {[0.25, 0.5, 0.75, 1].map((scale, i) => {
                      const r = spiderRadius * scale;
                      const points = [
                        `${cx},${cy - r}`, // Top (Diterima)
                        `${cx + r},${cy}`, // Right (Ditandai)
                        `${cx},${cy + r}`, // Bottom (Ditolak)
                        `${cx - r},${cy}`, // Left (Tertunda)
                      ].join(" ");

                      return (
                        <polygon
                          key={i}
                          points={points}
                          fill="none"
                          stroke="var(--line)"
                          strokeWidth="1"
                          strokeDasharray={i < 3 ? "2 3" : undefined}
                          opacity={0.75}
                        />
                      );
                    })}

                    {/* 4 Radial Axis Lines */}
                    <line
                      x1={cx}
                      y1={cy}
                      x2={cx}
                      y2={cy - spiderRadius - 4}
                      stroke="var(--line-strong)"
                      strokeWidth="1"
                      opacity={0.5}
                    />
                    <line
                      x1={cx}
                      y1={cy}
                      x2={cx + spiderRadius + 4}
                      y2={cy}
                      stroke="var(--line-strong)"
                      strokeWidth="1"
                      opacity={0.5}
                    />
                    <line
                      x1={cx}
                      y1={cy}
                      x2={cx}
                      y2={cy + spiderRadius + 4}
                      stroke="var(--line-strong)"
                      strokeWidth="1"
                      opacity={0.5}
                    />
                    <line
                      x1={cx}
                      y1={cy}
                      x2={cx - spiderRadius - 4}
                      y2={cy}
                      stroke="var(--line-strong)"
                      strokeWidth="1"
                      opacity={0.5}
                    />

                    {/* Radar Data Polygon */}
                    {(() => {
                      const radarDist = (count: number) => {
                        if (maxCount === 0 || count === 0) return 6;
                        return 10 + (spiderRadius - 10) * (count / maxCount);
                      };

                      const pTop = { x: cx, y: cy - radarDist(stats.diterima) };
                      const pRight = { x: cx + radarDist(stats.ditandai), y: cy };
                      const pBottom = { x: cx, y: cy + radarDist(stats.ditolak) };
                      const pLeft = { x: cx - radarDist(stats.tertunda), y: cy };

                      const radarPoints = `${pTop.x},${pTop.y} ${pRight.x},${pRight.y} ${pBottom.x},${pBottom.y} ${pLeft.x},${pLeft.y}`;

                      return (
                        <>
                          <polygon
                            points={radarPoints}
                            fill="var(--accent)"
                            fillOpacity={0.2}
                            stroke="var(--accent)"
                            strokeWidth="2"
                            className="transition-all duration-300"
                          />

                          {/* Point vertices with colors */}
                          {[
                            { pt: pTop, key: "diterima", cat: categories[0] },
                            { pt: pRight, key: "ditandai", cat: categories[1] },
                            { pt: pBottom, key: "ditolak", cat: categories[2] },
                            { pt: pLeft, key: "tertunda", cat: categories[3] },
                          ].map(({ pt, key, cat }) => {
                            const isHovered = hoveredKey === key;
                            return (
                              <g
                                key={key}
                                onMouseEnter={() => setHoveredKey(key)}
                                onMouseLeave={() => setHoveredKey(null)}
                                className="cursor-pointer"
                              >
                                <circle
                                  cx={pt.x}
                                  cy={pt.y}
                                  r={isHovered ? 5.5 : 4}
                                  fill={cat.color}
                                  stroke="var(--canvas)"
                                  strokeWidth="2"
                                  className="transition-all duration-200"
                                >
                                  <title>{`${cat.label}: ${cat.count} butir`}</title>
                                </circle>
                              </g>
                            );
                          })}
                        </>
                      );
                    })()}

                    {/* Axis Labels positioned comfortably inside viewBox */}
                    <text
                      x={cx}
                      y={cy - spiderRadius - 10}
                      textAnchor="middle"
                      className="text-[10px] font-sans fill-[#1F6B3A] font-semibold"
                    >
                      Diterima
                    </text>
                    <text
                      x={cx + spiderRadius + 8}
                      y={cy + 3.5}
                      textAnchor="start"
                      className="text-[10px] font-sans fill-[#8A5A00] font-semibold"
                    >
                      Ditandai
                    </text>
                    <text
                      x={cx}
                      y={cy + spiderRadius + 16}
                      textAnchor="middle"
                      className="text-[10px] font-sans fill-[#A4262C] font-semibold"
                    >
                      Ditolak
                    </text>
                    <text
                      x={cx - spiderRadius - 8}
                      y={cy + 3.5}
                      textAnchor="end"
                      className="text-[10px] font-sans fill-[#5A6070] font-semibold"
                    >
                      Tertunda
                    </text>
                  </>
                );
              })()}
            </svg>
          )}
        </div>

        {/* Legend List */}
        <div className="flex-1 w-full min-w-0 space-y-1">
          {categories.map((seg) => {
            const pct = total > 0 ? (seg.count / total) * 100 : 0;
            const isHovered = hoveredKey === seg.key;
            const isDominant = dominantKey === seg.key && seg.count > 0;

            return (
              <div
                key={seg.key}
                onMouseEnter={() => setHoveredKey(seg.key)}
                onMouseLeave={() => setHoveredKey(null)}
                className={`flex items-center gap-2 px-2 py-1 rounded transition-all duration-140 cursor-pointer min-w-0 ${
                  isHovered
                    ? "bg-[var(--surface)] ring-1 ring-[var(--line)]"
                    : "hover:bg-[var(--surface)]/60"
                }`}
              >
                {/* Penanda kotak (berlaku untuk Rose maupun Spider chart) */}
                <span
                  className="w-2.5 h-2.5 rounded-none shrink-0 border border-black/10 transition-transform duration-200"
                  style={{
                    backgroundColor: seg.color,
                    transform: isHovered ? "scale(1.25)" : "scale(1)",
                  }}
                />

                <span
                  className={`text-xs sm:text-sm flex-1 truncate transition-colors ${
                    isHovered
                      ? "text-[var(--ink)] font-medium"
                      : "text-[var(--ink)] font-normal"
                  }`}
                >
                  {seg.label}
                  {isDominant && (
                    <span className="ml-1.5 text-[10px] text-[var(--accent)] font-mono font-medium">
                      ★ Terbanyak
                    </span>
                  )}
                </span>

                <span className="font-serif text-sm sm:text-base font-medium tabular-nums text-[var(--ink)] shrink-0">
                  {seg.count}
                </span>

                <span className="font-mono text-[11px] tabular-nums text-[var(--ink-muted)] w-9 text-right shrink-0">
                  {Math.round(pct)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Card Footer Summary */}
      <div className="pt-3 border-t border-[var(--line)] flex justify-between items-center text-xs text-[var(--ink-muted)]">
        <span>Total butir diproses</span>
        <span className="font-mono tabular-nums font-semibold text-[var(--ink)]">
          {stats.total}
        </span>
      </div>
    </div>
  );
}
