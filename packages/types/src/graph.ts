export type KnowledgeNodeType =
  | 'concept'
  | 'model_architecture'
  | 'algorithm'
  | 'technique'
  | 'paper'
  | 'benchmark'
  | 'framework'
  | 'hardware';

export type KnowledgeEdgeType =
  | 'improves'
  | 'uses'
  | 'replaces'
  | 'cites'
  | 'implements'
  | 'prerequisite_of'
  | 'evaluated_on';

export interface KnowledgeNode {
  id: string;
  label: string;
  nodeType: KnowledgeNodeType;
  description: string | null;
  importance: number; // 0.0 to 1.0 (PageRank / Centrality)
  sourcePaperId: string | null;
  sourceTopicId: string | null;
  properties: Record<string, unknown>;
  createdAt: string;
}

export interface KnowledgeEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  edgeType: KnowledgeEdgeType;
  weight: number;
  description: string | null;
  createdAt: string;
}

export interface KnowledgeGraphData {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
}
