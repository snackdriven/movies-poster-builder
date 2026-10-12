DROP TABLE IF EXISTS entries;
--> statement-breakpoint
CREATE TABLE poster (
  id INTEGER PRIMARY KEY,
  grid_size INTEGER NOT NULL DEFAULT 9,
  title TEXT NOT NULL DEFAULT '',
  background TEXT NOT NULL DEFAULT 'abyss',
  slots TEXT NOT NULL DEFAULT '[]',
  updated_at INTEGER NOT NULL
);
