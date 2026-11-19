/** API 1 revision 6: structured OCR provider contract. */
import type {Invocation, ProviderByteChunk} from './index.js';
export type ProviderJobStatus = {state:'waiting'|'running'|'completed'|'failed'|'cancelled'; progress?:number; error?:string; errorCode?:string};

export type OCRPoint = {x: number; y: number};
export type OCRBox = {x: number; y: number; width: number; height: number};
export type OCRBlockType = 'line' | 'paragraph' | 'heading' | 'list' | 'table' | 'image' | 'formula' | 'code' | 'unknown';
export type OCRStyle = {fontSize?: number; fontFamily?: string; bold?: boolean; italic?: boolean; color?: string; align?: 'left'|'center'|'right'|'justify'};
export type OCRSpan = {text: string; bbox?: OCRBox; style?: OCRStyle};
export type OCRLine = {text: string; bbox: OCRBox; polygon?: OCRPoint[]; confidence?: number; spans?: OCRSpan[]};
export type OCRCell = {row: number; column: number; rowSpan: number; columnSpan: number; bbox: OCRBox; text: string; lines?: OCRLine[]};
export type OCRBlock = {
  id: string; type: OCRBlockType; bbox: OCRBox; polygon?: OCRPoint[]; readingOrder: number;
  geometrySource: 'detected'|'estimated'; text?: string; confidence?: number; style?: OCRStyle;
  estimatedStyleFields?: (keyof OCRStyle)[]; headingLevel?: 1|2|3|4|5|6; lines?: OCRLine[];
  list?: {ordered: boolean; items: {text: string; bbox: OCRBox}[]};
  table?: {rows: number; columns: number; cells: OCRCell[]};
};
export type OCRPage = {width: number; height: number; coordinateSpace: 'normalized'; blocks: OCRBlock[]};
export type OCRDocument = {schemaVersion: 1; pages: OCRPage[]};
export type OCRCapabilities = {geometry: ('region'|'line'|'word')[]; blockTypes: OCRBlockType[]; styles: (keyof OCRStyle)[]; geometrySource: 'detected'|'estimated'};
export type OCRRequirements = {geometry?: 'region'|'line'|'word'; blockTypes?: OCRBlockType[]; styles?: (keyof OCRStyle)[]};
export interface OCRProviderServiceV2 {
  capabilities(args: Record<string, never>, invocation: Invocation): OCRCapabilities | Promise<OCRCapabilities>;
  put(args: {id: string; index: number; chunk: string}, invocation: Invocation): unknown;
  finish(args: {id: string}, invocation: Invocation): unknown;
  start(args: {transferId: string; source?: string; requirements?: OCRRequirements}, invocation: Invocation): {jobId: string} | Promise<{jobId: string}>;
  status(args: {jobId: string}, invocation: Invocation): ProviderJobStatus | Promise<ProviderJobStatus>;
  result(args: {jobId: string; offset: number; limit: number}, invocation: Invocation): ProviderByteChunk | Promise<ProviderByteChunk>;
  cancel(args: {jobId: string}, invocation: Invocation): unknown;
  release(args: {transferId?: string; jobId?: string}, invocation: Invocation): unknown;
}
