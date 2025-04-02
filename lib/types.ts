export interface ResearchSource {
  url: string;
  title: string;
  relevance: number;
  timestamp: string;
  content: string;
  credibility?: number;
  verified?: boolean;
  domain?: string;
  type?: 'official' | 'community' | 'blog' | 'forum' | 'documentation' | 'other';
  validationScore?: number;
  validationMetadata?: {
    technicalTerms: boolean;
    consistentWithQuery: number;
    aiGenerationLikelihood: 'high' | 'medium' | 'low';
    factualClaimsScore: number;
    freshnessScore: number;
    hasCode: boolean;
  };
}

export interface ResearchPlan {
  mainQuery: string;
  objective: string;
  subQueries: string[];
  researchAreas: string[];
  explorationStrategy: string;
  priorityOrder: string[];
}

export interface ResearchFinding {
  key: string;
  details: string;
}

export interface CodeExample {
  code: string;
  language: string;
  title: string;
  source: {
    url: string;
    title: string;
  };
}

export type ResearchConfidenceLevel = 'very high' | 'high' | 'medium' | 'low' | 'very low';

export interface ResearchResult {
  query: string;
  findings: ResearchFinding[];
  sources: ResearchSource[];
  codeExamples?: CodeExample[];
  factConsensus?: string[];
  insights?: string[];
  confidenceLevel: ResearchConfidenceLevel;
  metadata: {
    totalSources: number;
    qualitySources: number;
    avgValidationScore: number;
    executionTimeMs: number;
    timestamp: string;
    error?: string;
  };
  researchMetrics?: {
    sourcesCount: number;
    domainsCount: number;
    dataSize: string;
    elapsedTime: number;
  };
}

export interface ResearchError {
  code: string;
  message: string;
  details?: string;
}