export interface ProofPlatform {
  submitEvidence(data: any): Promise<{ proofId: string }>;
  viewEvidence(proofId: string): Promise<any>;
}
