import { Card } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"

interface StatCardProps {
  title: string
  value: number | string
  icon: LucideIcon
  color: "blue" | "green" | "purple" | "orange" | "red" | "yellow"
  details?: { label: string; value: number | string }[]
}

const colorClasses = {
  blue: {
    border: "border-blue-200 dark:border-blue-800",
    iconBg: "bg-blue-100 dark:bg-blue-900",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  green: {
    border: "border-green-200 dark:border-green-800",
    iconBg: "bg-green-100 dark:bg-green-900",
    iconColor: "text-green-600 dark:text-green-400",
  },
  purple: {
    border: "border-purple-200 dark:border-purple-800",
    iconBg: "bg-purple-100 dark:bg-purple-900",
    iconColor: "text-purple-600 dark:text-purple-400",
  },
  orange: {
    border: "border-orange-200 dark:border-orange-800",
    iconBg: "bg-orange-100 dark:bg-orange-900",
    iconColor: "text-orange-600 dark:text-orange-400",
  },
  red: {
    border: "border-red-200 dark:border-red-800",
    iconBg: "bg-red-100 dark:bg-red-900",
    iconColor: "text-red-600 dark:text-red-400",
  },
  yellow: {
    border: "border-yellow-200 dark:border-yellow-800",
    iconBg: "bg-yellow-100 dark:bg-yellow-900",
    iconColor: "text-yellow-600 dark:text-yellow-400",
  },
}

export function StatCard({ title, value, icon: Icon, color, details }: StatCardProps) {
  const colors = colorClasses[color]

  return (
    <Card className={`p-6 bg-white dark:bg-zinc-900 border-2 ${colors.border}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{value}</p>
        </div>
        <div className={`p-3 ${colors.iconBg} rounded-lg`}>
          <Icon className={`h-6 w-6 ${colors.iconColor}`} />
        </div>
      </div>
      {details && details.length > 0 && (
        <div className="mt-4 space-y-1">
          {details.map((detail, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">{detail.label}:</span>
              <span className="font-medium text-gray-900 dark:text-white">{detail.value}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

