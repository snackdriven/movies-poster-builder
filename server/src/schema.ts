// Drizzle schema for this space.
//
// One saved poster per user (single row, id = 1, upserted on every save):
// the grid size, poster title, background choice, and the ordered slot list
// serialized as JSON (movie object per filled slot, null per empty slot).

import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const poster = sqliteTable("poster", {
  id: integer("id").primaryKey(),
  gridSize: integer("grid_size").notNull().default(9),
  title: text("title").notNull().default(""),
  background: text("background").notNull().default("abyss"),
  slots: text("slots").notNull().default("[]"),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});
