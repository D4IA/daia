---
title: "Building Offers"
description: "Using DaiaOfferBuilder to construct offers with requirements."
summary: ""
date: 2024-01-05T12:00:00+00:00
lastmod: 2024-01-05T12:00:00+00:00
draft: false
weight: 200
toc: true
seo:
  title: "Building DAIA Offers"
  description: "Guide to constructing offers using DaiaOfferBuilder"
  canonical: ""
  noindex: false
---

## Overview

Offers are proposals with requirements that must be fulfilled. Use `DaiaOfferBuilder` to construct offers with various requirement types.

## Basic Offer Structure

Every offer needs:
- **Natural language content** - Human-readable description
- **Offer type identifier** - Protocol-specific type string
- **At least one requirement** - What must be satisfied

## Using DaiaOfferBuilder

### Creating a Simple Offer

```typescript
import { DaiaOfferBuilder } from '@d4ia/core';
import { PrivateKey } from '@d4ia/blockchain';

const offererKey = PrivateKey.fromRandom();

const offer = DaiaOfferBuilder.new()
  .setOfferTypeIdentifier('parking-access')
  .setNaturalLanguageContent('Access to parking lot for 1 hour')
  .addSelfSignedRequirement(offererKey)
  .build();
```

### Adding Signature Requirements

Require another party to sign:

```typescript
const signeePublicKey = signeePrivateKey.toPublicKey().toString();

const offer = DaiaOfferBuilder.new()
  .setOfferTypeIdentifier('service-agreement')
  .setNaturalLanguageContent('Service agreement')
  .addSelfSignedRequirement(offererKey)
  .addSignRequirement(signeePublicKey)
  .build();
```

### Adding Payment Requirements

{{< callout context="note" title="Network Parameter" icon="outline/info-circle" >}}
BSV addresses require a network parameter: use `'testnet'` for testing or `'mainnet'` for production when calling `.toAddress()`.
{{< /callout >}}

**Self-authenticated payments** (aggregated into main transaction):

```typescript
const recipientAddress = recipientKey.toPublicKey().toAddress('testnet').toString();

const offer = DaiaOfferBuilder.new()
  .setOfferTypeIdentifier('parking-payment')
  .setNaturalLanguageContent('Pay for parking')
  .addSelfSignedRequirement(offererKey)
  .addSelfAuthenticatedPaymentRequirement(recipientAddress, 1000)
  .build();
```

**Remote payments** (separate transaction):

```typescript
const recipientAddress = recipientKey.toPublicKey().toAddress('testnet').toString();

const offer = DaiaOfferBuilder.new()
  .setOfferTypeIdentifier('service-payment')
  .setNaturalLanguageContent('Service payment')
  .addSelfSignedRequirement(offererKey)
  .addRemotePaymentRequirement(recipientAddress, 5000)
  .build();
```

### Adding Reference Requirements

Require proof of previous agreement:

```typescript
import { DaiaRemoteAgreementPointerType } from '@d4ia/core';

const offer = DaiaOfferBuilder.new()
  .setOfferTypeIdentifier('premium-access')
  .setNaturalLanguageContent('Premium lot access (requires parking pass)')
  .addSelfSignedRequirement(offererKey)
  .addAgreementReferenceByTxId('abc123...', 'parking-pass')
  .build();
```

## Complete Example

See [Build-Sign-Verify Example]({{< ref "/docs/example/build-sign-verify-example" >}}) for a full workflow example.
