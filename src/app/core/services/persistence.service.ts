import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PersistenceService {
  get<T>(key: string, fallback: T): T {
    const raw = localStorage.getItem(key);
    if (raw === null) {
      return fallback;
    }
    try {
      return JSON.parse(raw) as T;
    } catch {
      console.warn(`Corrupt data for localStorage key "${key}", falling back to default.`);
      return fallback;
    }
  }

  set<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  remove(key: string): void {
    localStorage.removeItem(key);
  }
}
