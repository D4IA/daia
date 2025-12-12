import { DaiaState, DaiaStateInit } from "./daiaSchema"

export class DaiaStateBuilder {
    private state: DaiaState

    constructor(initialState?: Partial<DaiaState>) {
        this.state = {
            ...DaiaStateInit,
            ...initialState
        }
    }

    public static fromExisting(existingState: DaiaState): DaiaStateBuilder {
        return new DaiaStateBuilder(existingState)
    }

    public withPublicKey(publicKey: string): this {
        this.state = {
            ...this.state,
            requestPublicIdentity: {
                ...this.state.requestPublicIdentity,
                publicKey
            }
        }
        return this
    }

    public withInputText(inputText: string): this {
        this.state = {
            ...this.state,
            input: {
                ...this.state.input,
                inputText
            }
        }
        return this
    }

    public build(): DaiaState {
        return this.state
    }
}
