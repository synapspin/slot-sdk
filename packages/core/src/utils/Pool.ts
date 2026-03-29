export class Pool<T> {
  private available: T[] = [];
  private factory: () => T;
  private reset: (item: T) => void;

  constructor(factory: () => T, reset: (item: T) => void, initialSize: number = 0) {
    this.factory = factory;
    this.reset = reset;
    for (let i = 0; i < initialSize; i++) {
      this.available.push(factory());
    }
  }

  acquire(): T {
    if (this.available.length > 0) {
      const item = this.available.pop()!;
      this.reset(item);
      return item;
    }
    return this.factory();
  }

  release(item: T): void {
    this.available.push(item);
  }

  get size(): number {
    return this.available.length;
  }

  clear(): void {
    this.available = [];
  }
}
