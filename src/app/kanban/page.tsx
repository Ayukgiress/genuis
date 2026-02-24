"use client";

import { useState } from "react";

interface KanbanColumn {
  id: string;
  title: string;
  cards: { id: string; title: string }[];
}

const initialColumns: KanbanColumn[] = [
  { id: "todo", title: "To Do", cards: [] },
  { id: "in-progress", title: "In Progress", cards: [] },
  { id: "review", title: "Review", cards: [] },
  { id: "done", title: "Done", cards: [] },
];

export default function KanbanPage() {
  const [columns, setColumns] = useState<KanbanColumn[]>(initialColumns);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Job Application Tracker</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {columns.map((column) => (
          <div key={column.id} className="p-4 bg-card rounded-lg border">
            <h2 className="font-semibold mb-4">{column.title}</h2>
            <div className="space-y-2 min-h-[200px]">
              {column.cards.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No items yet
                </p>
              ) : (
                column.cards.map((card) => (
                  <div
                    key={card.id}
                    className="p-3 bg-background rounded-md border shadow-sm"
                  >
                    {card.title}
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
