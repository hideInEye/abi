import {describe, expect, it, vi} from 'vitest';
import {runDataRequestFlow} from './requestFlow';

describe('dashboard data config request flow', () => {
    it('does not run transform or success callbacks for rejected requests and business failures', async () => {
        const transform = vi.fn(data => data);
        const onSuccess = vi.fn();
        const shared = {
            isSuccess: (response: {code: number}) => response.code === 200,
            onSuccess,
            selectData: (response: {code: number; data?: unknown}) => response.data,
            transform,
        };

        await expect(runDataRequestFlow({...shared, request: async () => ({code: 500})})).resolves.toMatchObject({success: false});
        await expect(runDataRequestFlow({...shared, request: async () => { throw new Error('offline'); }})).resolves.toEqual({success: false, message: 'offline'});
        expect(transform).not.toHaveBeenCalled();
        expect(onSuccess).not.toHaveBeenCalled();
    });

    it('executes the success callback only after response selection and transformation', async () => {
        const order: string[] = [];
        const result = await runDataRequestFlow({
            request: async () => ({code: 200, data: {rows: [1]}}),
            isSuccess: response => response.code === 200,
            selectData: response => { order.push('select'); return response.data; },
            transform: data => { order.push('transform'); return data; },
            onSuccess: () => { order.push('success'); },
        });

        expect(result).toEqual({success: true, data: {rows: [1]}});
        expect(order).toEqual(['select', 'transform', 'success']);
    });
});
