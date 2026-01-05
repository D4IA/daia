---
title: "Signer/Verifier Setup"
description: "Setting up signers and verifiers for DAIA agreements with BSV blockchain."
summary: ""
date: 2024-01-05T12:00:00+00:00
lastmod: 2024-01-05T12:00:00+00:00
draft: false
weight: 100
toc: true
seo:
  title: "DAIA Signer/Verifier Setup Guide"
  description: "Configure signers and verifiers for DAIA agreements"
  canonical: ""
  noindex: false
---

## Overview

Signers and verifiers are the core components for creating and validating DAIA agreements:

- **Signers** accept offers and fulfill their requirements (signatures, payments, references) to create agreements, which are then published to the blockchain
- **Verifiers** read agreements from the blockchain and validate that all requirements were properly satisfied

The BSV blockchain implementation provides:

- **`DefaultDaiaOfferSigner`** - Signs offers to create agreements and publishes them to BSV blockchain
- **`DefaultDaiaAgreementVerifier`** - Verifies agreements by reading and validating BSV transactions

## Type Dependencies

```mermaid
graph TB
    PK[PrivateKey]
    Net[BsvNetwork]
    
    PK --> Factory[BsvTransactionFactory]
    Net --> Factory
    Net --> Parser[BsvTransactionParser]
    
    Factory --> Signer[DefaultDaiaOfferSigner]
    PK --> SignRes[DefaultDaiaSignRequirementResolver]
    Factory --> PayRes[DefaultDaiaPaymentRequirementResolver]
    
    SignRes -.optional.-> Signer
    PayRes -.optional.-> Signer
    MapRefRes[MapDaiaReferenceRequirementResolver] -.optional.-> Signer
    
    Parser --> Verifier[DefaultDaiaAgreementVerifier]
    
    style Signer fill:#e1f5ff
    style Verifier fill:#e1f5ff
```

## Requirement Resolvers

Resolvers fulfill specific requirement types when signing offers. When a signer receives an offer with requirements, these resolvers determine how to satisfy each requirement type.

### DefaultDaiaSignRequirementResolver

**Purpose:** Creates cryptographic signature proofs for SIGN requirements. Verifies the signer's public key matches the required key, generates a nonce, and signs the offer content.

```typescript
import { DefaultDaiaSignRequirementResolver } from '@d4ia/core';
import { PrivateKey } from '@d4ia/blockchain';

const privateKey = PrivateKey.fromRandom();
const signResolver = new DefaultDaiaSignRequirementResolver(privateKey);
```

### DefaultDaiaPaymentRequirementResolver

**Purpose:** Handles PAYMENT requirements by either aggregating self-authenticated payments into the main transaction, or creating separate blockchain transactions for remote-authenticated payments.

{{< callout context="caution" title="Payment Validation Required" icon="outline/alert-triangle" >}}
The default payment resolver will pay any amount to any address specified in the offer's payment requirements. **Always validate payment amounts and recipient addresses in the offer before signing.**
{{< /callout >}}


```typescript
import { DefaultDaiaPaymentRequirementResolver } from '@d4ia/core';
import { BsvTransactionFactory, PrivateKey, BsvNetwork } from '@d4ia/blockchain';

const privateKey = PrivateKey.fromRandom();
const factory = new BsvTransactionFactory(privateKey, BsvNetwork.TEST);
const paymentResolver = new DefaultDaiaPaymentRequirementResolver(factory);
```

### MapDaiaReferenceRequirementResolver

**Purpose:** Resolves AGREEMENT_REFERENCE requirements by mapping reference types to agreement pointers. Used when offers require proof of access to previous agreements identified by type strings.

```typescript
import { MapDaiaReferenceRequirementResolver, DaiaRemoteAgreementPointerType } from '@d4ia/core';

const referenceResolver = MapDaiaReferenceRequirementResolver.builder()
  .addReference('parking-pass', {
    type: DaiaRemoteAgreementPointerType.TX_ID,
    txId: 'abc123...',
  })
  .build();
```

## Examples

See [Build-Sign-Verify Example]({{< ref "/docs/example/build-sign-verify-example" >}}) for a complete workflow example.
