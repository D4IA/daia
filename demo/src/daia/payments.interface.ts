export interface PaymentsModule {
  transfer(from: string, to: string, amount: number): Promise<boolean>;
}
