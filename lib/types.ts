export interface ResearchSource {
  url: string;
  title: string;
  relevance: number;
  timestamp: string;
  credibility?: number;
  verified?: boolean;
  domain?: string;
  type?: 'official' | 'community' | 'academic' | 'news' | 'social' | 'other';
}

export interface ResearchPlan {
  mainQuery: string;
  objective: string;
  subQueries: string[];
  researchAreas: string[];
  explorationStrategy: string;
  priorityOrder: string[];
}

export interface ResearchResult {
  query: string;
  findings: string;
  analysis: string;
  sources: ResearchSource[];
  confidence: number;
  researchPath: string[];
  plan: ResearchPlan;
}

export interface ResearchError {
  code: string;
  message: string;
  details?: string;
}