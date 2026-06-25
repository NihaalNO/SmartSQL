"use client"

import { DatabaseCard } from "./DatabaseCard"
import { databases, type DbType } from "@/lib/live-db/databases"

interface DatabaseCatalogueProps {
  selectedId?: DbType | null
  onSelect: (dbType: DbType) => void
}

export function DatabaseCatalogue({ selectedId, onSelect }: DatabaseCatalogueProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {databases.map((database) => (
        <DatabaseCard
          key={database.id}
          database={database}
          selected={selectedId === database.id}
          onConnect={() => onSelect(database.id)}
        />
      ))}
    </div>
  )
}
