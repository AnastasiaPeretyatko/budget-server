import { TagEntity } from '../tag.entity';

export enum TagSort {
  USAGE = 'usage',
  NAME = 'name',
  CREATED = 'created',
}

export interface TagStats {
  transactionCount: number;
  periodAmount: string | null;
  periodDays: number | null;
}

export type TagWithStats = TagEntity & TagStats;
