import { Transaction, Script } from "@bsv/sdk";

/**
 * Error thrown when data cannot be extracted from a transaction.
 */
export class DataExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DataExtractionError";
  }
}

/**
 * Parser for extracting data from Bitcoin transactions.
 * Focuses on reading OP_RETURN data outputs.
 */
export class TransactionParser {
  /**
   * Extract data from a transaction's OP_RETURN output.
   *
   * @param txHex - Transaction in hex format
   * @returns Decoded string data from OP_RETURN output, or null if not found
   * @throws {DataExtractionError} When transaction is malformed
   */
  extractData(txHex: string): string | null {
    try {
      const tx = Transaction.fromHex(txHex);
      return this.extractDataFromTransaction(tx);
    } catch (error) {
      if (error instanceof DataExtractionError) {
        throw error;
      }
      throw new DataExtractionError(
        `Failed to parse transaction: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Extract data from a Transaction object.
   *
   * @param tx - Transaction object
   * @returns Decoded string data from OP_RETURN output, or null if not found
   */
  extractDataFromTransaction(tx: Transaction): string | null {
    // Find OP_RETURN output
    for (const output of tx.outputs) {
      if (this.isOpReturnOutput(output.lockingScript)) {
        return this.decodeOpReturnData(output.lockingScript);
      }
    }

    return null;
  }

  /**
   * Check if a script is an OP_RETURN script.
   *
   * @param script - Locking script to check
   * @returns True if script is OP_RETURN
   */
  private isOpReturnOutput(script: Script): boolean {
    const hex = script.toHex();
    // OP_RETURN is 0x6a, check if it appears early in the script
    // Common patterns: 006a... (OP_0 OP_RETURN) or just 6a... (OP_RETURN)
    return hex.startsWith("006a") || hex.startsWith("6a");
  }

  /**
   * Decode data from an OP_RETURN script.
   *
   * @param script - OP_RETURN locking script
   * @returns Decoded string data
   */
  private decodeOpReturnData(script: Script): string {
    const hex = script.toHex();

    // Parse the hex to extract data after OP_RETURN (0x6a)
    // Format: [OP_0 (00)]? 6a <push_op> <data>
    let dataStart = 0;

    // Skip OP_0 if present
    if (hex.startsWith("00")) {
      dataStart = 2;
    }

    // Skip OP_RETURN (0x6a)
    if (hex.substring(dataStart, dataStart + 2) === "6a") {
      dataStart += 2;
    } else {
      return "";
    }

    // Next byte(s) indicate how to read the data length
    if (dataStart >= hex.length) {
      return "";
    }

    const pushOp = hex.substring(dataStart, dataStart + 2);
    const pushOpValue = parseInt(pushOp, 16);
    let dataLength: number;
    let dataHexStart: number;

    if (pushOpValue === 0) {
      // Empty data
      return "";
    } else if (pushOpValue <= 0x4b) {
      // Direct push (1-75 bytes)
      dataLength = pushOpValue;
      dataHexStart = dataStart + 2;
    } else if (pushOpValue === 0x4c) {
      // OP_PUSHDATA1: next 1 byte is length
      dataLength = parseInt(hex.substring(dataStart + 2, dataStart + 4), 16);
      dataHexStart = dataStart + 4;
    } else if (pushOpValue === 0x4d) {
      // OP_PUSHDATA2: next 2 bytes is length (little-endian)
      const lengthHex = hex.substring(dataStart + 2, dataStart + 6);
      dataLength = parseInt(lengthHex.substring(2, 4) + lengthHex.substring(0, 2), 16);
      dataHexStart = dataStart + 6;
    } else if (pushOpValue === 0x4e) {
      // OP_PUSHDATA4: next 4 bytes is length (little-endian)
      const lengthHex = hex.substring(dataStart + 2, dataStart + 10);
      dataLength = parseInt(
        lengthHex.substring(6, 8) +
          lengthHex.substring(4, 6) +
          lengthHex.substring(2, 4) +
          lengthHex.substring(0, 2),
        16
      );
      dataHexStart = dataStart + 10;
    } else {
      // Unknown opcode
      return "";
    }

    // Extract the data
    const dataHex = hex.substring(dataHexStart, dataHexStart + dataLength * 2);

    // Convert hex to string
    try {
      return Buffer.from(dataHex, "hex").toString("utf8");
    } catch (error) {
      throw new DataExtractionError(`Failed to decode hex data: ${dataHex}`);
    }
  }

  /**
   * Extract all outputs from a transaction with their details.
   *
   * @param txHex - Transaction in hex format
   * @returns Array of output details
   */
  getOutputs(
    txHex: string
  ): Array<{ satoshis: number; script: string; isOpReturn: boolean }> {
    try {
      const tx = Transaction.fromHex(txHex);

      return tx.outputs.map((output) => ({
        satoshis: output.satoshis || 0,
        script: output.lockingScript.toASM(),
        isOpReturn: this.isOpReturnOutput(output.lockingScript),
      }));
    } catch (error) {
      if (error instanceof DataExtractionError) {
        throw error;
      }
      throw new DataExtractionError(
        `Failed to parse transaction outputs: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
