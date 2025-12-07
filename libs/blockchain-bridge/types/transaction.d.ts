export type ScriptSig = {
  asm: string;
  hex: string;
};

export type Vin = {
  coinbase?: string;
  txid: string;
  vout: number;
  scriptSig: ScriptSig;
  sequence: number;
};

export type ScriptPubKey = {
  asm: string;
  hex: string;
  reqSigs: number;
  type: string;
  addresses: string[];
  isTruncated: boolean;
};

export type Vout = {
  value: number;
  n: number;
  scriptPubKey: ScriptPubKey;
};

export type Transaction = {
  txid: string;
  hash: string;
  version: number;
  size: number;
  locktime: number;
  vin: Vin[];
  vout: Vout[];
  blockhash: string;
  confirmations: number;
  time: number;
  blocktime: number;
  blockheight: number;
};

export type TransactionShortDetails = {
  txid: string;
  hex: string;
  blockhash: string;
  blockheight: number;
  blocktime: number;
  confirmations: number;
}
