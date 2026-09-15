import {describe, expect, it} from 'vitest';
import HistoryQueue from './HistoryQueue';

describe('HistoryQueue', () => {
    it('maintains undo and redo order', () => {
        const queue = new HistoryQueue<number>(3);
        queue.enqueue(1);
        queue.enqueue(2);
        expect(queue.backoff()).toBe(2);
        expect(queue.backoff()).toBe(1);
        expect(queue.backoff()).toBeNull();
        expect(queue.forward()).toBe(1);
        expect(queue.forward()).toBe(2);
        expect(queue.forward()).toBeNull();
    });

    it('discards the redo branch and keeps capacity invariants', () => {
        const queue = new HistoryQueue<number>(3);
        [1, 2, 3].forEach(value => queue.enqueue(value));
        expect(queue.backoff()).toBe(3);
        expect(queue.backoff()).toBe(2);
        queue.enqueue(4);
        expect(queue.getSize()).toBe(2);
        expect(queue.forward()).toBeNull();
        expect(queue.backoff()).toBe(4);
        queue.enqueue(5);
        queue.enqueue(6);
        queue.enqueue(7);
        expect(queue.getSize()).toBe(3);
        expect(queue.getFront()).toBe(5);
        expect(queue.getRear()).toBe(7);
    });

    it('clears all state idempotently', () => {
        const queue = new HistoryQueue<number>(1);
        queue.enqueue(1);
        queue.clear();
        queue.clear();
        expect(queue.isEmpty()).toBe(true);
        expect(queue.getBack()).toBe(-1);
    });
});
