"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { compareCampaigns } from "@/actions/campaigns";

type CampaignOption = { id: string; name: string };

export function ComparisonChart({
  currentCampaignId,
  previousCampaigns,
}: {
  currentCampaignId: string;
  previousCampaigns: CampaignOption[];
}) {
  const [selectedId, setSelectedId] = useState("");
  const [data, setData] = useState<
    { dimension: string; current: number; previous: number; delta: number }[] | null
  >(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedId) {
      setData(null);
      return;
    }
    setLoading(true);
    compareCampaigns(currentCampaignId, selectedId).then((result) => {
      if (result.success) {
        const merged = result.data.current.map((c) => {
          const prev = result.data.previous.find((p) => p.code === c.code);
          return {
            dimension: c.name,
            current: c.avg,
            previous: prev?.avg ?? 0,
            delta: prev ? +(c.avg - prev.avg).toFixed(2) : 0,
          };
        });
        setData(merged);
      }
      setLoading(false);
    });
  }, [selectedId, currentCampaignId]);

  if (previousCampaigns.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Comparación con medición anterior</CardTitle>
            <CardDescription>Selecciona una campaña anterior para comparar</CardDescription>
          </div>
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Selecciona campaña" />
            </SelectTrigger>
            <SelectContent>
              {previousCampaigns.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      {data && (
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data} layout="vertical" margin={{ left: 120 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, 5]} />
              <YAxis type="category" dataKey="dimension" tick={{ fontSize: 12 }} width={120} />
              <Tooltip formatter={(v) => Number(v).toFixed(2)} />
              <Legend />
              <Bar dataKey="previous" name="Anterior" fill="#94a3b8" radius={[0, 4, 4, 0]} />
              <Bar dataKey="current" name="Actual" fill="#2563eb" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            {data.map((d) => (
              <div key={d.dimension} className="text-center text-sm">
                <p className="font-medium truncate">{d.dimension}</p>
                <p
                  className={`text-lg font-bold ${d.delta > 0 ? "text-green-600" : d.delta < 0 ? "text-red-600" : "text-gray-500"}`}
                >
                  {d.delta > 0 ? "+" : ""}
                  {d.delta}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
