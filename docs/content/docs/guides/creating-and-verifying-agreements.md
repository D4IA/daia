---
title: "Creating and Verifying Agreements"
description: "Learn how to create, sign, and verify blockchain-based agreements between AI agents using the DAIA protocol."
summary: ""
date: 2024-01-05T10:00:00+00:00
lastmod: 2024-01-05T10:00:00+00:00
draft: false
weight: 300
toc: true
seo:
  title: "Creating and Verifying DAIA Agreements" # custom title (optional)
  description: "Step-by-step guide to creating, signing, and verifying blockchain agreements in the DAIA protocol" # custom description (recommended)
  canonical: "" # custom canonical URL (optional)
  noindex: false # false (default) or true
---

This guide walks you through the complete process of creating a blockchain-based agreement between AI agents using the DAIA protocol. You'll learn how to build an offer, sign it to create an agreement, and verify the agreement's authenticity.

## Prerequisites

Before you begin, make sure you have:

- Installed the `@d4ia/core` package
- Installed the `@d4ia/blockchain` package
- A configured blockchain transaction factory
- Private keys for the agents involved

## Overview

The DAIA protocol enables AI agents to create verifiable agreements on the blockchain. The process involves three main steps:

1. **Building an Offer** - Define requirements that must be fulfilled
2. **Signing the Offer** - Create proofs for each requirement and generate a blockchain transaction
3. **Verifying the Agreement** - Validate that all requirements were properly fulfilled

## Step 1: Building an Offer

An offer specifies what requirements must be fulfilled for an agreement to be valid. Use the `DaiaOfferBuilder` to construct your offer:

```typescript
import { DaiaOfferBuilder } from '@d4ia/core';

// Create a simple offer with a signature requirement
const offer = DaiaOfferBuilder.new()
  .setOfferTypeIdentifier('PARKING-GATE-ACCESS')
  .setNaturalLanguageContent('Access to parking gate for 1 hour')
  .addSignRequirement(signeePublicKey)
  .build();
```

### Adding Different Requirement Types

The DAIA protocol supports three types of requirements:

#### Signature Requirements

Require a specific party to sign the agreement:

```typescript
const offer = DaiaOfferBuilder.new()
  .setOfferTypeIdentifier('CONTRACT')
  .setNaturalLanguageContent('Service agreement')
  .addSignRequirement(clientPublicKey)
  .build();
```

#### Payment Requirements

Require a payment to be made:

```typescript
// Self-authenticated payment (included in the agreement transaction)
const offer = DaiaOfferBuilder.new()
  .setOfferTypeIdentifier('RENTAL-AGREEMENT')
  .setNaturalLanguageContent('Office space rental')
  .addSelfAuthenticatedPaymentRequirement(
    landlordAddress,  // recipient address
    50000             // amount in satoshis
  )
  .build();

// Remote payment (separate transaction)
const offer = DaiaOfferBuilder.new()
  .setOfferTypeIdentifier('ESCROW-SERVICE')
  .setNaturalLanguageContent('Escrow payment')
  .addRemotePaymentRequirement(
    escrowAddress,
    100000,
    'payment-nonce-123'  // optional nonce for verification
  )
  .build();
```

#### Agreement Reference Requirements

Require a reference to another existing agreement:

```typescript
const offer = DaiaOfferBuilder.new()
  .setOfferTypeIdentifier('RENEWAL-CONTRACT')
  .setNaturalLanguageContent('Contract renewal')
  .addAgreementReferenceByTxId(
    previousAgreementTxId,
    'previous-contract'  // reference type
  )
  .build();
```

### Self-Signed Requirements

The offer creator can also self-sign requirements:

```typescript
const offer = DaiaOfferBuilder.new()
  .setOfferTypeIdentifier('BILATERAL-AGREEMENT')
  .setNaturalLanguageContent('Two-party agreement')
  .addSelfSignedRequirement(offererPrivateKey)  // Offerer signs
  .addSignRequirement(signeePublicKey)          // Other party must sign
  .build();
```

## Step 2: Signing an Offer

Once you have an offer, the signer must fulfill all requirements and create the agreement. This is done using the `DefaultDaiaOfferSigner`:

```typescript
import { 
  DefaultDaiaOfferSigner,
  DefaultDaiaSignRequirementResolver,
  DefaultDaiaPaymentRequirementResolver
} from '@d4ia/core';

// Configure the signer with resolvers
const signer = new DefaultDaiaOfferSigner({
  transactionFactory,  // Your blockchain transaction factory
  signResolver: new DefaultDaiaSignRequirementResolver(signeePrivateKey),
  paymentResolver: new DefaultDaiaPaymentRequirementResolver(transactionFactory)
});

// Sign the offer
const response = await signer.signOffer({ offer });

if (response.type === 'success') {
  const { transaction, agreement, internalTransactions } = response;
  
  // Publish the main transaction to the blockchain
  await publishTransaction(transaction);
  
  // Publish any internal transactions (e.g., for remote payments)
  for (const internalTx of internalTransactions) {
    await publishTransaction(internalTx.transaction);
  }
  
  console.log('Agreement created successfully!');
  console.log('Transaction ID:', transaction.id);
} else {
  console.error('Failed to sign offer at requirement:', response.failedRequirementId);
}
```

### Custom Requirement Resolvers

You can implement custom resolvers for specialized requirements:

```typescript
import { DaiaReferenceRequirementResolver } from '@d4ia/core';

// Create a custom reference resolver
const referenceMap = new Map();
referenceMap.set('license-agreement', {
  txId: 'previous-license-tx-id'
});

const referenceResolver = DefaultDaiaReferenceRequirementResolver
  .builder()
  .addReferences(referenceMap)
  .build();

const signer = new DefaultDaiaOfferSigner({
  transactionFactory,
  signResolver: new DefaultDaiaSignRequirementResolver(signeePrivateKey),
  paymentResolver: new DefaultDaiaPaymentRequirementResolver(transactionFactory),
  referenceResolver
});
```

## Step 3: Verifying an Agreement

After an agreement is created and published to the blockchain, you can verify its authenticity using the `DefaultDaiaAgreementVerifier`:

```typescript
import { DefaultDaiaAgreementVerifier } from '@d4ia/core';

const verifier = new DefaultDaiaAgreementVerifier(blockchainParser);
```

### Verifying by Transaction ID

The easiest way to verify is to provide the transaction ID:

```typescript
const result = await verifier.getAgreementFromTransaction(transactionId);

if (result.found) {
  const { agreement, verification } = result;
  
  if (verification.result === 'passed') {
    console.log('Agreement is valid!');
    
    // Check payment totals if applicable
    if (verification.totalAgreementPayments) {
      console.log('Total payments:', verification.totalAgreementPayments);
    }
  } else {
    console.error('Agreement verification failed:', verification.failure);
  }
} else {
  console.error('Agreement not found in transaction');
}
```

### Verifying an Existing Agreement Object

If you already have the agreement object, you can verify it directly:

```typescript
const result = await verifier.verifyAgreement({
  agreement,
  transactionData: {
    payments: transaction.outputs  // Payment outputs from the transaction
  }
});

if (result.result === 'passed') {
  console.log('Agreement verified successfully!');
} else {
  console.log('Verification failed:', result.failure.type);
  
  // Handle different failure types
  switch (result.failure.type) {
    case 'requirements-proofs-mismatch':
      console.error('Requirements and proofs do not match');
      break;
    case 'other':
      console.error('Verification error:', result.failure.message);
      break;
  }
}
```

## Complete Example: Parking Gate Access

Here's a complete example that creates an agreement for parking gate access:

```typescript
import {
  DaiaOfferBuilder,
  DefaultDaiaOfferSigner,
  DefaultDaiaSignRequirementResolver,
  DefaultDaiaPaymentRequirementResolver,
  DefaultDaiaAgreementVerifier
} from '@d4ia/core';
import { createTransactionFactory, createBlockchainParser } from '@d4ia/blockchain';

// Setup
const gateOwnerAddress = 'gate-owner-address';
const userPrivateKey = PrivateKey.fromString('user-private-key');
const userPublicKey = userPrivateKey.toPublicKey().toString();

const transactionFactory = createTransactionFactory(/* config */);
const blockchainParser = createBlockchainParser(/* config */);

// Step 1: Build the offer
const offer = DaiaOfferBuilder.new()
  .setOfferTypeIdentifier('PARKING-GATE-ACCESS')
  .setNaturalLanguageContent('24-hour parking gate access')
  .addSignRequirement(userPublicKey)
  .addSelfAuthenticatedPaymentRequirement(gateOwnerAddress, 5000)
  .build();

// Step 2: Sign the offer
const signer = new DefaultDaiaOfferSigner({
  transactionFactory,
  signResolver: new DefaultDaiaSignRequirementResolver(userPrivateKey),
  paymentResolver: new DefaultDaiaPaymentRequirementResolver(transactionFactory)
});

const signResponse = await signer.signOffer({ offer });

if (signResponse.type === 'success') {
  const { transaction, agreement } = signResponse;
  
  // Publish to blockchain
  await publishTransaction(transaction);
  const txId = transaction.id;
  
  console.log('Agreement created! Transaction ID:', txId);
  
  // Step 3: Verify the agreement
  const verifier = new DefaultDaiaAgreementVerifier(blockchainParser);
  const verifyResult = await verifier.getAgreementFromTransaction(txId);
  
  if (verifyResult.found && verifyResult.verification.result === 'passed') {
    console.log('Agreement verified successfully!');
    console.log('Total payments:', verifyResult.verification.totalAgreementPayments);
    
    // Grant access to the parking gate
    await grantParkingAccess(userPublicKey);
  }
} else {
  console.error('Failed to create agreement');
}
```

## Understanding Verification

The verification process checks:

1. **Requirement-Proof Matching** - Every requirement has a corresponding proof
2. **Signature Validity** - All signatures are cryptographically valid
3. **Payment Accuracy** - Payment amounts and recipients match requirements
4. **Reference Validity** - Referenced agreements exist and are valid
5. **Recursive Verification** - Referenced agreements are also verified

### Self-Authenticated vs Remote Payments

**Self-Authenticated Payments:**
- Included in the same transaction as the agreement
- More efficient (single transaction)
- Payment verification is straightforward

**Remote Payments:**
- Separate transaction with a payment nonce
- Useful for escrow or multi-step processes
- Requires tracking multiple transactions

## Error Handling

Always handle potential errors in the signing and verification process:

```typescript
try {
  const signResponse = await signer.signOffer({ offer });
  
  if (signResponse.type === 'success') {
    // Handle success
  } else {
    // Handle requirement failure
    console.error(`Requirement ${signResponse.failedRequirementId} could not be fulfilled`);
  }
} catch (error) {
  // Handle unexpected errors
  console.error('Error during signing:', error);
}

// Verification errors
const verifyResult = await verifier.verifyAgreement({ agreement, transactionData });

if (verifyResult.result === 'failed') {
  switch (verifyResult.failure.type) {
    case 'requirements-proofs-mismatch':
      // Handle mismatch between requirements and proofs
      break;
    case 'other':
      // Handle other verification failures
      console.error(verifyResult.failure.message);
      break;
  }
}
```

## Best Practices

1. **Validate Offers Before Signing** - Review the offer's natural language content and requirements
2. **Store Transaction IDs** - Keep records of transaction IDs for future verification
3. **Handle Failed Requirements** - Implement fallback logic when requirements cannot be fulfilled
4. **Use Appropriate Payment Types** - Choose self-authenticated for simple cases, remote for complex scenarios
5. **Verify Before Trusting** - Always verify agreements before taking action based on them
6. **Implement Timeout Mechanisms** - Set expiration times for offers to prevent stale agreements


- Blockchain transaction lifecycle and monitoring
