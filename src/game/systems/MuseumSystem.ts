import { BALANCE } from "../data";
import type { MuseumRecord } from "../types";

const STORAGE_KEY = "assembly-roguelite:museum";

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const createMemoryStorage = (): KeyValueStorage => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    }
  };
};

export class MuseumSystem {
  private readonly storage: KeyValueStorage;

  constructor(storage: KeyValueStorage = window.localStorage) {
    this.storage = storage;
  }

  list(): MuseumRecord[] {
    const raw = this.storage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as MuseumRecord[];
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed
        .filter((record) => typeof record.id === "string" && typeof record.timestamp === "number")
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, BALANCE.maxMuseumRecords);
    } catch {
      this.storage.removeItem(STORAGE_KEY);
      return [];
    }
  }

  save(record: MuseumRecord): MuseumRecord[] {
    const records = [record, ...this.list().filter((item) => item.id !== record.id)]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, BALANCE.maxMuseumRecords);
    this.storage.setItem(STORAGE_KEY, JSON.stringify(records));
    return records;
  }

  clear(): void {
    this.storage.removeItem(STORAGE_KEY);
  }
}
