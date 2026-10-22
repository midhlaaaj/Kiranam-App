import { describe, expect, it } from 'vitest';
import { fitWithin } from './resizeImage';

describe('fitWithin', () => {
  it('scales a landscape photo so its long edge is the max', () => {
    expect(fitWithin(4000, 3000, 512)).toEqual({ width: 512, height: 384, scaled: true });
  });
  it('scales a portrait photo so its long edge is the max', () => {
    expect(fitWithin(3000, 4000, 512)).toEqual({ width: 384, height: 512, scaled: true });
  });
  it('never upscales an image that already fits', () => {
    expect(fitWithin(200, 100, 512)).toEqual({ width: 200, height: 100, scaled: false });
  });
  it('leaves an image exactly at the max unchanged', () => {
    expect(fitWithin(512, 512, 512)).toEqual({ width: 512, height: 512, scaled: false });
  });
  it('never produces a zero dimension for extreme aspect ratios', () => {
    expect(fitWithin(10000, 1, 512).height).toBe(1);
  });
});
