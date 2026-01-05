---
title: "Requirements and Proofs Examples"
description: "Practical examples of using requirements and proofs in DAIA offers."
summary: ""
date: 2024-01-05T11:00:00+00:00
lastmod: 2024-01-05T11:00:00+00:00
draft: false
weight: 200
toc: true
seo:
  title: "DAIA Requirements and Proofs Examples" # custom title (optional)
  description: "Code examples for creating offers with different requirement patterns" # custom description (recommended)
  canonical: "" # custom canonical URL (optional)
  noindex: false # false (default) or true
---

{{< callout context="note" title="For Detailed Explanations" icon="outline/info-circle" >}}
See [Requirements and Proofs Reference]({{< ref "/docs/reference/requirements-and-proofs" >}}) for detailed specifications of requirement types, proof formats, and validation rules.
{{< /callout >}}

This document provides practical examples of building offers with different requirement types.

## Minimum Valid Offer

Usually, for most use cases every offer needs at least one self-signed requirement:

```typescript
import { DaiaOfferBuilder } from '@d4ia/core';

const offer = DaiaOfferBuilder.new()
  .setOfferTypeIdentifier('SIMPLE')
  .setNaturalLanguageContent('Simple offer')
  .addSelfSignedRequirement(myPrivateKey)  // Minimum requirement
  .build();
```

## Mutual Agreement (No Payment)

Both parties sign:

```typescript
const offer = DaiaOfferBuilder.new()
  .setOfferTypeIdentifier('CONTRACT')
  .setNaturalLanguageContent('Terms of service')
  .addSelfSignedRequirement(partyAKey)    // Party A signs
  .addSignRequirement(partyBPublicKey)    // Party B must sign
  .build();
```

## Offer with Payment

Offerer signs, acceptor pays and signs:

{{< callout context="note" title="Payment Types" icon="outline/info-circle" >}}
For all intents and purposes, self-authenticated and remote payment agreements are functionally identical. **Prefer self-authenticated payments** unless the payment must be made in advance or details of the actual agreement must be kept secret.
{{< /callout >}}

```typescript
import { PublicKey } from '@d4ia/blockchain';

const recipientAddress = offererKey.toPublicKey().toAddress('testnet').toString();

const offer = DaiaOfferBuilder.new()
  .setOfferTypeIdentifier('PAID_AGREEMENT')
  .setNaturalLanguageContent('Agreement terms with payment requirement')
  .addSelfSignedRequirement(offererKey)
  .addSignRequirement(acceptorPublicKey)
  .addSelfAuthenticatedPaymentRequirement(recipientAddress, 10000)
  .build();
```

## Multiple Requirements

Offer with all requirement types:

```typescript
import { DaiaOfferBuilder } from '@d4ia/core';
import { PublicKey } from '@d4ia/blockchain';

const recipientAddress = recipientKey.toPublicKey().toAddress('testnet').toString();

const offer = DaiaOfferBuilder.new()
  .setOfferTypeIdentifier('COMPLEX_AGREEMENT')
  .setNaturalLanguageContent('Agreement with payment and reference requirements')
  // Signatures
  .addSelfSignedRequirement(offererKey)      // Offerer signs offer
  .addSignRequirement(acceptorPublicKey)      // Acceptor signs to accept
  // Payments
  .addRemotePaymentRequirement(               // Payment (separate tx)
    recipientAddress,
    5000,
    'payment-nonce'
  )
  .addSelfAuthenticatedPaymentRequirement(    // Payment (in the same transaction as agreement)
    recipientAddress,
    10000
  )
  // Reference
  .addAgreementReferenceByTxId(               // Link to previous agreement
    previousAgreementTxId,
    'REFERENCE'
  )
  
  .build();
```

This creates 5 requirements that must each have a corresponding proof when the offer is signed.

## Agreement with Reference

Reference a previous agreement:

```typescript
const recipientAddress = offererKey.toPublicKey().toAddress('testnet').toString();

const offer = DaiaOfferBuilder.new()
  .setOfferTypeIdentifier('DEPENDENT_AGREEMENT')
  .setNaturalLanguageContent('Agreement depending on previous agreement')
  .addSelfSignedRequirement(offererKey)
  .addSignRequirement(acceptorPublicKey)
  .addAgreementReferenceByTxId(
    previousAgreementTxId,
    'DEPENDS_ON'
  )
  .addSelfAuthenticatedPaymentRequirement(
    recipientAddress,
    10000
  )
  .build();
```

## Remote Payment Only

Payment made in advance before agreement is published:

```typescript
const recipientAddress = offererKey.toPublicKey().toAddress('testnet').toString();

const offer = DaiaOfferBuilder.new()
  .setOfferTypeIdentifier('ADVANCE_PAYMENT')
  .setNaturalLanguageContent('Agreement requiring advance payment verification')
  .addSelfSignedRequirement(offererKey)
  .addSignRequirement(acceptorPublicKey)
  .addRemotePaymentRequirement(
    recipientAddress,
    5000,
    'payment-identifier-1234567'
  )
  .build();
```

Use this pattern when the acceptor must prove payment in a separate transaction before the offerer signs the agreement.


