"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Alert {
  severity: string
  type: string
  dimension_code?: string
  item_text?: string
  segment_key?: string
  value: number
  threshold: number
  message: string
}

interface AlertListProps {
  alerts: Alert[]
  max?: number
}

const SEVERITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  crisis: { bg: "bg-red-100", text: "text-red-800", label: "Crisis" },
  attention: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Atención" },
  risk_group: { bg: "bg-orange-100", text: "text-orange-800", label: "Grupo de riesgo" },
  decline: { bg: "bg-purple-100", text: "text-purple-800", label: "Declive" },
}

export function AlertList({ alerts, max = 5 }: AlertListProps) {
  const displayed = alerts.slice(0, max)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alertas ({alerts.length})</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {displayed.length === 0 && (
          <p className="text-muted-foreground text-sm">
            No se encontraron alertas.
          </p>
        )}
        {displayed.map((alert, index) => {
          const style = SEVERITY_STYLES[alert.severity] ?? {
            bg: "bg-gray-100",
            text: "text-gray-800",
            label: alert.severity,
          }

          return (
            <div
              key={index}
              className="flex items-start gap-3 rounded-lg border p-3"
            >
              <Badge className={`${style.bg} ${style.text} border-0 shrink-0`}>
                {style.label}
              </Badge>
              <div className="flex flex-col gap-1 min-w-0">
                <p className="text-sm">{alert.message}</p>
                <p className="text-muted-foreground text-xs">
                  Valor: {alert.value.toFixed(2)} | Umbral: {alert.threshold.toFixed(2)}
                </p>
              </div>
            </div>
          )
        })}
        {alerts.length > max && (
          <p className="text-muted-foreground text-xs text-center">
            Mostrando {max} de {alerts.length} alertas
          </p>
        )}
      </CardContent>
    </Card>
  )
}
