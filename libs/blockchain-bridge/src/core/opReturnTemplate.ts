import { Script, OP, LockingScript, Utils } from '@bsv/sdk';

/**
 * Template for creating OP_RETURN locking scripts.
 * OP_RETURN is used to store arbitrary data on the blockchain.
 */
export class OpReturnTemplate {
  /**
   * Creates an OP_RETURN locking script with the provided data.
   * @param data - String or array of strings to embed in the script
   * @returns LockingScript containing the OP_RETURN data
   */
  lock(data: string | string[]): LockingScript {
    const script = new Script();
    
    script.writeOpCode(OP.OP_FALSE);
    script.writeOpCode(OP.OP_RETURN);

    // Normalize to array
    const dataArray = typeof data === 'string' ? [data] : data;

    // Write each data entry
    for (const entry of dataArray.filter(Boolean)) {
      const arr = Utils.toArray(entry, 'utf8');
      script.writeBin(arr);
    }

    return new LockingScript(script.chunks);
  }

  /**
   * OP_RETURN outputs cannot be unlocked (they are provably unspendable)
   */
  unlock(): never {
    throw new Error('Unlock is not supported for OP_RETURN scripts');
  }
}

export const createOpReturnLockingScript = (data: string | string[]) => {
  const template = new OpReturnTemplate();
  return template.lock(data);
}