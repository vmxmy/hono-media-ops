/**
 * Custom Drizzle ORM Types
 */

import { customType } from "drizzle-orm/pg-core";

// ==================== Custom Vector Type for pgvector ====================

export const vector = customType<{ data: number[]; driverData: string; config: { dimensions: number } }>({
  dataType(config) {
    return `vector(${config?.dimensions ?? 1536})`;
  },
  toDriver(value: number[]): string {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: string): number[] {
    // Parse "[1,2,3]" format from pgvector
    return JSON.parse(value.replace(/^\[/, "[").replace(/\]$/, "]")) as number[];
  },
});
