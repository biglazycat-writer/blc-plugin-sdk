/** API 1 revision 6: general text translation provider contract. */
import type {Invocation} from './index.js';
export type TranslationSegment = {id: string; text: string};
export type TranslationInput = {segments: TranslationSegment[]; sourceLanguage?: string; targetLanguage: string};
export type TranslationResult = {segments: TranslationSegment[]; sourceLanguage: string; targetLanguage: string};
export type TranslationCapabilities = {pairs: {source: string; target: string}[]; autoDetect: boolean; offline: boolean};
export interface TranslationProviderService {
  languages(args: Record<string, never>, invocation: Invocation): TranslationCapabilities | Promise<TranslationCapabilities>;
  translate(args: TranslationInput, invocation: Invocation): TranslationResult | Promise<TranslationResult>;
}
