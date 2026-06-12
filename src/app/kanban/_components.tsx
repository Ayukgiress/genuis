"use client";

import React, { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
  type CollisionDetection,
  pointerWithin,
  rectIntersection,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createPortal } from "react-dom";
import type { KanbanCard, KanbanColumnId } from "@/types";

export type CardsByColumn = Record<KanbanColumnId, KanbanCard[]>;

export function bucketCardsByColumn(cards: KanbanCard[]): CardsByColumn {
  const out: CardsByColumn = { todo: [], in_progress: [], review: [], done: [] };
  for (const c of cards) {
    const col = (c.column_id || "todo") as KanbanColumnId;
    if (out[col]) out[col].push(c);
  }
  for (const k of Object.keys(out) as KanbanColumnId[]) {
    out[k].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }
  return out;
}

const COLUMNS: { id: KanbanColumnId; title: string }[] = [
  { id: "todo",        title: "WISHLIST" },
  { id: "in_progress", title: "APPLIED" },
  { id: "review",      title: "INTERVIEW" },
  { id: "done",        title: "OFFER" },
];

function CardIcon({ id }: { id: KanbanColumnId }) {
  const cls = "w-5 h-5";
  switch (id) {
    case "todo":
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2v20M2 12h20" />
        </svg>
      );
    case "in_progress":
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 10h18" />
        </svg>
      );
    case "review":
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );
    case "done":
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      );
  }
}

function SortableCard({
  card, columnId, onDelete,
}: { card: KanbanCard; columnId: KanbanColumnId; onDelete: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id, data: { type: "card", card, columnId } });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? "transform 200ms cubic-bezier(0.2, 0, 0, 1)",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group p-6 rounded-[2rem] bg-zinc-950 border border-zinc-900
        hover:border-primary/30 transition-[border-color,box-shadow] duration-200
        relative overflow-hidden touch-none select-none
        ${isDragging ? "opacity-30" : "shadow-sm hover:shadow-md"}
      `}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[50px] rounded-full -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors pointer-events-none" />
      <div
        {...attributes}
        {...listeners}
        className="absolute inset-0 z-10 cursor-grab active:cursor-grabbing"
        aria-label={`Drag ${card.title}`}
      />
      <div className="relative space-y-6 pointer-events-none">
        <div className="flex justify-between items-start">
          <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-primary group-hover:border-primary/20 transition-colors">
            <CardIcon id={columnId} />
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(card.id); }}
            className="relative z-20 pointer-events-auto p-2 text-zinc-600 hover:text-red-500 transition-colors"
            aria-label="Delete card"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
        <div className="space-y-1">
          <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">{card.title}</h3>
          <p className="text-sm text-zinc-500 font-medium">
            {card.company || "Unknown Company"} • {card.location || "Unknown Location"}
          </p>
        </div>
        <div className="pt-6 border-t border-zinc-900/50 flex justify-between items-center">
          {card.salary && <div className="text-[10px] font-black tracking-widest text-zinc-500">{card.salary}</div>}
          {card.applied_at && (
            <div className="text-[10px] font-black tracking-widest text-primary">
              APPLIED {new Date(card.applied_at).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CardPreview({ card, columnId }: { card: KanbanCard; columnId: KanbanColumnId }) {
  return (
    <div className="p-6 rounded-[2rem] bg-zinc-900 border border-primary/40 shadow-2xl shadow-primary/20 rotate-2 max-w-sm">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[50px] rounded-full -mr-16 -mt-16" />
      <div className="relative space-y-6">
        <div className="flex justify-between items-start">
          <div className="w-12 h-12 rounded-2xl bg-zinc-950 border border-primary/20 flex items-center justify-center text-primary">
            <CardIcon id={columnId} />
          </div>
        </div>
        <div className="space-y-1">
          <h3 className="font-bold text-lg leading-tight text-white">{card.title}</h3>
          <p className="text-sm text-zinc-400 font-medium">
            {card.company || "Unknown Company"} • {card.location || "Unknown Location"}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Column drop zone (empty-space droppable) ─────────────────────────── */

function ColumnView({
  id, title, count, cards, isOver, onAddCard, onDelete,
}: {
  id: KanbanColumnId; title: string; count: number; cards: KanbanCard[];
  isOver: boolean; onAddCard: (id: KanbanColumnId) => void; onDelete: (id: string) => void;
}) {
  return (
    <div
      data-column={id}
      className={`flex flex-col rounded-2xl transition-colors duration-200 ${isOver ? "bg-primary/[0.04] ring-2 ring-primary/40 ring-inset" : ""}`}
    >
      <div className="flex items-center justify-between px-2 mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(0,242,156,0.5)]" />
          <h2 className="text-xs font-black tracking-[0.2em] text-zinc-400">
            {title} <span className="ml-2 text-zinc-600 font-bold">{count}</span>
          </h2>
        </div>
        <button onClick={() => onAddCard(id)} className="text-zinc-600 hover:text-primary transition-colors p-1" aria-label={`Add to ${title}`}>
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      <ColumnDropZone id={id} cards={cards} onAddCard={onAddCard} onDelete={onDelete} />
    </div>
  );
}

/**
 * The actual droppable area inside a column. Split into:
 *  - "list area": the SortableContext holding the cards
 *  - "tail droppable": a useDroppable zone AFTER the last card,
 *    so dropping in empty space at the bottom still registers
 *  - "empty droppable": a useDroppable for the whole zone when no cards
 */
function ColumnDropZone({
  id, cards, onAddCard, onDelete,
}: {
  id: KanbanColumnId;
  cards: KanbanCard[];
  onAddCard: (id: KanbanColumnId) => void;
  onDelete: (id: string) => void;
}) {
  // Always register a fallback "column" droppable so empty columns can accept drops.
  const empty = useDroppable({
    id: `column-${id}`,
    data: { type: "column", columnId: id },
  });

  return (
    <div ref={empty.setNodeRef} className="flex-1 min-h-[160px] flex flex-col">
      <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-4">
          {cards.map((card) => (
            <SortableCard key={card.id} card={card} columnId={id} onDelete={onDelete} />
          ))}
        </div>
      </SortableContext>

      {/* Tail droppable — always present, even if no cards. Lets the user drop at the END of any column. */}
      <TailDroppable columnId={id} />

      {/* "Add Lead" only on the wishlist column, shown BELOW the cards as a single, non-duplicate add affordance. */}
      {id === "todo" && (
        <button
          onClick={() => onAddCard("todo")}
          className="mt-4 w-full py-4 border-2 border-dashed border-zinc-900 rounded-[2rem] text-xs font-black tracking-[0.2em] text-zinc-600 hover:border-zinc-800 hover:text-zinc-400 transition-all uppercase flex items-center justify-center gap-2"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Lead
        </button>
      )}
    </div>
  );
}

function TailDroppable({ columnId }: { columnId: KanbanColumnId }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `tail-${columnId}`,
    data: { type: "column-tail", columnId },
  });
  return (
    <div
      ref={setNodeRef}
      className={`mt-2 h-3 rounded-md transition-colors ${isOver ? "bg-primary/30" : "bg-transparent"}`}
      aria-hidden
    />
  );
}

export function KanbanBoard({
  cards, setCards, onAddCard, onDeleteCard, onMoveCard,
}: {
  cards: KanbanCard[];
  setCards: React.Dispatch<React.SetStateAction<KanbanCard[]>>;
  onAddCard: (id: KanbanColumnId) => void;
  onDeleteCard: (id: string) => void;
  onMoveCard: (cardId: string, newColumnId: KanbanColumnId, newIndex: number) => Promise<void> | void;
}) {
  const buckets = useMemo(() => bucketCardsByColumn(cards), [cards]);
  const [activeCard, setActiveCard] = useState<KanbanCard | null>(null);
  const [overColumn, setOverColumn] = useState<KanbanColumnId | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor,  { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Layered collision detection: prefer precise pointer hits, then rect
  // intersection, then closest corners (so cross-column drops are still
  // detected when no card is hovered). `closestCenter` is not needed here
  // and is intentionally not imported.
  const collisionDetection: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) return pointerCollisions;
    const rectCollisions = rectIntersection(args);
    if (rectCollisions.length > 0) return rectCollisions;
    return closestCorners(args);
  };

  function findColumnOfCard(cardId: string): KanbanColumnId | null {
    for (const col of COLUMNS) if (buckets[col.id].some((c) => c.id === cardId)) return col.id;
    return null;
  }

  function handleDragStart(e: DragStartEvent) {
    const data = e.active.data.current as { type?: string; card?: KanbanCard; columnId?: KanbanColumnId } | undefined;
    if (data?.type === "card" && data.card) setActiveCard(data.card);
  }

  /** Resolve which column an `over` target belongs to. */
  function resolveOverColumn(overId: string, data?: { type?: string; columnId?: KanbanColumnId }): KanbanColumnId | null {
    if (data?.type === "column" && data.columnId) return data.columnId;
    if (data?.type === "column-tail" && data.columnId) return data.columnId;
    return findColumnOfCard(overId);
  }

  function handleDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) { setOverColumn(null); return; }
    const activeId = String(active.id);
    const overData = over.data.current as { type?: string; columnId?: KanbanColumnId } | undefined;
    const overId = String(over.id);
    const overCol = resolveOverColumn(overId, overData);
    if (overCol) setOverColumn(overCol);

    // Auto-move across columns during drag
    const activeCol = findColumnOfCard(activeId);
    if (activeCol && overCol && activeCol !== overCol) {
      setCards((prev): KanbanCard[] => prev.map((c) =>
        c.id === activeId ? { ...c, column_id: overCol! } : c
      ));
    }
  }

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    const dragged = activeCard;
    setActiveCard(null);
    setOverColumn(null);
    if (!over || !dragged) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    const overData = over.data.current as { type?: string; columnId?: KanbanColumnId } | undefined;
    const targetColumnId = resolveOverColumn(overId, overData);
    if (!targetColumnId) return;

    // Compute the desired index:
    //  - "column-tail" → drop at the END of the target column
    //  - "column" (empty) → drop at index 0
    //  - over a card → insert at that card's position
    const isTail = overData?.type === "column-tail";
    // 'isEmptyColumn' is implicit: when overData?.type === "column",
    // the newIndex falls through to 0 (the empty column's first slot).
    const isEmptyColumn = overData?.type === "column";
    void isEmptyColumn;

    let newIndex = 0;
    setCards((prev): KanbanCard[] => {
      const targetList = prev.filter((c) => c.column_id === targetColumnId && c.id !== activeId);

      if (isTail) {
        newIndex = targetList.length;
      } else {
        const overIndex = targetList.findIndex((c) => c.id === overId);
        newIndex = overIndex >= 0 ? overIndex : 0; // empty column → 0
      }

      const inserted = [...targetList];
      inserted.splice(newIndex, 0, { ...dragged, column_id: targetColumnId });
      const positioned = inserted.map((c, i) => ({ ...c, position: i }));
      const others = prev.filter((c) => c.column_id !== targetColumnId && c.id !== activeId);
      return [...others, ...positioned];
    });

    try {
      await onMoveCard(activeId, targetColumnId, newIndex);
    } catch {
      // Caller handles error reporting
    }
  }

  const draggedColumn = activeCard ? findColumnOfCard(activeCard.id) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => { setActiveCard(null); setOverColumn(null); }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {COLUMNS.map((column) => (
          <ColumnView
            key={column.id}
            id={column.id}
            title={column.title}
            count={buckets[column.id].length}
            cards={buckets[column.id]}
            // Highlight the column whenever a card is being dragged AND
            // the cursor is hovering any droppable in this column — including
            // the same-column case, the empty-column case, and the tail case.
            isOver={overColumn === column.id && activeCard != null}
            onAddCard={onAddCard}
            onDelete={onDeleteCard}
          />
        ))}
      </div>

      {typeof document !== "undefined" &&
        createPortal(
          <DragOverlay dropAnimation={{ duration: 220, easing: "cubic-bezier(0.2, 0, 0, 1)" }}>
            {activeCard && draggedColumn ? (
              <CardPreview card={activeCard} columnId={draggedColumn} />
            ) : null}
          </DragOverlay>,
          document.body
        )}
    </DndContext>
  );
}
