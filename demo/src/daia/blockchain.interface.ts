export interface BlockchainModule {
  storeAgreement(data: any): Promise<{ txId: string }>;
  readAgreement(txId: string): Promise<any>;
}
