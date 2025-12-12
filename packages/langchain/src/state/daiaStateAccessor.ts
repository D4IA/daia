import { DaiaStateNamespaced } from "./daiaSchema";

export class DaiaStateAccessor<S extends DaiaStateNamespaced> {
    constructor(
        private readonly state: Readonly<S>
    ) { }

    public readonly hasDaiaOutput = () => {
        return this.state.daia.output.outputText.length > 0
    }
    
    public readonly getDaiaOutput = () => {
        return this.state.daia.output.outputText
    }

    public readonly getRemotePublicKey = () => {
        return this.state.daia.remotePublicKey.remotePublicKey
    }

    public readonly hasRemotePublicKey = () => {
        return this.state.daia.remotePublicKey.remotePublicKey.length > 0
    }

    public readonly isPublicIdentityResponseProcessed = () => {
        return this.state.daia.responsePublicIdentity.processed
    }
}