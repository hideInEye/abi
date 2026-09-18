export default class HistoryQueue<T> {
    private readonly capacity: number;
    private elements: T[] = [];
    // Cursor points to the next record that forward() would replay.
    private cursor = 0;
    private circulated = false;

    constructor(capacity: number = 10) {
        if (!Number.isInteger(capacity) || capacity <= 0) throw new Error('History capacity must be a positive integer');
        this.capacity = capacity;
    }

    enqueue(item: T): void {
        if (this.cursor < this.elements.length) this.elements = this.elements.slice(0, this.cursor);
        this.elements.push(item);
        if (this.elements.length > this.capacity) {
            this.elements.shift();
            this.circulated = true;
        }
        this.cursor = this.elements.length;
    }

    getFront(): T | null {
        return this.elements[0] ?? null;
    }

    getRear(): T | null {
        return this.elements[this.elements.length - 1] ?? null;
    }

    backoff(): T | null {
        if (this.cursor === 0) return null;
        this.cursor -= 1;
        return this.elements[this.cursor] ?? null;
    }

    forward(): T | null {
        if (this.cursor >= this.elements.length) return null;
        const record = this.elements[this.cursor];
        this.cursor += 1;
        return record ?? null;
    }

    getBackPointElem(): T | null {
        return this.cursor > 0 ? this.elements[this.cursor - 1] ?? null : null;
    }

    isEmpty(): boolean {
        return this.elements.length === 0;
    }

    isFull(): boolean {
        return this.elements.length === this.capacity;
    }

    getSize(): number {
        return this.elements.length;
    }

    getBack(): number {
        return this.cursor - 1;
    }

    getCirculate(): boolean {
        return this.circulated;
    }

    clear(): void {
        this.elements = [];
        this.cursor = 0;
        this.circulated = false;
    }
}
