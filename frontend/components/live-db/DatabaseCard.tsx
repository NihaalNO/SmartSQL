"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { DatabaseMetadata } from "@/lib/live-db/databases"

interface DatabaseCardProps {
  database: DatabaseMetadata
  selected?: boolean
  onConnect: () => void
}

export function DatabaseCard({ database, selected, onConnect }: DatabaseCardProps) {
  return (
    <article
      className={`group flex h-full flex-col rounded-lg border bg-card p-5 transition-colors duration-200 ${
        selected ? "border-primary shadow-sm" : "border-border hover:border-primary/50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-white">
          <img
            src={database.iconPath}
            alt={`${database.name} official logo`}
            className="h-7 w-7 object-contain"
            loading="lazy"
          />
        </div>
        <Badge variant="secondary" className="rounded-md text-[11px]">
          {database.category}
        </Badge>
      </div>
      <div className="mt-4 flex-1">
        <h2 className="text-base font-semibold text-foreground">{database.name}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{database.description}</p>
      </div>
      <Button type="button" size="sm" variant={selected ? "primary" : "secondary"} className="mt-5 w-full" onClick={onConnect}>
        Connect
      </Button>
    </article>
  )
}
