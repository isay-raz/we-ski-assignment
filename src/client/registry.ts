import { HotelProvider } from '../types';
import { DummyProvider } from './providers/dummyProvider';

export function createProviders(): HotelProvider[] {
  return [new DummyProvider()];
}
